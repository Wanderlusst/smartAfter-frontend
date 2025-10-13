# SmartAfter - PDF Warranty Analysis System

A comprehensive full-stack application for analyzing PDF documents and extracting warranty information with intelligent insights and recommendations.

## 🏗️ Architecture

```
smartAf-nextjs/
├── smartafter-next/          # Next.js Frontend
│   ├── app/
│   │   ├── api/pdf-parser/   # API routes for PDF processing
│   │   ├── components/       # React components
│   │   ├── lib/             # Utility libraries
│   │   └── pdf-analyzer/    # PDF analyzer page
│   └── ...
├── pdf-parser-backend/       # Python FastAPI Backend
│   ├── main.py              # FastAPI application
│   ├── pdf_parser.py        # PDF parsing logic
│   ├── data_extractor.py    # Data extraction & analysis
│   ├── models.py            # Pydantic models
│   └── ...
└── start-dev.sh             # Development startup script
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.8+
- **Git**

### One-Command Setup
```bash
# Clone and start everything
git clone <repository-url>
cd smartAf-nextjs
chmod +x start-dev.sh
./start-dev.sh
```

This will:
1. ✅ Check prerequisites
2. 🐍 Set up Python backend with virtual environment
3. ⚛️ Install Node.js dependencies
4. 🚀 Start both servers simultaneously

### Manual Setup

#### Backend (Python FastAPI)
```bash
cd pdf-parser-backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python start_server.py
```

#### Frontend (Next.js)
```bash
cd smartafter-next
npm install
npm run dev
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **PDF Analyzer**: http://localhost:3000/pdf-analyzer

## 🔧 Features

### PDF Processing
- **Multi-format Support**: Handles various PDF types including scanned documents
- **OCR Integration**: Extracts text from image-based PDFs
- **Batch Processing**: Process multiple PDFs simultaneously
- **URL Processing**: Extract data from PDF URLs

### Warranty Analysis
- **Smart Detection**: Automatically identifies warranty information
- **Expiry Warnings**: Alerts for warranties expiring within 30 days
- **Risk Assessment**: Low/Medium/High risk categorization
- **Recommendations**: Actionable insights and next steps
- **Contact Extraction**: Finds warranty contact information

### Data Extraction
- **Invoice Data**: Vendor, amount, date, invoice number, products, taxes
- **Warranty Details**: Period, terms, status, expiry dates
- **Refund Information**: Amount, reason, status, method
- **Product Information**: Names, descriptions, quantities, prices

## 📡 API Endpoints

### Core Endpoints
- `POST /api/pdf-parser/parse` - Parse single PDF
- `POST /api/pdf-parser/analyze-warranty` - Analyze warranty information
- `POST /api/pdf-parser/batch-analyze` - Batch warranty analysis

### Backend Endpoints
- `POST /parse-pdf` - Parse PDF with full data extraction
- `POST /analyze-warranty` - Warranty-specific analysis
- `POST /batch-warranty-analysis` - Process multiple PDFs
- `GET /health` - Health check
- `GET /supported-formats` - Supported formats and capabilities

## 🛠️ Development

### Project Structure

#### Frontend (`smartafter-next/`)
```
app/
├── api/pdf-parser/          # API routes
│   ├── parse/route.ts
│   ├── analyze-warranty/route.ts
│   └── batch-analyze/route.ts
├── components/              # React components
│   └── PDFWarrantyAnalyzer.tsx
├── lib/                    # Utilities
│   ├── pdfParserService.ts
│   └── ...
└── pdf-analyzer/           # PDF analyzer page
    └── page.tsx
```

#### Backend (`pdf-parser-backend/`)
```
├── main.py                 # FastAPI application
├── pdf_parser.py          # PDF parsing logic
├── data_extractor.py      # Data extraction & analysis
├── models.py              # Pydantic models
├── requirements.txt       # Python dependencies
├── start_server.py        # Startup script
└── test_api.py           # API testing script
```

### Adding New Features

#### Frontend
1. **New Components**: Add to `app/components/`
2. **API Routes**: Add to `app/api/`
3. **Pages**: Add to `app/` directory
4. **Services**: Add to `app/lib/`

#### Backend
1. **New Models**: Add to `models.py`
2. **Extraction Logic**: Extend `data_extractor.py`
3. **API Endpoints**: Add to `main.py`
4. **PDF Processing**: Enhance `pdf_parser.py`

### Testing

#### Backend Testing
```bash
cd pdf-parser-backend
python test_api.py
```

#### Frontend Testing
```bash
cd smartafter-next
npm run test
```

## 🔧 Configuration

### Environment Variables

#### Frontend (`.env.local`)
```env
PDF_PARSER_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend (`.env`)
```env
DEBUG=True
LOG_LEVEL=INFO
```

### CORS Configuration
Backend is configured to allow requests from:
- http://localhost:3000 (Next.js dev server)
- http://localhost:3001 (Alternative port)

## 📦 Deployment

### Docker Deployment

#### Backend Dockerfile
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Frontend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Production Considerations
- Set up proper environment variables
- Configure CORS for production domains
- Add authentication/authorization
- Set up logging and monitoring
- Implement file size limits
- Add rate limiting

## 🐛 Troubleshooting

### Common Issues

#### Backend Issues
1. **Port 8000 in use**
   ```bash
   lsof -ti:8000 | xargs kill -9
   ```

2. **Python dependencies**
   ```bash
   cd pdf-parser-backend
   pip install -r requirements.txt
   ```

3. **OCR not working**
   - Install Tesseract: `brew install tesseract` (macOS)
   - Or: `sudo apt-get install tesseract-ocr` (Ubuntu)

#### Frontend Issues
1. **Port 3000 in use**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Node modules issues**
   ```bash
   cd smartafter-next
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **API connection issues**
   - Check if backend is running on port 8000
   - Verify CORS configuration
   - Check network connectivity

### Logs
- **Backend**: Check console output for detailed logs
- **Frontend**: Check browser console and terminal output

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the SmartAfter application suite.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation at http://localhost:8000/docs
3. Check the console logs for error messages
4. Create an issue in the repository

---

**Happy Coding! 🚀**
# SmartAf - Smart After Purchase Management
# Force Vercel Refresh - Mon Oct 13 09:21:11 IST 2025
# Trigger Vercel deployment
Last updated: Mon Oct 13 16:11:17 IST 2025
