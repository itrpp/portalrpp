# LDAP Provider Setup Guide

คู่มือการตั้งค่า LDAP Provider สำหรับ RPP Portal Authentication System

## 🚀 Features

ระบบ authentication ปัจจุบันรองรับ:

- **Local Authentication** - บัญชีท้องถิ่นในฐานข้อมูล
- **LDAP Authentication** - เข้าสู่ระบบผ่าน LDAP Server
- **Auto Authentication** - ลอง LDAP ก่อน หากไม่สำเร็จจะลองบัญชีท้องถิ่น

## 📋 LDAP Configuration

### Environment Variables

เพิ่มค่าต่อไปนี้ในไฟล์ `.env` ของ auth-service:

```env
# LDAP Configuration
LDAP_URL=ldap://localhost:389
LDAP_ADMIN_DN=cn=admin,dc=example,dc=com
LDAP_ADMIN_PASSWORD=admin
LDAP_USER_SEARCH_BASE=ou=users,dc=example,dc=com
LDAP_USERNAME_ATTRIBUTE=uid
LDAP_USERNAME=testuser
LDAP_USER_PASSWORD=password

# Optional LDAP Group Configuration
# LDAP_GROUPS_SEARCH_BASE=ou=groups,dc=example,dc=com
# LDAP_GROUP_CLASS=groupOfUniqueNames
# LDAP_GROUP_MEMBER_ATTRIBUTE=uniqueMember
```

### LDAP Server Configuration Examples

#### OpenLDAP

```env
LDAP_URL=ldap://ldap.example.com:389
LDAP_ADMIN_DN=cn=admin,dc=example,dc=com
LDAP_ADMIN_PASSWORD=admin_password
LDAP_USER_SEARCH_BASE=ou=people,dc=example,dc=com
LDAP_USERNAME_ATTRIBUTE=uid
```

#### Active Directory

```env
LDAP_URL=ldap://ad.example.com:389
LDAP_ADMIN_DN=cn=ldap_user,ou=users,dc=example,dc=com
LDAP_ADMIN_PASSWORD=ldap_password
LDAP_USER_SEARCH_BASE=ou=users,dc=example,dc=com
LDAP_USERNAME_ATTRIBUTE=sAMAccountName
```

#### LDAPS (Secure LDAP)

```env
LDAP_URL=ldaps://ldap.example.com:636
# เพิ่ม TLS options ในกรณีที่ต้องการ
```

## 🔧 การใช้งาน

### 1. Authentication Types

#### Auto Login (แนะนำ)

- ระบบจะลองเข้าสู่ระบบผ่าน LDAP ก่อน
- หากไม่สำเร็จจะลองบัญชีท้องถิ่น
- เหมาะสำหรับองค์กรที่มีทั้งบัญชี LDAP และบัญชีท้องถิ่น

#### Local Only

- เข้าสู่ระบบด้วยบัญชีท้องถิ่นเท่านั้น
- ใช้ email/password

#### LDAP Only

- เข้าสู่ระบบด้วย LDAP Server เท่านั้น
- ใช้ username/password

### 2. API Endpoints

#### Login with Auto Detection

```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "authType": "auto"
}
```

#### Login with LDAP Only

```bash
POST /api/auth/ldap
{
  "username": "testuser",
  "password": "password"
}
```

#### Login with Local Only

```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "authType": "local"
}
```

### 3. NextAuth Providers

ระบบรองรับ 3 providers:

1. **credentials** - บัญชีท้องถิ่น
2. **ldap** - LDAP authentication
3. **auto** - Auto detection

## 🧪 การทดสอบ

### ทดสอบ LDAP Connection

```bash
# ทดสอบการเชื่อมต่อ LDAP
curl -X POST http://localhost:3002/ldap \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password"}'
```

### ทดสอบ Auto Login

```bash
# ทดสอบ Auto login
curl -X POST http://localhost:3002/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser", "password": "password", "authType": "auto"}'
```

## 🔒 Security Considerations

### LDAP Security

- ใช้ LDAPS (LDAP over SSL/TLS) สำหรับ production
- ตั้งค่า certificate validation
- ใช้ dedicated LDAP service account
- จำกัดสิทธิ์ของ LDAP service account

### Environment Variables

```env
# สำหรับ LDAPS
LDAP_URL=ldaps://ldap.example.com:636
# เพิ่ม TLS options
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. LDAP Connection Failed

```
Error: LDAP Authentication error: connect ECONNREFUSED
```

**Solution:**

- ตรวจสอบ LDAP_URL
- ตรวจสอบ network connectivity
- ตรวจสอบ firewall

#### 2. Invalid Credentials

```
Error: Invalid LDAP credentials
```

**Solution:**

- ตรวจสอบ username/password
- ตรวจสอบ LDAP_USER_SEARCH_BASE
- ตรวจสอบ LDAP_USERNAME_ATTRIBUTE

#### 3. Admin DN Issues

```
Error: LDAP bind failed
```

**Solution:**

- ตรวจสอบ LDAP_ADMIN_DN
- ตรวจสอบ LDAP_ADMIN_PASSWORD
- ตรวจสอบสิทธิ์ของ admin account

### Debug Mode

เปิด debug mode โดยเพิ่ม:

```env
NODE_ENV=development
```

## 📚 LDAP Schema Mapping

ระบบจะแมป LDAP attributes ดังนี้:

| RPP Portal | LDAP Attribute | Active Directory |
| ---------- | -------------- | ---------------- |
| id         | uid            | sAMAccountName   |
| email      | mail           | mail             |
| name       | displayName    | displayName      |
| role       | memberOf       | memberOf         |

### Custom Mapping

สามารถปรับแต่งการแมปได้ในไฟล์ `backend/auth-service/src/index.ts`:

```typescript
// Map LDAP user to our user format
return {
  id: user.uid || user.sAMAccountName || username,
  email: user.mail || user.email || `${username}@ldap.local`,
  name: user.displayName || user.cn || user.name || username,
  role: user.memberOf?.includes("admin") ? "admin" : "user",
  ldapUser: true,
};
```

## 🔄 Migration from Local to LDAP

### Step 1: Setup LDAP

1. ติดตั้งและกำหนดค่า LDAP Server
2. เพิ่ม environment variables
3. ทดสอบการเชื่อมต่อ

### Step 2: Test Authentication

1. ทดสอบ LDAP authentication
2. ทดสอบ Auto authentication
3. ตรวจสอบ user mapping

### Step 3: Migrate Users

1. ใช้ Auto authentication mode
2. ผู้ใช้สามารถเข้าสู่ระบบได้ทั้งสองแบบ
3. ค่อยๆ migrate ไปใช้ LDAP เท่านั้น

## 📞 Support

หากมีปัญหาในการตั้งค่า LDAP:

1. ตรวจสอบ logs ใน auth-service
2. ทดสอบ LDAP connection ด้วย LDAP client tools
3. ตรวจสอบ network และ firewall settings
