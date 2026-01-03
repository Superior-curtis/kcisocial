#!/bin/bash
# KKBOX Setup Quick Start Script

echo "🎵 KKBOX Backend Setup"
echo "====================="
echo ""

# Check if in correct directory
if [ ! -f "firebase.json" ]; then
    echo "❌ Error: Please run this script from the kcis-connect-main directory"
    exit 1
fi

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found"
    echo "Install: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"
echo ""

# Prompt for KKBOX credentials
echo "📝 Enter your KKBOX API credentials"
echo "(Get them from: https://developer.kkbox.com/)"
echo ""
read -p "KKBOX Client ID: " CLIENT_ID
read -sp "KKBOX Client Secret: " CLIENT_SECRET
echo ""
echo ""

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
    echo "❌ Credentials cannot be empty"
    exit 1
fi

# Create .env file for local development
echo "📄 Creating functions/.env file..."
cd functions
cat > .env << EOF
KKBOX_CLIENT_ID=$CLIENT_ID
KKBOX_CLIENT_SECRET=$CLIENT_SECRET
EOF
echo "✅ Created functions/.env"
cd ..

# Set Firebase secrets for production
echo ""
echo "🔐 Setting Firebase secrets for production..."
echo "$CLIENT_ID" | firebase functions:secrets:set KKBOX_CLIENT_ID
echo "$CLIENT_SECRET" | firebase functions:secrets:set KKBOX_CLIENT_SECRET
echo "✅ Secrets configured"

# Deploy functions
echo ""
read -p "🚀 Deploy Cloud Functions now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying functions..."
    firebase deploy --only functions
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Functions deployed successfully!"
        echo ""
        echo "📋 Next steps:"
        echo "1. Copy your Cloud Functions URL from the output above"
        echo "2. Add to .env file: VITE_KKBOX_PROXY_URL=https://your-function-url"
        echo "3. Run: npm run build"
        echo "4. Run: firebase deploy --only hosting"
        echo ""
        echo "📚 See KKBOX_SETUP_GUIDE.md for detailed instructions"
    else
        echo "❌ Deployment failed. Check errors above."
    fi
else
    echo ""
    echo "⏭️  Skipped deployment"
    echo "Deploy later with: firebase deploy --only functions"
fi

echo ""
echo "🎉 Setup complete!"
