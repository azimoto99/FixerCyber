# Fixer Development Environment Setup Script (PowerShell)

Write-Host "🚀 Setting up Fixer development environment..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check Node.js version
$versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($versionNumber -lt 18) {
    Write-Host "❌ Node.js version 18+ is required. Current version: $nodeVersion" -ForegroundColor Red
    exit 1
}

# Install root dependencies
Write-Host "📦 Installing root dependencies..." -ForegroundColor Yellow
npm install

# Install client dependencies
Write-Host "📦 Installing client dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
Set-Location ..

# Install server dependencies
Write-Host "📦 Installing server dependencies..." -ForegroundColor Yellow
Set-Location server
npm install
Set-Location ..

# Copy environment files if they don't exist
if (-not (Test-Path "client\.env.local")) {
    Write-Host "📝 Creating client environment file..." -ForegroundColor Yellow
    Copy-Item "client\.env.example" "client\.env.local"
}

if (-not (Test-Path "server\.env")) {
    Write-Host "📝 Creating server environment file..." -ForegroundColor Yellow
    Copy-Item "server\.env.example" "server\.env"
    Write-Host "⚠️  Please update server\.env with your database credentials" -ForegroundColor Yellow
}

# Generate Prisma client
Write-Host "🗄️  Generating Prisma client..." -ForegroundColor Yellow
Set-Location server
npm run db:generate
Set-Location ..

Write-Host "✅ Development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎮 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update server\.env with your PostgreSQL database URL"
Write-Host "2. Run 'npm run db:setup' to initialize the database"
Write-Host "3. Run 'npm run dev' to start both client and server"
Write-Host ""
Write-Host "📚 Available commands:" -ForegroundColor Cyan
Write-Host "  npm run dev          - Start development servers"
Write-Host "  npm run build        - Build for production"
Write-Host "  npm run test         - Run all tests"
Write-Host "  npm run lint         - Lint all code"
Write-Host "  npm run format       - Format all code"