#!/bin/bash
cd /var/www/lawtech

DB_ROOT_PASSWORD=$(openssl rand -base64 24)
DB_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 32)

cat > .env.production << ENVEOF
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
DB_USER=lawtech_user
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=lawtech_crm
JWT_SECRET=${JWT_SECRET}
ENVEOF

echo "=== .env.production created ==="
cat .env.production

echo ""
echo "=== Starting docker compose ==="
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo ""
echo "=== Waiting 15 seconds for containers to start ==="
sleep 15

echo ""
echo "=== Container status ==="
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== Backend logs ==="
docker compose -f docker-compose.prod.yml logs --tail=20 backend

echo ""
echo "=== API health check ==="
curl -s http://localhost:3001/api/health || echo "API not ready yet, wait 30s and check: curl http://localhost:3001/api/health"
