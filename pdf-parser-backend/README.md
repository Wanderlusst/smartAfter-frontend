# PDF Parser Backend API

A powerful Python FastAPI backend for parsing PDF documents and extracting warranty, invoice, and refund information with advanced analysis capabilities.

## Features

### 🔍 Document Processing
- **PDF Text Extraction**: Multiple extraction methods (pdfplumber, PyPDF2, OCR)
- **Multi-format Support**: Handles various PDF types including scanned documents
- **Batch Processing**: Process multiple PDFs simultaneously
- **URL Processing**: Extract data from PDF URLs

### 📋 Data Extraction
- **Invoice Data**: Vendor, amount, date, invoice number, products, taxes
- **Warranty Analysis**: Period, terms, status, expiry warnings, risk assessment
- **Refund Information**: Amount, reason, status, method, policy details
- **Product Details**: Names, descriptions, quantities, prices, categories

### 🛡️ Warranty Analysis
- **Smart Detection**: Automatically identifies warranty information
- **Expiry Warnings**: Alerts for warranties expiring within 30 days
- **Risk Assessment**: Low/Medium/High risk categorization
- **Recommendations**: Actionable insights and next steps
- **Contact Information**: Extracts warranty contact details

## Quick Start

### Prerequisites
- Python 3.8+
- pip package manager

### Installation

1. **Navigate to backend directory:**
   ```bash
   cd pdf-parser-backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the server:**
   ```bash
   python start_server.py
   ```

   Or directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Access the API
- **API Base URL**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## API Endpoints

### Core Endpoints

#### `POST /parse-pdf`
Parse a single PDF file and extract all relevant data.

**Request:**
- `file`: PDF file (multipart/form-data)

**Response:**
```json
{
  "document_type": "invoice",
  "filename": "invoice.pdf",
  "vendor": "Amazon",
  "amount": 1500.00,
  "date": "2024-01-15",
  "invoice_number": "INV-12345",
  "invoice_data": { ... },
  "warranty_data": { ... },
  "confidence": 0.85
}
```

#### `POST /analyze-warranty`
Analyze PDF specifically for warranty information.

**Request:**
- `file`: PDF file (multipart/form-data)

**Response:**
```json
{
  "document_id": "doc_12345_1640995200",
  "warranty_found": true,
  "warranty_data": {
    "vendor": "Apple",
    "product_name": "iPhone 15",
    "warranty_period": "1 year",
    "warranty_status": "active",
    "expiry_date": "2025-01-15T00:00:00"
  },
  "analysis_confidence": 0.9,
  "key_findings": [
    "Warranty period: 1 year",
    "Days remaining: 300"
  ],
  "recommendations": [
    "Warranty is active - keep documentation safe",
    "Set reminder for warranty expiry"
  ],
  "risk_assessment": "low",
  "expiry_warning": false,
  "days_until_expiry": 300
}
```

#### `POST /parse-multiple`
Process multiple PDF files in batch.

#### `POST /batch-warranty-analysis`
Analyze multiple PDFs for warranty information.

#### `POST /extract-from-url`
Extract data from PDF URL.

#### `POST /analyze-text`
Analyze raw text and extract structured data.

### Utility Endpoints

#### `GET /health`
Health check endpoint.

#### `GET /supported-formats`
Get supported document formats and capabilities.

## Configuration

### Environment Variables
Create a `.env` file in the backend directory:

```env
# Optional: Add any specific configuration
DEBUG=True
LOG_LEVEL=INFO
```

### CORS Configuration
The API is configured to allow requests from:
- http://localhost:3000 (Next.js dev server)
- http://localhost:3001 (Alternative port)

## Integration with Frontend

### Next.js Integration
The backend is designed to work seamlessly with the Next.js frontend:

1. **API Calls**: Frontend makes HTTP requests to backend endpoints
2. **File Upload**: PDF files are sent as multipart/form-data
3. **Response Handling**: Structured JSON responses for easy frontend integration

### Example Frontend Integration
```typescript
// Upload and analyze PDF
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch('http://localhost:8000/analyze-warranty', {
  method: 'POST',
  body: formData,
});

const warrantyAnalysis = await response.json();
```

## Development

### Project Structure
```
pdf-parser-backend/
├── main.py                 # FastAPI application
├── pdf_parser.py          # PDF parsing logic
├── data_extractor.py      # Data extraction and analysis
├── models.py              # Pydantic models
├── requirements.txt       # Python dependencies
├── start_server.py        # Startup script
└── README.md             # This file
```

### Adding New Features
1. **New Data Types**: Add models in `models.py`
2. **Extraction Logic**: Extend `data_extractor.py`
3. **API Endpoints**: Add routes in `main.py`
4. **PDF Processing**: Enhance `pdf_parser.py`

### Testing
Test the API using the interactive documentation at http://localhost:8000/docs or with curl:

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test PDF upload
curl -X POST "http://localhost:8000/parse-pdf" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample.pdf"
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process using port 8000
   lsof -ti:8000 | xargs kill -9
   ```

2. **Missing Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **OCR Issues**
   - Ensure Tesseract is installed on your system
   - For macOS: `brew install tesseract`
   - For Ubuntu: `sudo apt-get install tesseract-ocr`

4. **Memory Issues with Large PDFs**
   - The API handles large files but may take longer
   - Consider implementing file size limits in production

### Logs
Check the console output for detailed logs and error messages.

## Production Deployment

### Docker (Recommended)
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Setup
- Use environment variables for configuration
- Set up proper logging
- Configure CORS for production domains
- Add authentication if needed

## License

This project is part of the SmartAfter application suite.