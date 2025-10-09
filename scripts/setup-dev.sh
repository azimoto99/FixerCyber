#!/bin/bash

# Fixer Development Environment Setup Script

set -e

echo "🚀 Setting up Fixer development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Copy environment files if they don't exist
if [ ! -f "client/.env.local" ]; then
    echo "📝 Creating client environment file..."
    cp client/.env.example client/.env.local
fi

if [ ! -f "server/.env" ]; then
    echo "📝 Creating server environment file..."
    cp server/.env.example server/.env
    echo "⚠️  Please update server/.env with your database credentials"
fi

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
cd server
npm run db:generate
cd ..

echo "✅ Development environment setup complete!"
echo ""
echo "🎮 Next steps:"
echo "1. Update server/.env with your PostgreSQL database URL"
echo "2. Run 'npm run db:setup' to initialize the database"
echo "3. Run 'npm run dev' to start both client and server"
echo ""
echo "📚 Available commands:"
echo "  npm run dev          - Start development servers"
echo "  npm run build        - Build for production"
echo "  npm run test         - Run all tests"
echo "  npm run lint         - Lint all code"
echo "  npm run format       - Format all code"
echo ""