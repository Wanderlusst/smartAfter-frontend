#!/usr/bin/env python3
"""
Startup script for the PDF Parser Backend API
"""

import uvicorn
import os
import sys
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def main():
    """Start the FastAPI server"""
    print("🚀 Starting PDF Parser Backend API...")
    print("📁 Backend directory:", current_dir)
    print("🌐 Server will be available at: http://localhost:8000")
    print("📚 API documentation: http://localhost:8000/docs")
    print("🔍 Health check: http://localhost:8000/health")
    print("-" * 50)
    
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
