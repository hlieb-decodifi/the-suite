#!/bin/bash

# Start Mailpit for local email testing
echo "🚀 Starting Mailpit for local email testing..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Mailpit container already exists
if docker ps -a --format "table {{.Names}}" | grep -q "^mailpit$"; then
    echo "📦 Mailpit container already exists."
    
    # Check if it's running
    if docker ps --format "table {{.Names}}" | grep -q "^mailpit$"; then
        echo "✅ Mailpit is already running!"
    else
        echo "🔄 Starting existing Mailpit container..."
        docker start mailpit
    fi
else
    echo "📦 Creating and starting new Mailpit container..."
    docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
fi

# Wait a moment for the container to start
sleep 2

# Check if Mailpit is running successfully
if docker ps --format "table {{.Names}}" | grep -q "^mailpit$"; then
    echo ""
    echo "✅ Mailpit is now running!"
    echo "📧 SMTP Server: localhost:1025"
    echo "🌐 Web Interface: http://localhost:8025"
    echo ""
    echo "💡 To use with your app, add to .env.local:"
    echo "   EMAIL_METHOD=local"
    echo "   SMTP_HOST=localhost"
    echo "   SMTP_PORT=1025"
    echo ""
    echo "🛑 To stop Mailpit: docker stop mailpit"
    echo "🗑️  To remove Mailpit: docker stop mailpit && docker rm mailpit"
else
    echo "❌ Failed to start Mailpit. Check Docker logs with: docker logs mailpit"
    exit 1
fi 