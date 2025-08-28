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

# Простой health check для Render
@app.get("/")
async def root():
    return {"message": "LawTech API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

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

class OfficeCreate(BaseModel):
    name: str
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    work_phone2: Optional[str] = None
    website: Optional[str] = None

class OfficeUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    work_phone2: Optional[str] = None
    website: Optional[str] = None

class OfficeResponse(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    contact_phone: Optional[str] = None
    work_phone2: Optional[str] = None
    website: Optional[str] = None
    employee_count: int = 0
    revenue: int = 0
    orders: int = 0
    online: bool = False
    last_activity: Optional[str] = None

# Функция для получения пути к базе данных
def get_db_path():
    return '/tmp/lawtech.db' if os.getenv('RENDER') else 'lawtech.db'

# Инициализация базы данных
def init_db():
    db_path = get_db_path()
    print(f"Database path: {db_path}")
    conn = sqlite3.connect(db_path)
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
            address TEXT,
            contact_phone TEXT,
            work_phone2 TEXT,
            website TEXT,
            revenue INTEGER DEFAULT 0,
            orders INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ База данных инициализирована")

# Инициализируем БД при запуске
init_db()

# Утилиты для работы с БД
def get_db_connection():
    conn = sqlite3.connect(get_db_path())
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

# API роуты для офисов
@app.get("/api/offices", response_model=List[OfficeResponse])
async def get_offices(current_user: dict = Depends(get_current_user)):
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT o.*, COUNT(u.id) as employee_count
            FROM offices o
            LEFT JOIN users u ON u.office_id = o.id
            GROUP BY o.id
            ORDER BY o.name
        """)
        
        offices = cursor.fetchall()
        
        return [
            OfficeResponse(
                id=office['id'],
                name=office['name'],
                address=office['address'],
                contact_phone=office['contact_phone'],
                work_phone2=office['work_phone2'],
                website=office['website'],
                employee_count=office['employee_count'],
                revenue=office['revenue'] or 0,
                orders=office['orders'] or 0,
                online=False,
                last_activity=None
            )
            for office in offices
        ]
        
    finally:
        conn.close()

@app.get("/api/offices/{office_id}", response_model=OfficeResponse)
async def get_office(office_id: int, current_user: dict = Depends(get_current_user)):
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT o.*, COUNT(u.id) as employee_count
            FROM offices o
            LEFT JOIN users u ON u.office_id = o.id
            WHERE o.id = ?
            GROUP BY o.id
        """, (office_id,))
        
        office = cursor.fetchone()
        
        if not office:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Офис не найден"
            )
        
        return OfficeResponse(
            id=office['id'],
            name=office['name'],
            address=office['address'],
            contact_phone=office['contact_phone'],
            work_phone2=office['work_phone2'],
            website=office['website'],
            employee_count=office['employee_count'],
            revenue=office['revenue'] or 0,
            orders=office['orders'] or 0,
            online=False,
            last_activity=None
        )
        
    finally:
        conn.close()

@app.post("/api/offices", response_model=OfficeResponse)
async def create_office(office_data: OfficeCreate, current_user: dict = Depends(get_current_user)):
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO offices (name, address, contact_phone, work_phone2, website, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (
            office_data.name,
            office_data.address,
            office_data.contact_phone,
            office_data.work_phone2,
            office_data.website
        ))
        
        office_id = cursor.lastrowid
        conn.commit()
        
        # Получаем созданный офис
        cursor.execute("""
            SELECT o.*, 0 as employee_count
            FROM offices o
            WHERE o.id = ?
        """, (office_id,))
        
        office = cursor.fetchone()
        
        return OfficeResponse(
            id=office['id'],
            name=office['name'],
            address=office['address'],
            contact_phone=office['contact_phone'],
            work_phone2=office['work_phone2'],
            website=office['website'],
            employee_count=0,
            revenue=office['revenue'] or 0,
            orders=office['orders'] or 0,
            online=False,
            last_activity=None
        )
        
    finally:
        conn.close()

@app.put("/api/offices/{office_id}", response_model=OfficeResponse)
async def update_office(office_id: int, office_data: OfficeUpdate, current_user: dict = Depends(get_current_user)):
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    
    try:
        cursor = conn.cursor()
        
        # Проверяем существование офиса
        cursor.execute("SELECT id FROM offices WHERE id = ?", (office_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Офис не найден"
            )
        
        # Обновляем офис
        update_fields = []
        update_values = []
        
        if office_data.name is not None:
            update_fields.append("name = ?")
            update_values.append(office_data.name)
        
        if office_data.address is not None:
            update_fields.append("address = ?")
            update_values.append(office_data.address)
        
        if office_data.contact_phone is not None:
            update_fields.append("contact_phone = ?")
            update_values.append(office_data.contact_phone)
        
        if office_data.work_phone2 is not None:
            update_fields.append("work_phone2 = ?")
            update_values.append(office_data.work_phone2)
        
        if office_data.website is not None:
            update_fields.append("website = ?")
            update_values.append(office_data.website)
        
        if update_fields:
            update_fields.append("updated_at = datetime('now')")
            update_values.append(office_id)
            
            cursor.execute(f"""
                UPDATE offices 
                SET {', '.join(update_fields)}
                WHERE id = ?
            """, update_values)
            
            conn.commit()
        
        # Получаем обновленный офис
        cursor.execute("""
            SELECT o.*, COUNT(u.id) as employee_count
            FROM offices o
            LEFT JOIN users u ON u.office_id = o.id
            WHERE o.id = ?
            GROUP BY o.id
        """, (office_id,))
        
        office = cursor.fetchone()
        
        return OfficeResponse(
            id=office['id'],
            name=office['name'],
            address=office['address'],
            contact_phone=office['contact_phone'],
            work_phone2=office['work_phone2'],
            website=office['website'],
            employee_count=office['employee_count'],
            revenue=office['revenue'] or 0,
            orders=office['orders'] or 0,
            online=False,
            last_activity=None
        )
        
    finally:
        conn.close()

@app.delete("/api/offices/{office_id}")
async def delete_office(office_id: int, current_user: dict = Depends(get_current_user)):
    conn = sqlite3.connect('database.db')
    
    try:
        cursor = conn.cursor()
        
        # Проверяем существование офиса
        cursor.execute("SELECT id FROM offices WHERE id = ?", (office_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Офис не найден"
            )
        
        # Удаляем офис
        cursor.execute("DELETE FROM offices WHERE id = ?", (office_id,))
        conn.commit()
        
        return {"message": "Офис успешно удален"}
        
    finally:
        conn.close()

# SPA обработка удалена - фронтенд развертывается отдельно на Render

# Инициализируем базу данных при запуске
print("Initializing database...")
init_db()
print("Database initialized successfully")
print(f"Server starting on port {PORT}")
print(f"JWT_SECRET configured: {'Yes' if JWT_SECRET else 'No'}")
print(f"UPLOADS_DIR: {UPLOADS_DIR.absolute()}")
print("FastAPI app ready for requests")

# Для локальной разработки
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)