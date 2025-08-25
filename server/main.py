from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import jwt
import bcrypt
import sqlite3
import os
from datetime import datetime, timedelta
import uvicorn
from pathlib import Path

# Создаем экземпляр FastAPI
app = FastAPI(title="LawTech API", version="1.0.0")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000", 
        "https://lawtech-p225.onrender.com",
        "*"  # Для разработки, в продакшене лучше указать конкретные домены
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Конфигурация
JWT_SECRET = os.getenv("JWT_SECRET", "law-tech-secret-key")
PORT = int(os.getenv("PORT", 3001))
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

# Создаем директорию для статических файлов
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Схемы Pydantic
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    userType: str
    officeType: Optional[str] = None
    officeId: Optional[int] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    office_id: Optional[int] = None

class TokenResponse(BaseModel):
    message: str
    token: str
    user: UserResponse

class HealthResponse(BaseModel):
    status: str
    timestamp: str

# Инициализация базы данных
def init_db():
    conn = sqlite3.connect('lawtech.db')
    cursor = conn.cursor()
    
    # Создаем таблицу пользователей если её нет
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            office_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Создаем таблицу офисов если её нет
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS offices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ База данных инициализирована")

# Инициализируем БД при запуске
init_db()

# Утилиты для работы с БД
def get_db_connection():
    conn = sqlite3.connect('lawtech.db')
    conn.row_factory = sqlite3.Row
    return conn

# Утилиты для аутентификации
security = HTTPBearer()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id: int = payload.get("id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Эндпоинты
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="OK",
        timestamp=datetime.now().isoformat()
    )

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Проверяем, существует ли пользователь
        cursor.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Пользователь с таким email уже существует"
            )
        
        # Хешируем пароль
        hashed_password = hash_password(user_data.password)
        
        # Определяем office_id
        final_office_id = None
        if user_data.userType == "office" and user_data.officeType == "existing" and user_data.officeId:
            final_office_id = user_data.officeId
        
        # Создаем пользователя
        cursor.execute(
            "INSERT INTO users (username, email, password, role, office_id) VALUES (?, ?, ?, ?, ?)",
            (user_data.name, user_data.email, hashed_password, user_data.userType, final_office_id)
        )
        
        user_id = cursor.lastrowid
        conn.commit()
        
        # Создаем токен
        token = create_access_token({
            "id": user_id,
            "email": user_data.email,
            "role": user_data.userType
        })
        
        # Возвращаем ответ
        user_response = UserResponse(
            id=user_id,
            username=user_data.name,
            email=user_data.email,
            role=user_data.userType,
            office_id=final_office_id
        )
        
        return TokenResponse(
            message="Пользователь успешно зарегистрирован",
            token=token,
            user=user_response
        )
        
    except Exception as e:
        conn.rollback()
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Пользователь с таким email уже существует"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера"
        )
    finally:
        conn.close()

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Ищем пользователя
        cursor.execute(
            "SELECT id, username, email, password, role, office_id FROM users WHERE email = ? OR username = ?",
            (user_data.email, user_data.email)
        )
        user = cursor.fetchone()
        
        if not user or not verify_password(user_data.password, user['password']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный email или пароль"
            )
        
        # Создаем токен
        token = create_access_token({
            "id": user['id'],
            "email": user['email'],
            "role": user['role']
        })
        
        # Возвращаем ответ
        user_response = UserResponse(
            id=user['id'],
            username=user['username'],
            email=user['email'],
            role=user['role'],
            office_id=user['office_id']
        )
        
        return TokenResponse(
            message="Успешная авторизация",
            token=token,
            user=user_response
        )
        
    finally:
        conn.close()

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user(user_id: int = Depends(verify_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT id, username, email, role, office_id FROM users WHERE id = ?",
            (user_id,)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        return UserResponse(
            id=user['id'],
            username=user['username'],
            email=user['email'],
            role=user['role'],
            office_id=user['office_id']
        )
        
    finally:
        conn.close()

# Обработка статических файлов для SPA
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Если это API запрос, возвращаем 404
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Для всех остальных запросов возвращаем index.html (SPA)
    frontend_path = Path("../frontend/dist")
    index_file = frontend_path / "index.html"
    
    if index_file.exists():
        return FileResponse(index_file)
    else:
        raise HTTPException(status_code=404, detail="Frontend not found")

# Инициализируем базу данных при запуске
init_db()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)