# Docker Deployment Guide

## 🐳 Overview

This project includes comprehensive Docker configuration with reverse proxy, SSL termination, monitoring, and production-ready setup.

## 📁 Docker Files Structure

```
├── Dockerfile                     # Multi-stage Next.js build
├── docker-compose.yml            # Main services configuration
├── docker-compose.override.yml   # Development overrides
├── docker-compose.prod.yml       # Production configuration
├── .dockerignore                 # Docker ignore patterns
├── nginx/
│   ├── nginx.conf                # Main Nginx configuration
│   └── conf.d/
│       └── default.conf          # Server blocks configuration
├── monitoring/
│   └── prometheus.yml            # Prometheus configuration
└── scripts/
    ├── deploy.sh                 # Deployment automation
    └── ssl-setup.sh              # SSL certificate setup
```

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### 2. Development Mode

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f app
```

### 3. Production Mode

```bash
# Setup SSL certificates
./scripts/ssl-setup.sh your-domain.com letsencrypt

# Deploy to production
./scripts/deploy.sh deploy
```

## 🔧 Configuration Options

### Services Available

| Service | Description | Port | Profile |
|---------|-------------|------|---------|
| `app` | Next.js Application | 3000 | default |
| `db` | MySQL Database | 3306 | default |
| `redis` | Redis Cache | 6379 | default |
| `nginx` | Reverse Proxy | 80,443 | default |
| `traefik` | Alternative Proxy | 80,443,8080 | traefik |
| `prometheus` | Metrics Collection | 9090 | monitoring |
| `grafana` | Monitoring Dashboard | 3001 | monitoring |

### Environment Variables

```env
# Required
DATABASE_URL=mysql://user:pass@db:3306/dbname
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# Optional
DOMAIN_NAME=your-domain.com
ACME_EMAIL=admin@your-domain.com
GRAFANA_PASSWORD=secure-password
MAINTENANCE_MODE=false
```

## 🔄 Reverse Proxy Options

### Option 1: Nginx (Default)

```bash
# Start with Nginx
docker-compose up -d nginx
```

**Features:**
- SSL termination
- Rate limiting
- Static file caching
- Security headers
- Custom error pages

### Option 2: Traefik

```bash
# Start with Traefik
docker-compose --profile traefik up -d
```

**Features:**
- Automatic SSL with Let's Encrypt
- Service discovery
- Load balancing
- Dashboard UI
- Docker integration

## 📊 Monitoring Stack

### Enable Monitoring

```bash
# Start monitoring services
docker-compose --profile monitoring up -d

# Access Grafana
open http://localhost:3001
# Default: admin / your_grafana_password

# Access Prometheus
open http://localhost:9090
```

### Metrics Available

- **Application Health**: `/api/health` endpoint
- **System Metrics**: CPU, Memory, Disk
- **Database Metrics**: Connections, Queries
- **Nginx Metrics**: Requests, Response times
- **Redis Metrics**: Memory usage, Commands

## 🔒 SSL Configuration

### Development (Self-signed)

```bash
./scripts/ssl-setup.sh localhost self-signed
```

### Production (Let's Encrypt)

```bash
# Setup SSL
./scripts/ssl-setup.sh your-domain.com letsencrypt

# Auto-renewal is configured via cron
```

### Manual Certificate

```bash
# Place your certificates in:
nginx/ssl/cert.pem
nginx/ssl/key.pem
```

## 🚀 Deployment Commands

### Basic Deployment

```bash
# Deploy application
./scripts/deploy.sh deploy

# Check status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs app
```

### Advanced Operations

```bash
# Backup database
./scripts/deploy.sh backup

# Rollback to previous version
./scripts/deploy.sh rollback backups/db_backup_20231016_120000.sql

# Restart specific service
./scripts/deploy.sh restart nginx

# Cleanup old images
./scripts/deploy.sh cleanup
```

## 🔧 Customization

### Nginx Configuration

Edit `nginx/conf.d/default.conf`:

```nginx
# Custom rate limiting
limit_req zone=api burst=50 nodelay;

# Custom caching
location ~* \.(css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Custom headers
add_header X-Custom-Header "Your-Value" always;
```

### Docker Compose Overrides

Create `docker-compose.local.yml`:

```yaml
version: '3.8'
services:
  app:
    environment:
      - CUSTOM_ENV_VAR=value
    volumes:
      - ./custom-config:/app/config
```

Use with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml up
```

## 📈 Performance Tuning

### Production Optimizations

```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
```

### Database Tuning

```sql
-- MySQL configuration
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
SET GLOBAL max_connections = 200;
SET GLOBAL query_cache_size = 67108864; -- 64MB
```

### Redis Configuration

```bash
# Redis memory optimization
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :80
   
   # Stop conflicting services
   sudo systemctl stop apache2
   ```

2. **SSL Certificate Issues**
   ```bash
   # Validate certificate
   ./scripts/ssl-setup.sh your-domain.com validate
   
   # Check certificate expiry
   openssl x509 -in nginx/ssl/cert.pem -noout -dates
   ```

3. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose logs db
   
   # Test connection
   docker-compose exec db mysql -u root -p
   ```

4. **Memory Issues**
   ```bash
   # Check container memory usage
   docker stats
   
   # Increase memory limits in docker-compose.yml
   ```

### Health Checks

```bash
# Application health
curl http://localhost/api/health

# Database health
docker-compose exec db mysqladmin ping

# Redis health
docker-compose exec redis redis-cli ping
```

### Log Analysis

```bash
# Application logs
docker-compose logs -f app

# Nginx access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# Database logs
docker-compose logs -f db

# All services logs
docker-compose logs -f
```

## 🔐 Security Considerations

### Production Security Checklist

- [ ] Use strong passwords for all services
- [ ] Enable SSL/TLS encryption
- [ ] Configure proper firewall rules
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup encryption
- [ ] Rate limiting configuration
- [ ] Security headers validation

### Network Security

```bash
# Create custom network
docker network create --driver bridge secure-network

# Use in docker-compose.yml
networks:
  default:
    external:
      name: secure-network
```

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review Docker and application logs
3. Validate configuration files
4. Test individual services
5. Check network connectivity

Remember to never commit sensitive information like passwords or private keys to version control!