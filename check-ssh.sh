#!/bin/bash

# SSH Connection Checker for Mac/Linux
# Usage: ./check-ssh.sh

echo "🔍 SSH Connection Checker - Mac/Linux"
echo "====================================="

# Configuration
SERVER_USER="remotepang1"
SERVER_IP="10.36.16.16"

echo "Target: ${SERVER_USER}@${SERVER_IP}"
echo ""

# Step 1: Check if SSH client is available
echo "1️⃣ Checking SSH client..."
if command -v ssh >/dev/null 2>&1; then
    echo "✅ SSH client is available"
    ssh -V
else
    echo "❌ SSH client not found"
    echo "Please install OpenSSH client"
    exit 1
fi

echo ""

# Step 2: Check network connectivity
echo "2️⃣ Checking network connectivity..."
if ping -c 1 -W 5 ${SERVER_IP} >/dev/null 2>&1; then
    echo "✅ Server is reachable via ping"
else
    echo "❌ Server is not reachable via ping"
    echo "Please check:"
    echo "  - VPN connection"
    echo "  - Network connectivity"
    echo "  - Server IP address"
fi

echo ""

# Step 3: Check SSH port
echo "3️⃣ Checking SSH port (22)..."
if nc -z -w5 ${SERVER_IP} 22 2>/dev/null; then
    echo "✅ SSH port 22 is open"
else
    echo "❌ SSH port 22 is not accessible"
    echo "Please check:"
    echo "  - Firewall settings"
    echo "  - SSH service on server"
    echo "  - VPN connection"
fi

echo ""

# Step 4: Check SSH key
echo "4️⃣ Checking SSH key..."
if [ -f ~/.ssh/id_rsa ]; then
    echo "✅ SSH private key found: ~/.ssh/id_rsa"
    echo "Key fingerprint:"
    ssh-keygen -lf ~/.ssh/id_rsa
elif [ -f ~/.ssh/id_ed25519 ]; then
    echo "✅ SSH private key found: ~/.ssh/id_ed25519"
    echo "Key fingerprint:"
    ssh-keygen -lf ~/.ssh/id_ed25519
else
    echo "❌ No SSH private key found"
    echo "Please generate SSH key:"
    echo "  ssh-keygen -t rsa -b 4096 -C \"your_email@example.com\""
fi

echo ""

# Step 5: Test SSH connection
echo "5️⃣ Testing SSH connection..."
echo "Attempting to connect (timeout: 10 seconds)..."

ssh -o ConnectTimeout=10 -o BatchMode=yes ${SERVER_USER}@${SERVER_IP} "echo 'SSH connection successful'" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ SSH connection successful!"
    echo ""
    echo "🎉 All checks passed! You can now run:"
    echo "  ./quick-deploy.sh"
else
    echo "❌ SSH connection failed"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo ""
    echo "1. Generate SSH key (if not exists):"
    echo "   ssh-keygen -t rsa -b 4096 -C \"your_email@example.com\""
    echo ""
    echo "2. Copy SSH key to server:"
    echo "   ssh-copy-id ${SERVER_USER}@${SERVER_IP}"
    echo ""
    echo "3. Test manual connection:"
    echo "   ssh ${SERVER_USER}@${SERVER_IP}"
    echo ""
    echo "4. If using VPN, make sure it's connected"
    echo ""
    echo "5. Check server status with system administrator"
    
    # Try to get more detailed error
    echo ""
    echo "🔍 Detailed SSH error:"
    ssh -v -o ConnectTimeout=10 ${SERVER_USER}@${SERVER_IP} "echo 'test'" 2>&1 | tail -5
fi

echo ""
echo "📋 Connection Summary:"
echo "  Server: ${SERVER_USER}@${SERVER_IP}"
echo "  SSH Key: $([ -f ~/.ssh/id_rsa ] && echo "~/.ssh/id_rsa" || echo "Not found")"
echo "  Network: $(ping -c 1 -W 5 ${SERVER_IP} >/dev/null 2>&1 && echo "OK" || echo "Failed")"
echo "  SSH Port: $(nc -z -w5 ${SERVER_IP} 22 2>/dev/null && echo "Open" || echo "Closed")"