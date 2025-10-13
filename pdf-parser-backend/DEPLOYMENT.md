# SmartAfter PDF Parser Backend - Render Deployment Guide

## 🚀 Quick Deploy to Render

### Step 1: Prepare Repository
1. Push your code to GitHub/GitLab
2. Make sure the `pdf-parser-backend` folder is in the root of your repository

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository containing this backend

### Step 3: Configure Service
- **Name**: `smartafter-pdf-parser` (or any name you prefer)
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python start_server.py`
- **Python Version**: `3.9.18`

### Step 4: Environment Variables
Add these environment variables in Render dashboard:
- `PORT`: `8000` (Render will set this automatically)
- `PYTHON_VERSION`: `3.9.18`

### Step 5: Deploy
Click "Create Web Service" and wait for deployment to complete.

## 📋 Environment Variables Needed

```bash
# Required by Render
PORT=8000

# Optional (if you need them)
PYTHON_VERSION=3.9.18
```

## 🔧 Local Testing

Test locally before deploying:
```bash
cd pdf-parser-backend
pip install -r requirements.txt
python start_server.py
```

## 📚 API Endpoints

Once deployed, your API will be available at:
- **Base URL**: `https://your-app-name.onrender.com`
- **Health Check**: `https://your-app-name.onrender.com/health`
- **API Docs**: `https://your-app-name.onrender.com/docs`

## 🐛 Troubleshooting

1. **Build Fails**: Check that all dependencies are in `requirements.txt`
2. **App Crashes**: Check logs in Render dashboard
3. **Port Issues**: Make sure `start_server.py` uses `os.environ.get("PORT", 8000)`

## 💰 Cost

- Render free tier: 750 hours/month
- Auto-sleeps after 15 minutes of inactivity
- Wakes up automatically on first request
