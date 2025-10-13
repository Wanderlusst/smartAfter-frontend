# 🚀 SmartAf Deployment Guide

This guide will help you deploy both the frontend (Next.js) and backend (FastAPI) applications.

## 📋 Prerequisites

- GitHub repository with your code
- Vercel account (free tier available)
- Render account (free tier available)
- Supabase account (free tier available)

## 🎯 Deployment Architecture

```
Frontend (Next.js) → Vercel
Backend (FastAPI) → Render
Database → Supabase
Cache → Redis (optional, has fallback)
```

## 🖥️ Frontend Deployment (Vercel)

### Step 1: Prepare Repository
1. Push your code to GitHub
2. Ensure all environment variables are documented in `env.example`

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your repository
5. Set the following configuration:
   - **Framework Preset**: Next.js
   - **Root Directory**: `smartafter-next`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 3: Configure Environment Variables
In Vercel dashboard, go to Settings → Environment Variables and add:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXTAUTH_SECRET=your_nextauth_secret_key
NEXTAUTH_URL=https://your-app.vercel.app
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GEMINI_API_KEY=your_gemini_api_key
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
CREDIT_CARD_BACKEND_URL=https://your-backend.onrender.com
```

### Step 4: Deploy
1. Click "Deploy"
2. Wait for deployment to complete
3. Note your Vercel URL (e.g., `https://your-app.vercel.app`)

## ⚙️ Backend Deployment (Render)

### Step 1: Prepare Backend
1. Ensure `render.yaml` and `Procfile` are in the backend root
2. Update CORS origins in `main.py` with your Vercel URL

### Step 2: Deploy to Render
1. Go to [render.com](https://render.com)
2. Sign in with GitHub
3. Click "New +" → "Web Service"
4. Connect your repository
5. Set the following configuration:
   - **Name**: `smartaf-pdf-parser`
   - **Root Directory**: `pdf-parser-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 3: Configure Environment Variables
In Render dashboard, go to Environment and add:

```
PYTHON_VERSION=3.11.0
PORT=10000
```

### Step 4: Deploy
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Note your Render URL (e.g., `https://smartaf-pdf-parser.onrender.com`)

## 🗄️ Database Setup (Supabase)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### Step 2: Set Up Tables
Run the following SQL in Supabase SQL Editor:

```sql
-- Create purchases table
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  vendor TEXT,
  amount TEXT,
  date TEXT,
  subject TEXT,
  product_name TEXT,
  store TEXT,
  price TEXT,
  purchase_date TEXT,
  return_deadline TEXT,
  warranty_status TEXT,
  has_invoice BOOLEAN DEFAULT false,
  email_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create refunds table
CREATE TABLE refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  item TEXT,
  reason TEXT,
  amount TEXT,
  days_left INTEGER,
  status TEXT CHECK (status IN ('eligible', 'urgent', 'processing')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create warranties table
CREATE TABLE warranties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  item TEXT,
  coverage TEXT,
  expiry_date TEXT,
  days_left INTEGER,
  status TEXT CHECK (status IN ('active', 'expiring', 'expired')),
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

-- Create policies (basic - adjust based on your auth needs)
CREATE POLICY "Users can view their own data" ON purchases
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own refunds" ON refunds
  FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view their own warranties" ON warranties
  FOR ALL USING (auth.uid()::text = user_id);
```

## 🔄 Update Configuration

### Step 1: Update Backend CORS
Replace `https://your-app.vercel.app` in `main.py` with your actual Vercel URL.

### Step 2: Update Frontend Backend URL
Update `CREDIT_CARD_BACKEND_URL` in Vercel environment variables with your Render URL.

### Step 3: Update Vercel Rewrites
Update the rewrite rule in `vercel.json` with your actual Render URL.

## 🧪 Testing Deployment

### Frontend Tests
1. Visit your Vercel URL
2. Test authentication
3. Test PDF upload functionality
4. Check API calls to backend

### Backend Tests
1. Visit `https://your-backend.onrender.com/health`
2. Test PDF parsing endpoint
3. Check CORS headers

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend CORS includes your Vercel URL
   - Check that frontend is calling correct backend URL

2. **Environment Variables**
   - Verify all required env vars are set in both Vercel and Render
   - Check that variable names match exactly

3. **Build Failures**
   - Check build logs in Vercel/Render dashboards
   - Ensure all dependencies are in package.json/requirements.txt

4. **Database Connection**
   - Verify Supabase URL and keys are correct
   - Check RLS policies if getting permission errors

### Monitoring

- **Vercel**: Check deployment logs and analytics
- **Render**: Monitor service health and logs
- **Supabase**: Check database logs and performance

## 🚀 Production Checklist

- [ ] All environment variables configured
- [ ] CORS properly set up
- [ ] Database tables created
- [ ] RLS policies configured
- [ ] SSL certificates working
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Performance monitoring set up

## 📞 Support

If you encounter issues:
1. Check the logs in Vercel/Render dashboards
2. Verify environment variables
3. Test endpoints individually
4. Check Supabase logs for database issues

---

**Happy Deploying! 🎉**
