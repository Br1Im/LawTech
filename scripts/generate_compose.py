#!/usr/bin/env python3
import os

content = """version: '3.8'

services:
  db:
    image: mysql:8.0
    container_name: lawtech-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
      - ./server/database/migrations:/docker-entrypoint-initdb.d
    networks:
      - lawtech-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

  faiss-service:
    build:
      context: ./server/scripts
      dockerfile: Dockerfile
    container_name: lawtech-faiss
    restart: unless-stopped
    environment:
      PYTHONUNBUFFERED: "1"
      PORT: "5000"
    networks:
      - lawtech-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: lawtech-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: "3001"
      FAISS_SERVICE_URL: http://faiss-service:5000
      DB_HOST: db
      DB_PORT: "3306"
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 7d
      CORS_ORIGIN: "*"
      UPLOAD_DIR: /app/uploads
      MAX_FILE_SIZE: "10485760"
    depends_on:
      db:
        condition: service_healthy
      faiss-service:
        condition: service_started
    networks:
      - lawtech-network
    volumes:
      - ./server/uploads:/app/uploads
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.25'

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: lawtech-frontend
    restart: unless-stopped
    ports:
      - "8080:80"
    depends_on:
      - backend
    networks:
      - lawtech-network
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'

volumes:
  mysql-data:
    driver: local

networks:
  lawtech-network:
    driver: bridge
"""

with open('/var/www/lawtech/docker-compose.prod.yml', 'w', newline='\n') as f:
    f.write(content)
print('docker-compose.prod.yml generated successfully')
