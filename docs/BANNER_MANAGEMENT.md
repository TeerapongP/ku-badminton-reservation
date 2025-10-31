# ระบบจัดการ Banner

## ภาพรวม
ระบบจัดการ Banner ช่วยให้ admin และ super-admin สามารถจัดการ banner ที่แสดงบนหน้าแรกของเว็บไซต์ได้

## คุณสมบัติ

### สำหรับ Admin และ Super-Admin
- ✅ อัปโหลดรูปภาพ banner
- ✅ เพิ่ม/แก้ไข/ลบ banner
- ✅ เปิด/ปิดการแสดงผล banner
- ✅ จัดลำดับการแสดงผล
- ✅ เพิ่มชื่อและคำบรรยาย banner

### สำหรับผู้ใช้ทั่วไป
- ✅ ดู banner แบบ slideshow
- ✅ เปลี่ยน banner อัตโนมัติทุก 5 วินาที
- ✅ คลิกจุดเพื่อเปลี่ยน banner
- ✅ ใช้ลูกศรเพื่อเปลี่ยน banner

## โครงสร้างไฟล์

### API Routes
- `src/app/api/admin/banners/route.ts` - จัดการ CRUD banners
- `src/app/api/admin/banners/[id]/route.ts` - จัดการ banner เฉพาะ
- `src/app/api/admin/banners/upload/route.ts` - อัปโหลดรูปภาพ
- `src/app/api/banners/route.ts` - ดึงข้อมูล banner สำหรับแสดงผล

### Components
- `src/components/Banner.tsx` - แสดง banner บนหน้าแรก
- `src/container/admin/BannerManagementContainer.tsx` - หน้าจัดการ banner
- `src/app/(admin)/admin/banners/page.tsx` - หน้า admin สำหรับจัดการ banner

### Types
- `src/types/banner.ts` - TypeScript types สำหรับ banner

### Database
- `prisma/schema.prisma` - เพิ่ม banners model
- `prisma/migrations/add_banners_table.sql` - SQL สำหรับสร้าง table

## การใช้งาน

### สำหรับ Admin
1. เข้าสู่ระบบด้วยบัญชี admin หรือ super-admin
2. ไปที่ Admin Dashboard
3. คลิก "จัดการ Banner"
4. คลิก "เพิ่ม Banner" เพื่อสร้าง banner ใหม่
5. อัปโหลดรูปภาพ (JPG, PNG, WebP ไม่เกิน 10MB)
6. กรอกชื่อและคำบรรยาย
7. ตั้งค่าลำดับการแสดงผล
8. เลือกว่าจะแสดง banner หรือไม่
9. คลิก "บันทึก"

### การจัดการ Banner ที่มีอยู่
- **แก้ไข**: คลิกปุ่ม "แก้ไข" บน banner card
- **เปิด/ปิด**: คลิกปุ่ม "แสดง/ซ่อน" เพื่อเปิดปิดการแสดงผล
- **ลบ**: คลิกปุ่ม "ลบ" (จะมี confirmation dialog)

## ข้อกำหนดรูปภาพ
- **ประเภทไฟล์**: JPG, PNG, WebP
- **ขนาดไฟล์**: ไม่เกิน 10MB
- **ขนาดที่แนะนำ**: 1920x600 pixels (อัตราส่วน 16:5)
- **คุณภาพ**: ความละเอียดสูงสำหรับการแสดงผลที่คมชัด

## Database Schema

```sql
CREATE TABLE `banners` (
    `banner_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `subtitle` VARCHAR(500) NULL,
    `image_path` VARCHAR(500) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `display_order` INT UNSIGNED NOT NULL DEFAULT 1,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
    PRIMARY KEY (`banner_id`)
);
```

## API Endpoints

### GET /api/banners
ดึงรายการ banner ที่ active สำหรับแสดงผล
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Banner Title",
      "subtitle": "Banner Subtitle",
      "image_path": "/uploads/banners/banner_123.jpg",
      "display_order": 1
    }
  ]
}
```

### GET /api/admin/banners
ดึงรายการ banner ทั้งหมด (admin only)

### POST /api/admin/banners
สร้าง banner ใหม่ (admin only)

### PUT /api/admin/banners/[id]
อัปเดต banner (admin only)

### DELETE /api/admin/banners/[id]
ลบ banner (admin only)

### POST /api/admin/banners/upload
อัปโหลดรูปภาพ banner (admin only)

## การรักษาความปลอดภัย
- ✅ ตรวจสอบสิทธิ์ admin/super-admin
- ✅ ตรวจสอบประเภทไฟล์
- ✅ จำกัดขนาดไฟล์
- ✅ ป้องกัน path traversal
- ✅ Validation ข้อมูล input

## การทดสอบ
1. ทดสอบการอัปโหลดรูปภาพ
2. ทดสอบการสร้าง/แก้ไข/ลบ banner
3. ทดสอบการเปิด/ปิดการแสดงผล
4. ทดสอบการแสดงผล banner บนหน้าแรก
5. ทดสอบ slideshow และ navigation

## การแก้ไขปัญหา

### Banner ไม่แสดงบนหน้าแรก
1. ตรวจสอบว่า banner ถูกตั้งเป็น "แสดง"
2. ตรวจสอบว่ารูปภาพอัปโหลดสำเร็จ
3. ตรวจสอบ console ใน browser สำหรับ error

### ไม่สามารถอัปโหลดรูปภาพได้
1. ตรวจสอบขนาดไฟล์ (ไม่เกิน 10MB)
2. ตรวจสอบประเภทไฟล์ (JPG, PNG, WebP)
3. ตรวจสอบสิทธิ์การเขียนไฟล์ในโฟลเดอร์ uploads

### ไม่มีสิทธิ์เข้าถึง
1. ตรวจสอบว่าเข้าสู่ระบบด้วยบัญชี admin หรือ super-admin
2. ตรวจสอบ session และ authentication