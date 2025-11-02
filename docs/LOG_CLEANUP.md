# Auto Log Cleanup System

ระบบล้าง logs อัตโนมัติที่จะทำงานทุกวันเวลา 02:00 น. เพื่อล้าง logs เก่าที่เก็บไว้เกิน 90 วัน

## การทำงาน

### Tables ที่จะถูกล้าง
- `api_logs` - API request logs (เก็บ 90 วัน)
- `auth_log` - Authentication logs (เก็บ 90 วัน)  
- `daily_reset_log` - Daily reset job logs (เก็บ 120 วัน)

### กำหนดการ
- **เวลา**: ทุกวันเวลา 02:00 น.
- **Retention**: 90 วัน (ปรับได้ผ่าน environment variable)
- **Container**: `log-cleanup-cron`

## การตั้งค่า

### Environment Variables
```bash
LOG_RETENTION_DAYS=90  # จำนวนวันที่เก็บ logs (default: 90)
```

### Docker Compose
```yaml
log-cleanup:
  build:
    context: .
    dockerfile: docker/cron/Dockerfile.cron
  container_name: log-cleanup-cron
  restart: unless-stopped
  environment:
    - LOG_RETENTION_DAYS=90
```

## การรันด้วยตนเอง

### ใน Docker Container
```bash
# เข้าไปใน container
docker exec -it log-cleanup-cron sh

# รัน cleanup ทันที
node scripts/cleanup-logs.js 90
```

### ใน Development
```bash
# รัน cleanup script
npm run cleanup-logs

# หรือระบุจำนวนวัน
node scripts/cleanup-logs.js 30
```

## การตรวจสอบ

### ดู Cron Logs
```bash
# ดู logs ของ cron job
docker exec log-cleanup-cron tail -f /var/log/cron.log
```

### ตรวจสอบผลการทำงาน
ผลการทำงานจะถูกบันทึกใน `daily_reset_log` table:
```sql
SELECT * FROM daily_reset_log 
WHERE job_name IN ('automated_log_cleanup', 'log_cleanup') 
ORDER BY created_at DESC;
```

## การปรับแต่ง

### เปลี่ยนเวลารัน
แก้ไขใน `docker/cron/Dockerfile.cron`:
```dockerfile
# รันทุกวันเวลา 03:00 น.
RUN echo "0 3 * * * cd /app && node scripts/cleanup-logs.js ..." > /etc/crontabs/root
```

### เปลี่ยน Retention Period
แก้ไขใน `docker-compose.prod.yml`:
```yaml
environment:
  - LOG_RETENTION_DAYS=60  # เก็บ 60 วัน
```

## การแจ้งเตือน

ระบบจะบันทึกผลการทำงานลงใน database และ log files:
- ✅ **SUCCESS**: ล้าง logs สำเร็จทุก table
- ⚠️ **PARTIAL_SUCCESS**: ล้างสำเร็จบางส่วน
- ❌ **FAILED**: ล้างไม่สำเร็จ

## ข้อควรระวัง

1. **ไม่สามารถกู้คืนได้**: logs ที่ถูกล้างแล้วจะไม่สามารถกู้คืนได้
2. **Retention ขั้นต่ำ**: ระบบจะไม่ยอมให้ตั้งค่าน้อยกว่า 7 วัน
3. **Database Performance**: การล้าง logs จำนวนมากอาจใช้เวลานาน

## Troubleshooting

### Cron Job ไม่ทำงาน
```bash
# ตรวจสอบ cron daemon
docker exec log-cleanup-cron ps aux | grep cron

# ตรวจสอบ crontab
docker exec log-cleanup-cron crontab -l
```

### Database Connection Error
ตรวจสอบ environment variables และ network connectivity:
```bash
docker exec log-cleanup-cron env | grep DATABASE_URL
```

### Script Error
ตรวจสอบ logs:
```bash
docker logs log-cleanup-cron
```