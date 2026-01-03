# KKBOX Setup Quick Start Script (Windows PowerShell)

Write-Host "🎵 KKBOX Backend Setup" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
if (-not (Test-Path "firebase.json")) {
    Write-Host "❌ Error: Please run this script from the kcis-connect-main directory" -ForegroundColor Red
    exit 1
}

# Check Firebase CLI
try {
    firebase --version | Out-Null
    Write-Host "✅ Firebase CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found" -ForegroundColor Red
    Write-Host "Install: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Prompt for KKBOX credentials
Write-Host "📝 Enter your KKBOX API credentials" -ForegroundColor Yellow
Write-Host "(Get them from: https://developer.kkbox.com/)" -ForegroundColor Gray
Write-Host ""

$CLIENT_ID = Read-Host "KKBOX Client ID"
$CLIENT_SECRET = Read-Host "KKBOX Client Secret" -AsSecureString
$CLIENT_SECRET_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($CLIENT_SECRET))

Write-Host ""

if ([string]::IsNullOrWhiteSpace($CLIENT_ID) -or [string]::IsNullOrWhiteSpace($CLIENT_SECRET_PLAIN)) {
    Write-Host "❌ Credentials cannot be empty" -ForegroundColor Red
    exit 1
}

# Create .env file for local development
Write-Host "📄 Creating functions\.env file..." -ForegroundColor Yellow
Push-Location functions

$envContent = @"
KKBOX_CLIENT_ID=$CLIENT_ID
KKBOX_CLIENT_SECRET=$CLIENT_SECRET_PLAIN
"@
$envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline

Write-Host "✅ Created functions\.env" -ForegroundColor Green
Pop-Location

# Set Firebase secrets for production
Write-Host ""
Write-Host "🔐 Setting Firebase secrets for production..." -ForegroundColor Yellow

# Set KKBOX_CLIENT_ID
$CLIENT_ID | firebase functions:secrets:set KKBOX_CLIENT_ID

# Set KKBOX_CLIENT_SECRET
$CLIENT_SECRET_PLAIN | firebase functions:secrets:set KKBOX_CLIENT_SECRET

Write-Host "✅ Secrets configured" -ForegroundColor Green

# Deploy functions
Write-Host ""
$deploy = Read-Host "🚀 Deploy Cloud Functions now? (y/n)"

if ($deploy -eq "y" -or $deploy -eq "Y") {
    Write-Host "Deploying functions..." -ForegroundColor Yellow
    firebase deploy --only functions
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Functions deployed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Next steps:" -ForegroundColor Cyan
        Write-Host "1. Copy your Cloud Functions URL from the output above"
        Write-Host "2. Add to .env file: VITE_KKBOX_PROXY_URL=https://your-function-url"
        Write-Host "3. Run: npm run build"
        Write-Host "4. Run: firebase deploy --only hosting"
        Write-Host ""
        Write-Host "📚 See KKBOX_SETUP_GUIDE.md for detailed instructions" -ForegroundColor Gray
    } else {
        Write-Host "❌ Deployment failed. Check errors above." -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "⏭️  Skipped deployment" -ForegroundColor Yellow
    Write-Host "Deploy later with: firebase deploy --only functions"
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
