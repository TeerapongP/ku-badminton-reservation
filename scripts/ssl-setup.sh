#!/bin/bash

# SSL Certificate Setup Script
# This script helps set up SSL certificates for the reverse proxy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SSL_DIR="./nginx/ssl"
DOMAIN_NAME=${1:-"localhost"}

# Create SSL directory
mkdir -p "$SSL_DIR"

# Generate self-signed certificate for development
generate_self_signed() {
    log_info "Generating self-signed SSL certificate for $DOMAIN_NAME..."
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/key.pem" \
        -out "$SSL_DIR/cert.pem" \
        -subj "/C=TH/ST=Bangkok/L=Bangkok/O=Organization/OU=OrgUnit/CN=$DOMAIN_NAME"
    
    log_info "Self-signed certificate generated successfully!"
    log_warn "Note: This is for development only. Use Let's Encrypt for production."
}

# Setup Let's Encrypt with Certbot
setup_letsencrypt() {
    log_info "Setting up Let's Encrypt certificate for $DOMAIN_NAME..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        log_error "Certbot is not installed. Please install it first:"
        echo "  Ubuntu/Debian: sudo apt-get install certbot"
        echo "  CentOS/RHEL: sudo yum install certbot"
        echo "  macOS: brew install certbot"
        exit 1
    fi
    
    # Generate certificate
    sudo certbot certonly --standalone \
        --preferred-challenges http \
        -d "$DOMAIN_NAME" \
        --email "${ACME_EMAIL:-admin@$DOMAIN_NAME}" \
        --agree-tos \
        --non-interactive
    
    # Copy certificates to nginx directory
    sudo cp "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" "$SSL_DIR/cert.pem"
    sudo cp "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" "$SSL_DIR/key.pem"
    
    # Set proper permissions
    sudo chown $(whoami):$(whoami) "$SSL_DIR"/*.pem
    chmod 600 "$SSL_DIR"/*.pem
    
    log_info "Let's Encrypt certificate installed successfully!"
}

# Setup certificate renewal
setup_renewal() {
    log_info "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > "./scripts/renew-ssl.sh" << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

set -e

DOMAIN_NAME=${1:-"your-domain.com"}
SSL_DIR="./nginx/ssl"

echo "Renewing SSL certificate for $DOMAIN_NAME..."

# Renew certificate
sudo certbot renew --quiet

# Copy renewed certificates
sudo cp "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" "$SSL_DIR/cert.pem"
sudo cp "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" "$SSL_DIR/key.pem"

# Set proper permissions
sudo chown $(whoami):$(whoami) "$SSL_DIR"/*.pem
chmod 600 "$SSL_DIR"/*.pem

# Reload nginx
docker-compose exec nginx nginx -s reload

echo "SSL certificate renewed successfully!"
EOF

    chmod +x "./scripts/renew-ssl.sh"
    
    # Add to crontab (runs twice daily)
    (crontab -l 2>/dev/null; echo "0 */12 * * * $(pwd)/scripts/renew-ssl.sh $DOMAIN_NAME") | crontab -
    
    log_info "Automatic renewal setup completed!"
    log_info "Certificates will be renewed automatically twice daily."
}

# Validate certificate
validate_certificate() {
    log_info "Validating SSL certificate..."
    
    if [ -f "$SSL_DIR/cert.pem" ] && [ -f "$SSL_DIR/key.pem" ]; then
        # Check certificate validity
        CERT_EXPIRY=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -enddate | cut -d= -f2)
        log_info "Certificate expires: $CERT_EXPIRY"
        
        # Check if certificate matches private key
        CERT_HASH=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -modulus | openssl md5)
        KEY_HASH=$(openssl rsa -in "$SSL_DIR/key.pem" -noout -modulus | openssl md5)
        
        if [ "$CERT_HASH" = "$KEY_HASH" ]; then
            log_info "✅ Certificate and private key match!"
        else
            log_error "❌ Certificate and private key do not match!"
            exit 1
        fi
    else
        log_error "SSL certificate files not found!"
        exit 1
    fi
}

# Main function
main() {
    if [ -z "$DOMAIN_NAME" ]; then
        log_error "Please provide a domain name"
        echo "Usage: $0 <domain_name> [action]"
        echo "Actions: self-signed, letsencrypt, renew, validate"
        exit 1
    fi
    
    case "${2:-self-signed}" in
        "self-signed")
            generate_self_signed
            validate_certificate
            ;;
        "letsencrypt")
            setup_letsencrypt
            setup_renewal
            validate_certificate
            ;;
        "renew")
            setup_renewal
            ;;
        "validate")
            validate_certificate
            ;;
        *)
            echo "Usage: $0 <domain_name> {self-signed|letsencrypt|renew|validate}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"