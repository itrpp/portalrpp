# LDAP Development Setup

## สำหรับ Development Mode (ไม่ใช้ Docker)

เมื่อคุณต้องการรัน auth service ในโหมด development โดยไม่ใช้ Docker แต่ยังต้องการใช้ LDAP server คุณสามารถทำได้ดังนี้:

### 1. เริ่มต้น LDAP Server

```bash
# เริ่มต้น LDAP server ใน Docker
./start-ldap-dev.sh
```

สคริปต์นี้จะ:

- ตรวจสอบว่า Docker ทำงานอยู่หรือไม่
- เริ่มต้น LDAP server ใน Docker container
- สร้าง test users ตามที่กำหนดไว้ใน `ldap-init.ldif`

### 2. เริ่มต้น Auth Service

```bash
# เริ่มต้น auth service ใน development mode
./start-auth-dev.sh
```

สคริปต์นี้จะ:

- ตรวจสอบว่า LDAP server ทำงานอยู่หรือไม่
- สร้างไฟล์ `.env` จาก `env.example` ถ้ายังไม่มี
- เริ่มต้น auth service ใน development mode

### 3. การตั้งค่า Environment Variables

ไฟล์ `backend/auth-service/.env` จะถูกสร้างขึ้นโดยอัตโนมัติด้วยการตั้งค่าที่ถูกต้อง:

```bash
# LDAP Configuration สำหรับ development
LDAP_URL=ldap://localhost:1389
LDAP_ADMIN_DN=cn=admin,dc=rpphosp,dc=local
LDAP_ADMIN_PASSWORD=admin
LDAP_USER_SEARCH_BASE=ou=users,dc=rpphosp,dc=local
LDAP_USERNAME_ATTRIBUTE=uid
```

### 4. Test Users

LDAP server จะมี test users ดังนี้:

| Username | Email                  | Password | Role |
| -------- | ---------------------- | -------- | ---- |
| testuser | testuser@rpphosp.local | password | user |
| john     | john@rpphosp.local     | password | user |
| admin    | admin@rpphosp.local    | admin123 | user |

### 5. การทดสอบ

#### ทดสอบการเข้าสู่ระบบด้วย LDAP:

```bash
# ทดสอบด้วย testuser
curl -X POST http://localhost:3002/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@rpphosp.local", "password": "password", "authType": "ldap"}'

# ทดสอบด้วย john
curl -X POST http://localhost:3002/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@rpphosp.local", "password": "password", "authType": "ldap"}'

# ทดสอบด้วย admin
curl -X POST http://localhost:3002/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@rpphosp.local", "password": "admin123", "authType": "ldap"}'
```

#### ทดสอบการเข้าสู่ระบบด้วย local users:

```bash
# ทดสอบด้วย local admin
curl -X POST http://localhost:3002/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@rpp.com", "password": "password", "authType": "local"}'
```

### 6. การตรวจสอบ LDAP Server

```bash
# ดู logs ของ LDAP server
docker-compose logs -f ldap-server

# ตรวจสอบ users ใน LDAP
docker exec -it portalrpp-ldap-server-1 ldapsearch -x -H ldap://localhost:389 \
  -D "cn=admin,dc=rpphosp,dc=local" -w admin \
  -b "ou=users,dc=rpphosp,dc=local" "(objectclass=*)"
```

### 7. การหยุดการทำงาน

```bash
# หยุด LDAP server
docker-compose down ldap-server

# หยุด auth service
# กด Ctrl+C ใน terminal ที่รัน auth service
```

### 8. Troubleshooting

#### ปัญหา: LDAP connection refused

- ตรวจสอบว่า Docker ทำงานอยู่หรือไม่
- ตรวจสอบว่า LDAP server ทำงานอยู่หรือไม่: `docker-compose ps ldap-server`
- ตรวจสอบ port 1389 ว่าถูกใช้งานหรือไม่: `lsof -i :1389`

#### ปัญหา: Invalid credentials

- ตรวจสอบว่า username/password ถูกต้องหรือไม่
- ตรวจสอบว่า user มีอยู่ใน LDAP หรือไม่ด้วยคำสั่ง ldapsearch

#### ปัญหา: Auth service ไม่เริ่มต้น

- ตรวจสอบว่าไฟล์ `.env` มีอยู่หรือไม่
- ตรวจสอบว่า dependencies ถูกติดตั้งแล้วหรือไม่: `npm install`
- ตรวจสอบ port 3002 ว่าถูกใช้งานหรือไม่: `lsof -i :3002`

## การใช้งานใน Production

สำหรับ production คุณควรใช้ LDAP server จริงและปรับแต่งการตั้งค่าใน environment variables ให้เหมาะสม:

```bash
# Production LDAP settings
LDAP_URL=ldap://your-ldap-server.com:389
LDAP_ADMIN_DN=cn=admin,dc=yourcompany,dc=com
LDAP_ADMIN_PASSWORD=your-secure-password
LDAP_USER_SEARCH_BASE=ou=users,dc=yourcompany,dc=com
```
