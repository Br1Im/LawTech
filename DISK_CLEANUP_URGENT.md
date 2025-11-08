# 🚨 СРОЧНО: Очистка диска на сервере

## Проблема
На сервере закончилось место: `[Errno 28] No space left on device`

## Решение - выполнить на сервере по SSH

### 1. Подключиться к серверу
```bash
ssh root@law-tech.online
```

### 2. Проверить использование диска
```bash
df -h
du -sh /* | sort -h
```

### 3. Остановить все контейнеры
```bash
cd ~/LawTech
docker-compose down -v
docker stop $(docker ps -aq)
```

### 4. Удалить ВСЕ Docker данные
```bash
# Удалить все контейнеры
docker rm -f $(docker ps -aq)

# Удалить все образы
docker rmi -f $(docker images -q)

# Удалить все volumes
docker volume rm $(docker volume ls -q)

# Полная очистка системы
docker system prune -af --volumes

# Очистка build cache
docker builder prune -af
```

### 5. Очистить логи Docker
```bash
# Очистить логи контейнеров
truncate -s 0 /var/lib/docker/containers/*/*-json.log

# Или удалить старые логи
find /var/lib/docker/containers/ -type f -name "*.log" -delete
```

### 6. Очистить системные логи
```bash
journalctl --vacuum-time=1d
apt-get clean
apt-get autoclean
apt-get autoremove -y
```

### 7. Найти большие файлы
```bash
find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null | head -20
```

### 8. Проверить результат
```bash
df -h
```

### 9. Запустить деплой заново
```bash
cd ~/LawTech
git pull origin main
docker-compose up -d --build
```

## Если места всё ещё мало

### Увеличить размер диска на хостинге
Обратитесь к провайдеру хостинга для увеличения размера диска

### Или настроить ротацию логов
```bash
# Создать конфиг для ротации логов Docker
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Перезапустить Docker
systemctl restart docker
```
