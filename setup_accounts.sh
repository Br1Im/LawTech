#!/bin/bash
# Setup script: Create director, 2 offices, and all role accounts
API="http://127.0.0.1:3001/api"

echo "=== Step 1: Register General Director ==="
DIRECTOR_RESP=$(curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Директор Тест",
    "email": "gendirector@lawtech.test",
    "password": "test123",
    "userType": "office"
  }')
echo "$DIRECTOR_RESP"
DIRECTOR_TOKEN=$(echo "$DIRECTOR_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
echo "Director token: ${DIRECTOR_TOKEN:0:20}..."

if [ -z "$DIRECTOR_TOKEN" ]; then
  echo "Trying login instead..."
  DIRECTOR_RESP=$(curl -s -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"login": "gendirector@lawtech.test", "password": "test123"}')
  echo "$DIRECTOR_RESP"
  DIRECTOR_TOKEN=$(echo "$DIRECTOR_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
  echo "Director token (login): ${DIRECTOR_TOKEN:0:20}..."
fi

echo ""
echo "=== Step 2: Create Office 1 - Moscow ==="
OFFICE1_RESP=$(curl -s -X POST "$API/offices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -d '{
    "name": "LawTech Москва",
    "address": "г. Москва, ул. Тверская, д. 15",
    "contact_phone": "+7 (495) 123-45-67",
    "work_phone": "+7 (495) 123-45-68"
  }')
echo "$OFFICE1_RESP"
OFFICE1_ID=$(echo "$OFFICE1_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or d.get('data',{}).get('id',''))" 2>/dev/null)
echo "Office 1 ID: $OFFICE1_ID"

echo ""
echo "=== Step 3: Create Office 2 - Saint Petersburg ==="
OFFICE2_RESP=$(curl -s -X POST "$API/offices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -d '{
    "name": "LawTech Санкт-Петербург",
    "address": "г. Санкт-Петербург, Невский пр., д. 28",
    "contact_phone": "+7 (812) 987-65-43",
    "work_phone": "+7 (812) 987-65-44"
  }')
echo "$OFFICE2_RESP"
OFFICE2_ID=$(echo "$OFFICE2_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or d.get('data',{}).get('id',''))" 2>/dev/null)
echo "Office 2 ID: $OFFICE2_ID"

echo ""
echo "=== Step 4: Create employees for Office 1 (Moscow) ==="

# Director creates: manager, okk, cc_manager, expert
create_staff() {
  local token="$1"
  local first="$2"
  local last="$3"
  local phone="$4"
  local role="$5"
  local office="$6"
  
  RESP=$(curl -s -X POST "$API/staff" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -H "X-Office-Id: $office" \
    -d "{
      \"first_name\": \"$first\",
      \"last_name\": \"$last\",
      \"phone\": \"$phone\",
      \"role\": \"$role\",
      \"office_id\": $office
    }")
  echo "$RESP"
  
  # Extract login
  LOGIN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('login') or d.get('data',{}).get('login',''))" 2>/dev/null)
  ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id') or d.get('employee',{}).get('id') or d.get('data',{}).get('id',''))" 2>/dev/null)
  echo "  -> login=$LOGIN, id=$ID"
}

echo "--- Office 1: Manager ---"
create_staff "$DIRECTOR_TOKEN" "Алексей" "Волков" "+79001111001" "manager" "$OFFICE1_ID"
MANAGER1_LOGIN="$LOGIN"
MANAGER1_ID="$ID"

echo "--- Office 1: OKK ---"
create_staff "$DIRECTOR_TOKEN" "Мария" "Козлова" "+79001111002" "okk" "$OFFICE1_ID"
OKK1_LOGIN="$LOGIN"

echo "--- Office 1: CC Manager ---"
create_staff "$DIRECTOR_TOKEN" "Дмитрий" "Соколов" "+79001111003" "cc_manager" "$OFFICE1_ID"
CC_MANAGER1_LOGIN="$LOGIN"
CC_MANAGER1_ID="$ID"

echo "--- Office 1: Expert ---"
create_staff "$DIRECTOR_TOKEN" "Елена" "Новикова" "+79001111004" "expert" "$OFFICE1_ID"

echo ""
echo "=== Step 5: Login as Manager 1 to create lawyer, representative, admin ==="
# First reset password to test123 via DB
echo "Setting password for manager..."

echo ""
echo "=== Step 6: Create employees for Office 2 (SPb) ==="

echo "--- Office 2: Manager ---"
create_staff "$DIRECTOR_TOKEN" "Сергей" "Лебедев" "+79002222001" "manager" "$OFFICE2_ID"
MANAGER2_LOGIN="$LOGIN"
MANAGER2_ID="$ID"

echo "--- Office 2: OKK ---"
create_staff "$DIRECTOR_TOKEN" "Анна" "Морозова" "+79002222002" "okk" "$OFFICE2_ID"
OKK2_LOGIN="$LOGIN"

echo "--- Office 2: CC Manager ---"
create_staff "$DIRECTOR_TOKEN" "Павел" "Федоров" "+79002222003" "cc_manager" "$OFFICE2_ID"
CC_MANAGER2_LOGIN="$LOGIN"
CC_MANAGER2_ID="$ID"

echo "--- Office 2: Expert ---"
create_staff "$DIRECTOR_TOKEN" "Ольга" "Кузнецова" "+79002222004" "expert" "$OFFICE2_ID"

echo ""
echo "=== DONE creating director-level staff ==="
echo "Manager1 login: $MANAGER1_LOGIN (id=$MANAGER1_ID)"
echo "Manager2 login: $MANAGER2_LOGIN (id=$MANAGER2_ID)"
echo "CC_Manager1 login: $CC_MANAGER1_LOGIN (id=$CC_MANAGER1_ID)"
echo "CC_Manager2 login: $CC_MANAGER2_LOGIN (id=$CC_MANAGER2_ID)"
echo "Office1 ID: $OFFICE1_ID"
echo "Office2 ID: $OFFICE2_ID"
