#!/bin/bash

echo "🚀 SmartAfter PDF Parser Backend - Deployment Script"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "start_server.py" ]; then
    echo "❌ Error: Please run this script from the pdf-parser-backend directory"
    exit 1
fi

echo "✅ Backend directory confirmed"

# Test imports
echo "🧪 Testing backend imports..."
python3 -c "import main; print('✅ Backend imports successfully')"

if [ $? -eq 0 ]; then
    echo "✅ Backend is ready for deployment!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Push this code to GitHub/GitLab"
    echo "2. Go to https://render.com"
    echo "3. Create new Web Service"
    echo "4. Connect your repository"
    echo "5. Use these settings:"
    echo "   - Build Command: pip install -r requirements.txt"
    echo "   - Start Command: python start_server.py"
    echo "   - Python Version: 3.9.18"
    echo ""
    echo "🌐 Your API will be available at: https://your-app-name.onrender.com"
    echo "📚 API Documentation: https://your-app-name.onrender.com/docs"
else
    echo "❌ Backend has issues. Please fix them before deploying."
    exit 1
fi
