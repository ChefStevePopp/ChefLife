#!/bin/bash
# ChefLife Quick Start Script

echo "🔥 ChefLife Setup Wizard 🔥"
echo "================================"
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "✓ .env file found"
else
    echo "Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your Supabase credentials"
    echo "   Get them from: https://app.supabase.com/project/_/settings/api"
    echo ""
    read -p "Press Enter when you've updated .env..."
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "✓ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run dev' to start development server"
echo "  2. Run 'npm run build' to build for production"
echo "  3. See DEPLOYMENT.md for production deployment"
echo ""
echo "Happy cooking! 👨‍🍳"
