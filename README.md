# SmartAfter Frontend - Intelligent Purchase Management System

> **🎯 THIS IS THE FRONTEND REPOSITORY** - Next.js application for SmartAfter

A comprehensive solution for automatically organizing receipts, tracking returns, and managing warranties from your email.

## 🏗️ Architecture Overview

### Frontend Repository (THIS REPO)
- **Repository**: [Wanderlusst/smartAfter-frontend](https://github.com/Wanderlusst/smartAfter-frontend) ← **YOU ARE HERE**
- **Deployment**: [smart-after-frontend.vercel.app](https://smart-after-frontend.vercel.app)
- **Platform**: Vercel
- **Framework**: Next.js 15 with TypeScript
- **Status**: ✅ Live

## 🚀 Quick Start

### Frontend (Next.js) - THIS REPOSITORY
```bash
# You're already in the frontend repository!
# If cloning fresh:
# git clone https://github.com/Wanderlusst/smartAfter-frontend.git
# cd smartAfter-frontend

# Install dependencies
npm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

### Backend (Python FastAPI)
```bash
# Backend is included in this repository
cd pdf-parser-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py
```

## 🔧 Environment Variables

### Frontend (.env.local)
```env
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://smart-after-frontend.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Backend (.env)
```env
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
GEMINI_API_KEY=your-gemini-api-key
REDIS_HOST=your-redis-host
REDIS_PORT=your-redis-port
REDIS_PASSWORD=your-redis-password
```

## 📁 Project Structure

### Frontend
```
smartAfter-frontend/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── dashboard/         # Dashboard pages
│   ├── landing/           # Landing page
│   └── lib/              # Utility functions
├── auth.ts               # NextAuth configuration
├── middleware.ts         # Next.js middleware
└── package.json          # Dependencies
```

### Backend
```
pdf-parser-backend/       # Python FastAPI backend
├── main.py              # FastAPI application
├── models.py            # Data models
├── pdf_parser.py        # PDF parsing logic
├── data_extractor.py    # Data extraction logic
├── custom_parser.py     # Custom parsing logic
└── requirements.txt     # Python dependencies
```

## 🔄 Deployment Status

### Frontend Deployment
- **Platform**: Vercel
- **URL**: https://smart-after-frontend.vercel.app
- **Auto-deploy**: ✅ Enabled (pushes to main branch)
- **Last Deploy**: [Check Vercel Dashboard](https://vercel.com/dashboard)

### Backend Deployment
- **Platform**: Render
- **URL**: https://pdf-parser-backend.onrender.com
- **Auto-deploy**: ✅ Enabled (pushes to main branch)
- **Last Deploy**: [Check Render Dashboard](https://dashboard.render.com)

## 🛠️ Recent Fixes

### Redirect Loop Fix (Latest)
- **Issue**: Landing page redirect loop with callbackUrl parameter
- **Files Changed**: 
  - `auth.ts` - Fixed NextAuth redirect callback
  - `middleware.ts` - Added /landing to matcher
  - `app/landing/page.tsx` - Added delay to prevent race conditions
- **Status**: ✅ Deployed

### Build Errors Fix
- **Issue**: TypeScript errors and ESLint warnings
- **Files Changed**: Multiple API routes and components
- **Status**: ✅ Deployed

## 🧪 Testing

### Frontend Testing
```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run build test
npm run build
```

### Backend Testing
```bash
# Navigate to backend directory
cd pdf-parser-backend

# Run tests
python -m pytest

# Test API endpoints
curl https://pdf-parser-backend.onrender.com/health
```

## 📊 Features

- 🔐 **Google OAuth Integration** - Secure email access
- 📧 **Gmail API Integration** - Automatic receipt detection
- 🤖 **AI-Powered Parsing** - Gemini AI for data extraction
- 📊 **Dashboard Analytics** - Spending insights and trends
- ⏰ **Smart Alerts** - Return deadlines and warranty reminders
- 🔄 **Real-time Sync** - Background processing for emails

## 🚨 Troubleshooting

### Common Issues

1. **Redirect Loop**: Fixed in latest deployment
2. **Build Errors**: All TypeScript errors resolved
3. **Environment Variables**: Ensure all required vars are set
4. **CORS Issues**: Backend has proper CORS configuration

### Debug Commands
```bash
# Check frontend logs
vercel logs

# Check backend logs
# Visit Render dashboard for logs

# Test API connectivity
curl -X GET https://pdf-parser-backend.onrender.com/health
```

## 📞 Support

- **Frontend Issues**: Check [Vercel Dashboard](https://vercel.com/dashboard)
- **Backend Issues**: Check [Render Dashboard](https://dashboard.render.com)
- **Code Issues**: Create GitHub issues in [Wanderlusst/smartAfter-frontend](https://github.com/Wanderlusst/smartAfter-frontend)

---

**Last Updated**: $(date)
**Version**: 1.0.4
**Status**: 🟢 Production Ready
**Cache Bust**: $(date +%s)
**Deployment**: $(date +%Y%m%d%H%M%S)
**Backend Fix**: Environment variables configured for PDF parser backend