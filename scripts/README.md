# Scripts สำหรับ Migration ข้อมูล

## 📋 migrate-students.js

Script สำหรับ migrate ข้อมูลนิสิตจากไฟล์ Excel เข้าสู่ระบบ

### ติดตั้ง Dependencies

```bash
npm install xlsx
# หรือ
pnpm add xlsx
```

### โครงสร้างไฟล์ Excel ที่รองรับ

ไฟล์ Excel ควรมี columns ดังนี้ (รองรับทั้งภาษาไทยและอังกฤษ):

| Column (TH) | Column (EN) | Required | Description |
|-------------|-------------|----------|-------------|
| รหัสนิสิต | Student ID |  | รหัสนิสิต 8-10 หลัก |
| คำนำหน้า | Title | ❌ | นาย, นาง, นางสาว |
| ชื่อ | First Name |  | ชื่อจริง |
| นามสกุล | Last Name |  | นามสกุล |
| คณะ | Faculty | ❌ | ชื่อคณะ |
| สาขา | Department | ❌ | ชื่อสาขาวิชา |
| ชั้นปี | Year | ❌ | ชั้นปี |

### วิธีใช้งาน

1. **วางไฟล์ Excel ใน folder scripts/**
   ```
   scripts/
   ├── Std_R01_01 (12).xlsx
   ├── Std_R01_01 (13).xlsx
   └── migrate-students.js
   ```

2. **แก้ไขรายชื่อไฟล์ใน script** (ถ้าต้องการ)
   ```javascript
   const excelFiles = [
       'Std_R01_01 (12).xlsx',
       'Std_R01_01 (13).xlsx',
       // เพิ่มไฟล์อื่นๆ ตามต้องการ
   ];
   ```

3. **รัน script**
   ```bash
   npm run migrate-students
   # หรือ
   pnpm migrate-students
   # หรือ
   node scripts/migrate-students.js
   ```

### ผลลัพธ์

Script จะแสดงผลดังนี้:

```
🚀 เริ่มต้น Migration ข้อมูลนิสิต

📁 กำลังประมวลผลไฟล์: Std_R01_01 (12).xlsx
────────────────────────────────────────────────────────────
📖 อ่านข้อมูลจากไฟล์: Std_R01_01 (12).xlsx
📊 พบข้อมูล 150 รายการ
📋 Columns: รหัสนิสิต, คำนำหน้า, ชื่อ, นามสกุล, คณะ, สาขา

 สร้างนิสิต 65123456 - สมชาย ใจดี
 สร้างนิสิต 65123457 - สมหญิง รักเรียน
⚠️  นิสิต 65123458 มีอยู่ในระบบแล้ว

============================================================
📊 สรุปผลการ Migration
============================================================
 สร้างผู้ใช้ใหม่: 148 คน
⚠️  ข้ามผู้ใช้ที่มีอยู่แล้ว: 2 คน
📝 ประมวลผลทั้งหมด: 150 รายการ
============================================================

💡 หมายเหตุ: รหัสผ่านเริ่มต้นคือรหัสนิสิต
```

### ข้อมูลที่สร้างในระบบ

สำหรับแต่ละนิสิต script จะสร้าง:

- **Username**: รหัสนิสิต
- **Password**: รหัสนิสิต (เข้ารหัสด้วย bcrypt)
- **Role**: student
- **Email**: {รหัสนิสิต}@ku.th
- **Status**: active
- **Membership**: member

### การตรวจสอบข้อมูล

หลังจาก migrate เสร็จ สามารถตรวจสอบได้ที่:

1. **Database**
   ```sql
   SELECT * FROM users WHERE role = 'student' ORDER BY registered_at DESC;
   ```

2. **Admin Dashboard**
   - เข้าสู่ระบบด้วย superAdmin
   - ไปที่ User Management
   - กรอง role = student

### หมายเหตุ

- ⚠️ Script จะข้ามนิสิตที่มีรหัสนิสิตซ้ำในระบบ
- 🔒 รหัสผ่านเริ่มต้นคือรหัสนิสิต (ควรให้นิสิตเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบครั้งแรก)
- 📧 Email เริ่มต้นเป็น {รหัสนิสิต}@ku.th (ควรให้นิสิตอัปเดต email จริง)
- 🔄 สามารถรัน script ซ้ำได้โดยไม่กระทบข้อมูลเดิม

### Troubleshooting

**ปัญหา: Cannot find module 'xlsx'**
```bash
npm install xlsx
```

**ปัญหา: Cannot find module '@prisma/client'**
```bash
npx prisma generate
```

**ปัญหา: ไม่พบไฟล์ Excel**
- ตรวจสอบว่าไฟล์อยู่ใน folder scripts/
- ตรวจสอบชื่อไฟล์ว่าถูกต้อง

**ปัญหา: Column names ไม่ตรงกัน**
- ดู log ที่แสดง "📋 Columns:" เพื่อดู column names ที่พบ
- แก้ไข mapping ใน script ตามชื่อ column ที่แท้จริง
