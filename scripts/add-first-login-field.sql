-- เพิ่ม field is_first_login ใน users table
ALTER TABLE users 
ADD COLUMN is_first_login BOOLEAN DEFAULT TRUE AFTER last_login_ip;

-- อัปเดตนิสิตที่มีอยู่แล้วให้เป็น first login
UPDATE users 
SET is_first_login = TRUE 
WHERE role = 'student' AND last_login_at IS NULL;

-- นิสิตที่เคย login แล้วให้เป็น false
UPDATE users 
SET is_first_login = FALSE 
WHERE role = 'student' AND last_login_at IS NOT NULL;
