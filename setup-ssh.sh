#!/bin/bash

# SSH Setup Script for Mac/Linux
# Usage: ./setup-ssh.sh

echo "🔐 SSH Setup Script - Mac/Linux"
echo "==============================="

# Configuration
SERVER_USER="remotepang1"
SERVER_IP="10.36.16.16"
EMAIL="your_email@example.com"

echo "Setting up SSH for: ${SERVER_USER}@${SERVER_IP}"
echo ""

# Step 1: Check if SSH key exists
echo "1️⃣ Checking existing SSH keys..."
if [ -f ~/.ssh/id_rsa ]; then
    echo "✅ RSA key already exists: ~/.ssh/id_rsa"
    EXISTING_KEY="~/.ssh/id_rsa"
elif [ -f ~/.ssh/id_ed25519 ]; then
    echo "✅ Ed25519 key already exists: ~/.ssh/id_ed25519"
    EXISTING_KEY="~/.ssh/id_ed25519"
else
    echo "❌ No SSH key found"
    EXISTING_KEY=""
fi

echo ""

# Step 2: Generate SSH key if needed
if [ -z "$EXISTING_KEY" ]; then
    echo "2️⃣ Generating new SSH key..."
    read -p "Enter your email address [$EMAIL]: " user_email
    user_email=${user_email:-$EMAIL}
    
    echo "Generating RSA key..."
    ssh-keygen -t rsa -b 4096 -C "$user_email" -f ~/.ssh/id_rsa
    
    if [ $? -eq 0 ]; then
        echo "✅ SSH key generated successfully"
        EXISTING_KEY="~/.ssh/id_rsa"
    else
        echo "❌ Failed to generate SSH key"
        exit 1
    fi
else
    echo "2️⃣ Using existing SSH key: $EXISTING_KEY"
fi

echo ""

# Step 3: Start SSH agent and add key
echo "3️⃣ Setting up SSH agent..."
eval "$(ssh-agent -s)"

if [ -f ~/.ssh/id_rsa ]; then
    ssh-add ~/.ssh/id_rsa
elif [ -f ~/.ssh/id_ed25519 ]; then
    ssh-add ~/.ssh/id_ed25519
fi

echo ""

# Step 4: Display public key
echo "4️⃣ Your public key:"
echo "==================="
if [ -f ~/.ssh/id_rsa.pub ]; then
    cat ~/.ssh/id_rsa.pub
    PUBLIC_KEY_FILE="~/.ssh/id_rsa.pub"
elif [ -f ~/.ssh/id_ed25519.pub ]; then
    cat ~/.ssh/id_ed25519.pub
    PUBLIC_KEY_FILE="~/.ssh/id_ed25519.pub"
fi

echo ""
echo "📋 Next steps:"
echo ""
echo "Option 1 - Automatic setup (if password login is enabled):"
echo "  ssh-copy-id ${SERVER_USER}@${SERVER_IP}"
echo ""
echo "Option 2 - Manual setup:"
echo "  1. Copy the public key above"
echo "  2. Login to server: ssh ${SERVER_USER}@${SERVER_IP}"
echo "  3. Create .ssh directory: mkdir -p ~/.ssh"
echo "  4. Add key to authorized_keys: echo 'YOUR_PUBLIC_KEY' >> ~/.ssh/authorized_keys"
echo "  5. Set permissions: chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
echo ""

# Step 5: Try automatic setup
echo "5️⃣ Attempting automatic setup..."
read -p "Do you want to try automatic SSH key copy? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Copying SSH key to server..."
    ssh-copy-id ${SERVER_USER}@${SERVER_IP}
    
    if [ $? -eq 0 ]; then
        echo "✅ SSH key copied successfully!"
        
        # Test connection
        echo ""
        echo "6️⃣ Testing SSH connection..."
        ssh -o ConnectTimeout=10 ${SERVER_USER}@${SERVER_IP} "echo 'SSH setup successful!'"
        
        if [ $? -eq 0 ]; then
            echo "🎉 SSH setup completed successfully!"
            echo ""
            echo "You can now run:"
            echo "  ./quick-deploy.sh"
        else
            echo "❌ SSH connection test failed"
            echo "Please check server configuration"
        fi
    else
        echo "❌ Failed to copy SSH key"
        echo "Please try manual setup (see instructions above)"
    fi
else
    echo "Skipping automatic setup"
    echo "Please follow manual setup instructions above"
fi

echo ""
echo "🔍 To test your setup later, run:"
echo "  ./check-ssh.sh"