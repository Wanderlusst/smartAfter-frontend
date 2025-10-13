from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import tempfile
import json
import base64
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from pdf_parser import PDFParser
from data_extractor import DataExtractor
from custom_parser import CustomInvoiceParser
from models import (
    DocumentData, InvoiceData, WarrantyData, RefundData, 
    WarrantyAnalysisResult, BatchProcessingResult, APIResponse, 
    HealthCheckResponse, SupportedFormatsResponse
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Smart PDF Parser API",
    description="Advanced PDF parsing and data extraction for invoices, warranties, and refunds",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "https://your-app.vercel.app",  # Replace with your Vercel URL
        "https://*.vercel.app"  # Allow all Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize parsers
pdf_parser = PDFParser()
data_extractor = DataExtractor()
custom_parser = CustomInvoiceParser()

# Simple in-memory cache to prevent duplicate processing
processed_emails = {}
MAX_CACHE_SIZE = 1000  # Maximum number of emails to cache

@app.get("/")
async def root():
    return {"message": "Smart PDF Parser API is running!", "version": "1.0.0"}

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    return HealthCheckResponse(
        status="healthy", 
        timestamp=datetime.now().isoformat(),
        services={
            "pdf_parser": "operational",
            "data_extractor": "operational",
            "warranty_analyzer": "operational"
        }
    )

@app.post("/parse-pdf", response_model=DocumentData)
async def parse_pdf(file: UploadFile = File(...)):
    """
    Parse a single PDF file and extract all relevant data
    """
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Parse PDF
            logger.info(f"Parsing PDF: {file.filename}")
            pdf_data = pdf_parser.parse_pdf(tmp_file_path)
            
            # Extract structured data
            extracted_data = data_extractor.extract_from_pdf(pdf_data, file.filename)
            
            # Clean up temp file
            os.unlink(tmp_file_path)
            
            return extracted_data
            
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
            raise e
            
    except Exception as e:
        logger.error(f"Error parsing PDF {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")

@app.post("/parse-multiple")
async def parse_multiple_pdfs(files: List[UploadFile] = File(...)):
    """
    Parse multiple PDF files and extract data from all
    """
    results = []
    errors = []
    
    for file in files:
        try:
            if not file.filename.lower().endswith('.pdf'):
                errors.append(f"{file.filename}: Not a PDF file")
                continue
                
            # Save uploaded file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_file_path = tmp_file.name
            
            try:
                # Parse PDF
                pdf_data = pdf_parser.parse_pdf(tmp_file_path)
                extracted_data = data_extractor.extract_from_pdf(pdf_data, file.filename)
                results.append(extracted_data)
                
                # Clean up temp file
                os.unlink(tmp_file_path)
                
            except Exception as e:
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)
                errors.append(f"{file.filename}: {str(e)}")
                
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")
    
    return {
        "success": len(results),
        "errors": len(errors),
        "results": results,
        "error_details": errors
    }

@app.post("/extract-from-url")
async def extract_from_url(url: str = Form(...)):
    """
    Extract data from PDF URL
    """
    try:
        import requests
        
        # Download PDF from URL
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(response.content)
            tmp_file_path = tmp_file.name
        
        try:
            # Parse PDF
            pdf_data = pdf_parser.parse_pdf(tmp_file_path)
            extracted_data = data_extractor.extract_from_pdf(pdf_data, "url_pdf")
            
            # Clean up temp file
            os.unlink(tmp_file_path)
            
            return extracted_data
            
        except Exception as e:
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
            raise e
            
    except Exception as e:
        logger.error(f"Error extracting from URL {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error extracting from URL: {str(e)}")

@app.post("/analyze-text")
async def analyze_text(text: str = Form(...), document_type: str = Form("auto")):
    """
    Analyze raw text and extract structured data
    """
    try:
        extracted_data = data_extractor.extract_from_text(text, document_type)
        return extracted_data
        
    except Exception as e:
        logger.error(f"Error analyzing text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing text: {str(e)}")

@app.post("/parse-text-custom")
async def parse_text_custom(text: str = Form(...), filename: str = Form("text_input")):
    """
    Parse text using custom Python parser (no external libraries)
    """
    try:
        logger.info(f"Parsing text with custom parser: {filename}")
        extracted_data = custom_parser.parse_invoice_data(text, filename)
        return extracted_data
        
    except Exception as e:
        logger.error(f"Error parsing text with custom parser: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error parsing text: {str(e)}")

def is_credit_card_statement(subject: str, from_email: str, body: str = "") -> bool:
    """Check if email is a credit card statement"""
    subject_lower = subject.lower()
    from_lower = from_email.lower()
    body_lower = body.lower()
    
    # Credit card statement keywords
    credit_card_keywords = [
        'credit card statement',
        'card statement', 
        'credit card',
        'statement',
        'bank statement',
        'upi rupay',
        'hdfc bank',
        'icici bank',
        'sbi card',
        'axis bank',
        'kotak bank',
        'credit card bill',
        'card bill'
    ]
    
    # Check subject and from fields
    for keyword in credit_card_keywords:
        if keyword in subject_lower or keyword in from_lower:
            return True
    
    # Check for bank domains
    bank_domains = ['hdfcbank.com', 'icicibank.com', 'sbicard.com', 'axisbank.com', 'kotak.com']
    for domain in bank_domains:
        if domain in from_lower:
            return True
    
    return False

def is_promotional_email(subject: str, from_email: str, body: str = "") -> bool:
    """
    Check if the email is promotional and should be filtered out
    """
    subject_lower = subject.lower()
    from_lower = from_email.lower()
    body_lower = body.lower()
    
    # Allow legitimate purchase emails from known vendors
    legitimate_purchase_vendors = [
        'swiggy', 'zomato', 'amazon', 'myntra', 'flipkart', 'cred', 'oyorooms',
        'uber', 'ola', 'bookmyshow', 'paytm', 'phonepe', 'gpay', 'razorpay',
        'district', 'ticketnew', 'atomberg', 'austin wood', 'kwa'
    ]
    
    # Check if this is from a legitimate purchase vendor
    for vendor in legitimate_purchase_vendors:
        if vendor in from_lower:
            # Only mark as promotional if it contains clear promotional keywords
            promotional_subject_keywords = [
                'newsletter', 'update', 'offers', 'deals', 'discount', 'sale',
                'promotion', 'subscription', 'member', 'unsubscribe'
            ]
            for keyword in promotional_subject_keywords:
                if keyword in subject_lower:
                    return True
            # If it's from a legitimate vendor and doesn't have promotional keywords, allow it
            return False
    
    # Allow forwarded purchase emails (common pattern: "Fwd: ... order ... delivered/invoice/confirmation")
    if subject_lower.startswith('fwd:') or subject_lower.startswith('re:'):
        purchase_keywords = [
            'order', 'delivered', 'invoice', 'confirmation', 'purchase', 'payment',
            'booking', 'ticket', 'warranty', 'water charges', 'myntra', 'flipkart',
            'atomberg', 'austin wood', 'district', 'ticketnew'
        ]
        for keyword in purchase_keywords:
            if keyword in subject_lower:
                return False
    
    # Promotional keywords in subject (excluding legitimate order-related terms)
    promotional_keywords = [
        'member', 'subscription', 'newsletter', 'update', 
        'scheme', 'arrangement', 'price drop', 'price alert', 'deals', 'discount', 
        'savings', 'festival', 'tourism', 'career', 'job', 'interview', 'opportunity',
        'tech news', 'daily', 'followup', 'ticket received', 'service completed',
        'loan disbursed', 'amortization', 'travel policy', 'insurance', 'notification',
        'commented', 'posted', 'shared', 'sale', 'offer', 'promotion', 'live',
        'edition', 'grab', 'off', 'trendiest', 'marketplace', 'seller', 'discretion',
        'good news', 'bearing', 'issue', 'call', 'api', 'rush',
        'congratulations', 'policy issued',
        'we come bearing', 'one call', 'your api', 'coin rush', 'top price drops',
        'extended warranty', 'cancellation request', 'followup email', 'ticket received',
        'business associate', 'zoom interview', 'microsoft internships', 'bytepe iphone',
        'openai workflow', 'cloud, ai apps', 'voice mode', 'broadband bill', 'due soon',
        'payment reminder', 'you are now a', 'member', 'payment failed', 'your opinion matters',
        'help make', 'feedback matters', 'update profile', 'up to 60% off',
        'savings alert', 'great indian festival', 'live now', 'arriving today',
        'one-time password', 'for software professionals', 'for it professionals',
        'python developer opportunity', 'closure of request', 'your feedback matters',
        'wazirx', 'proposed scheme', 'scheme creditors', 'zettai pte ltd',
        'royal sundaram general insurance', 'travel policy is issued', 'pnr no',
        'kb250414khiwa', 'loan disbursed successfully', 'insta jumbo loan',
        'amortization schedule', 'hdfcbank', 'swiggy one member', 'cred coin rush',
        'agoda price alerts', 'top price drops', 'bangalore', 'selected for you',
        'team acko', 'extended warranty', 'cancellation request', 'order id',
        'foundit', 'business associate', 'alza inc', 'zoom interview',
        'techgig latest news', 'microsoft internships', 'bytepe iphone', 'subscription',
        'openai workflow battle', 'lovable update', 'cloud, ai apps', 'voice mode',
        'cred', 'broadband bill', 'due soon', 'amazon pay india', 'payment reminder',
        'shiprocket', 'cred coin rush order', 'delivered', 'out for delivery',
        'reached your city', 'shipped', 'picked', 'hirist', 'flobiz', 'software development',
        'frontend technologies', 'sbilife', 'service touch points', 'amazon services',
        'washing machine installation', 'service completed', 'lg', 'national career service',
        'ncs', 'update profile', 'agoda deals', 'world tourism day', 'up to 60% off',
        'offers sbicard', 'savings alert', 'rs. 6,000 off', 'apple products',
        'amazon great indian festival', 'live now', 'indeed', 'apply to jobs',
        'cordova educational solutions', 'orison solutions llc', 'docme cloud solutions',
        'thekkady', 'amazon.in', 'order-update', 'package has been delivered',
        'shipment-tracking', 'one-time password', 'amazon delivery', 'countrywide immigration',
        'software professionals', 'canada', 'australia', 'ctc', 'indian rupees',
        'sentient scripts', 'python developer', 'believe in your potential',
        'it professionals', 'customercare', 'sbicard', 'closure of request',
        'noreply', 'swiggy', 'payment failed', 'order', 'alert', 'amazon pay',
        'csat.feedback', 'sbicard', 'opinion matters', 'amazon', 'help make',
        'amazon pay better', 'feedback matters', 'shiprocket', 'cred coin rush',
        'order has been picked', 'them', 'proposed scheme', 'arrangement',
        'scheme creditors', 'zettai pte ltd', 'company', 'unknown vendor',
        'swiggy order', 'delivered before time'
    ]
    
    # Check subject for promotional keywords
    for keyword in promotional_keywords:
        if keyword in subject_lower:
            return True
    
    # Promotional vendors (excluding legitimate purchase vendors)
    promotional_vendors = [
        'stackoverflow', 'shiprocket', 'agoda', 'acko',
        'foundit', 'techgig', 'lovable', 'hirist', 'sbilife',
        'indeed', 'wazirx', 'facebook', 'naukri', 'microsoft',
        'royal sundaram', 'hdfc', 'kbnbfc', 'term loans', 'sbicard', 'noreply',
        'no-reply', 'noreply-ncs', 'customercare', 'csat.feedback', 'them',
        'crm@em.oyorooms.com', 'do-not-reply@hello.stackoverflow.email',
        'info@net.shiprocket.in', 'no-reply@sg.newsletter.agoda-emails.com',
        'ecare@acko.tech', 'opportunities@foundit.in', 'technews@techgig.com',
        'hi@lovable.dev', 'protect@cred.club', 'no-reply@amazonpay.in',
        'noreply@sbilife.co.in', 'noreply-ncs@gov.in',
        'no-reply@sg.newsletter.agoda-emails.com', 'offers@sbicard.com',
        'alert@indeed.com', 'customercare@sbicard.com', 'csat.feedback@sbicard.com',
        'noreply.irctc@royalsundaram.in', 'no-reply@kbnbfc.in',
        'termloans.creditcard@hdfcbank.net', 'noreply@wazirx.com'
    ]
    
    # Check from email for promotional vendors
    for vendor in promotional_vendors:
        if vendor in from_lower:
            return True
    
    # Check body content for promotional keywords
    promotional_body_keywords = [
        'unsubscribe', 'marketing', 'promotional', 'newsletter', 'offers',
        'deals', 'discount', 'sale', 'promotion', 'subscribe', 'opt out',
        'marketing email', 'commercial', 'advertisement', 'sponsored',
        'click here', 'learn more', 'find out more', 'don\'t miss out',
        'limited time', 'exclusive offer', 'special deal', 'save money',
        'price drop', 'flash sale', 'clearance', 'bargain', 'discount code',
        'coupon', 'voucher', 'free shipping', 'buy now', 'shop now',
        'order now', 'get it now', 'limited offer', 'while supplies last',
        'act now', 'don\'t wait', 'hurry up', 'last chance', 'final days',
        'ending soon', 'expires soon', 'valid until', 'terms and conditions',
        'privacy policy', 'unsubscribe from', 'manage preferences',
        'email preferences', 'marketing communications', 'promotional content'
    ]
    
    for keyword in promotional_body_keywords:
        if keyword in body_lower:
            return True
    
    return False

@app.post("/process-email-data")
async def process_email_data(request: Request):
    """
    Process email data with PDF attachments from frontend
    """
    try:
        data = await request.json()
        email_data = data.get('email_data', {})
        process_all_attachments = data.get('process_all_attachments', True)

        # Log email processing start
        message_id = email_data.get('messageId', 'unknown')
        subject = email_data.get('subject', 'N/A')
        from_email = email_data.get('from', 'N/A')
        attachment_count = len(email_data.get('pdfAttachments', []))
        
        logger.info(f"📧 EMAIL_PROCESSING_START: {message_id}")
        logger.info(f"   Subject: {subject[:50]}{'...' if len(subject) > 50 else ''}")
        logger.info(f"   From: {from_email}")
        logger.info(f"   Attachments: {attachment_count}")
        
        # Check if this email was already processed recently
        if message_id in processed_emails:
            logger.info(f"🔄 EMAIL_CACHED: {message_id} - returning cached result")
            return processed_emails[message_id]
        
        # Check if this is a credit card statement and skip processing
        if is_credit_card_statement(email_data.get('subject', ''), email_data.get('from', ''), email_data.get('body', '')):
            logger.info(f"🚫 EMAIL_SKIPPED: {message_id} - Credit card statement")
            return {
                "success": True,
                "data": {
                    "vendor": email_data.get('from'),
                    "amount": 0,
                    "date": email_data.get('date'),
                    "document_type": "credit_card_statement",
                    "confidence": 0.0,
                    "skipped": True,
                    "reason": "Credit card statement excluded from processing"
                },
                "message": "Credit card statement skipped"
            }
        
        # Check if this is a promotional email and skip processing
        if is_promotional_email(subject, from_email, email_data.get('body', '')):
            logger.info(f"🚫 EMAIL_SKIPPED: {message_id} - Promotional email")
            return {
                "success": True,
                "data": {
                    "vendor": from_email,
                    "amount": 0,
                    "date": email_data.get('date'),
                    "document_type": "promotional_email",
                    "confidence": 0.0,
                    "skipped": True,
                    "reason": "Promotional email excluded from processing"
                },
                "message": "Promotional email skipped"
            }
        
        # Additional check: Skip emails that are clearly promotional based on subject patterns
        promotional_subject_patterns = [
            'newsletter', 'daily digest', 'weekly update', 'job alert', 'career opportunity',
            'price drop', 'top price drops', 'selected for you', 'we come bearing',
            'followup email', 'ticket received', 'service completed', 'policy issued',
            'scheme arrangement', 'loan disbursed', 'amortization schedule'
        ]

        subject_lower = subject.lower()
        for pattern in promotional_subject_patterns:
            if pattern in subject_lower:
                logger.info(f"🚫 EMAIL_SKIPPED: {message_id} - Subject pattern: {pattern}")
                return {
                    "success": True,
                    "data": {
                        "vendor": from_email,
                        "amount": 0,
                        "date": email_data.get('date'),
                        "document_type": "promotional_email",
                        "confidence": 0.0,
                        "skipped": True,
                        "reason": f"Promotional email pattern matched: {pattern}"
                    },
                    "message": "Promotional email skipped"
                }

        if not email_data:
            raise HTTPException(status_code=400, detail="No email data provided")
        
        results = []
        errors = []
        
        # Process each PDF attachment
        pdf_attachments = email_data.get('pdfAttachments', [])
        logger.info(f"📄 Processing {len(pdf_attachments)} PDF attachments")
        
        if not pdf_attachments:
            logger.info("⚠️ No PDF attachments found, returning basic email data")
            # Return a basic response for emails without PDF attachments
            return {
                "success": True,
                "data": {
                    "document_type": "email",
                    "filename": "email_content",
                    "vendor": email_data.get('from', 'Unknown'),
                    "amount": 0.0,
                    "date": email_data.get('date'),
                    "invoice_number": None,
                    "invoice_data": None,
                    "warranty_data": None,
                    "refund_data": None,
                    "raw_text": email_data.get('body', ''),
                    "confidence": 0.3,
                    "email_context": {
                        'messageId': email_data.get('messageId'),
                        'subject': email_data.get('subject'),
                        'from': email_data.get('from'),
                        'date': email_data.get('date'),
                        'body': email_data.get('body', '')[:500]
                    }
                },
                "errors": [],
                "processed_count": 0,
                "total_attachments": 0
            }
        
        for attachment in pdf_attachments:
            try:
                # Decode base64 PDF data with proper padding
                pdf_data_str = attachment['data']
                
                # Add padding if needed
                missing_padding = len(pdf_data_str) % 4
                if missing_padding:
                    pdf_data_str += '=' * (4 - missing_padding)
                
                # Decode base64 with error handling
                try:
                    pdf_data = base64.b64decode(pdf_data_str)
                    logger.info(f"✅ Successfully decoded PDF: {attachment['filename']} ({len(pdf_data)} bytes)")
                except Exception as decode_error:
                    logger.error(f"❌ Base64 decode error for {attachment['filename']}: {str(decode_error)}")
                    # Try with URL-safe base64 decoding
                    try:
                        pdf_data = base64.urlsafe_b64decode(pdf_data_str)
                        logger.info(f"✅ Successfully decoded PDF with URL-safe method: {attachment['filename']} ({len(pdf_data)} bytes)")
                    except Exception as url_decode_error:
                        logger.error(f"❌ URL-safe base64 decode also failed for {attachment['filename']}: {str(url_decode_error)}")
                        errors.append(f"{attachment['filename']}: Base64 decode failed - {str(decode_error)}")
                        continue
                
                # Save to temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                    tmp_file.write(pdf_data)
                    tmp_file_path = tmp_file.name
                
                try:
                    # Parse PDF
                    logger.info(f"Processing PDF from email: {attachment['filename']}")
                    pdf_parsed = pdf_parser.parse_pdf(tmp_file_path)
                    
                    # Try to extract structured data
                    try:
                        extracted_data = data_extractor.extract_from_pdf(pdf_parsed, attachment['filename'])
                    except Exception as e:
                        logger.warning(f"Data extractor failed, using custom parser: {str(e)}")
                        # Fallback to custom parser using raw text
                        raw_text = pdf_parsed.get('raw_text', '') or pdf_parsed.get('cleaned_text', '')
                        if raw_text:
                            custom_data = custom_parser.parse_invoice_data(raw_text, attachment['filename'])
                        else:
                            # If no text extracted, create basic response
                            custom_data = custom_parser.parse_invoice_data("", attachment['filename'])
                        
                        # Convert custom parser result to DocumentData
                        extracted_data = DocumentData(
                            document_type=custom_data.get('document_type', 'invoice'),
                            filename=attachment['filename'],
                            vendor=custom_data.get('vendor', 'Unknown'),
                            amount=custom_data.get('amount', 0.0),
                            date=custom_data.get('date'),
                            invoice_number=custom_data.get('invoice_number'),
                            raw_text=custom_data.get('raw_text', ''),
                            confidence=custom_data.get('confidence', 0.3)
                        )
                    
                    # Add email context to the result
                    extracted_data.email_context = {
                        'messageId': email_data.get('messageId'),
                        'subject': email_data.get('subject'),
                        'from': email_data.get('from'),
                        'date': email_data.get('date'),
                        'body': email_data.get('body', '')[:500]  # First 500 chars of email body
                    }
                    
                    # Add attachment metadata for download/preview
                    extracted_data.attachment_metadata = {
                        'attachmentId': attachment.get('attachmentId'),
                        'filename': attachment.get('filename'),
                        'mimeType': attachment.get('mimeType', 'application/pdf'),
                        'size': len(pdf_data) if 'pdf_data' in locals() else 0
                    }
                    
                    results.append(extracted_data)
                    logger.info(f"Successfully processed: {attachment['filename']}")
                    
                    # Log detailed response for each invoice
                    # Log successful document processing
                    logger.info(f"✅ DOCUMENT_PARSED: {attachment['filename']} - {extracted_data.vendor} - ₹{extracted_data.amount}")
                    
                except Exception as e:
                    logger.error(f"Error processing PDF {attachment['filename']}: {str(e)}")
                    errors.append(f"{attachment['filename']}: {str(e)}")
                
                finally:
                    # Clean up temp file
                    if os.path.exists(tmp_file_path):
                        os.unlink(tmp_file_path)
                
            except Exception as e:
                logger.error(f"Error processing attachment {attachment.get('filename', 'unknown')}: {str(e)}")
                errors.append(f"{attachment.get('filename', 'unknown')}: {str(e)}")
                # Continue processing other attachments instead of failing completely
        
        # If no results but we have errors, return a basic response instead of failing
        if not results and errors:
            logger.warning(f"All attachments failed to process, returning basic email data. Errors: {errors}")
            return {
                "success": True,
                "data": {
                    "document_type": "email",
                    "filename": "email_content",
                    "vendor": email_data.get('from', 'Unknown'),
                    "amount": 0.0,
                    "date": email_data.get('date'),
                    "invoice_number": None,
                    "invoice_data": None,
                    "warranty_data": None,
                    "refund_data": None,
                    "raw_text": email_data.get('body', ''),
                    "confidence": 0.2,
                    "email_context": {
                        'messageId': email_data.get('messageId'),
                        'subject': email_data.get('subject'),
                        'from': email_data.get('from'),
                        'date': email_data.get('date'),
                        'body': email_data.get('body', '')[:500]
                    }
                },
                "errors": errors,
                "processed_count": 0,
                "total_attachments": len(pdf_attachments)
            }
        
        # Deduplicate results based on messageId and filename
        seen_docs = set()
        unique_results = []
        
        for result in results:
            # Create a unique key based on messageId and filename
            doc_key = f"{result.email_context.get('messageId', 'unknown') if result.email_context else 'unknown'}_{result.attachment_metadata.get('filename', 'unknown') if result.attachment_metadata else 'unknown'}"
            
            if doc_key not in seen_docs:
                seen_docs.add(doc_key)
                unique_results.append(result)
        
        # Log deduplication summary only if there were duplicates
        if len(results) != len(unique_results):
            logger.info(f"📊 Deduplication: {len(results)} total -> {len(unique_results)} unique results")
        
        # Log email parsing completion
        total_amount = sum(result.amount for result in unique_results if result.amount)
        vendors = [result.vendor for result in unique_results if result.vendor]
        
        logger.info(f"✅ EMAIL_PARSED: {message_id}")
        logger.info(f"   Documents: {len(unique_results)}")
        logger.info(f"   Total Amount: ₹{total_amount}")
        logger.info(f"   Vendors: {', '.join(vendors[:3])}{'...' if len(vendors) > 3 else ''}")
        
        # Prepare response
        if process_all_attachments:
            response = {
                "success": True,
                "data": unique_results[0] if unique_results else None,
                "all_results": unique_results,
                "errors": errors,
                "processed_count": len(unique_results),
                "total_attachments": len(pdf_attachments),
                "duplicates_removed": len(results) - len(unique_results)
            }
        else:
            response = {
                "success": True,
                "data": unique_results[0] if unique_results else None,
                "errors": errors,
                "processed_count": len(unique_results),
                "duplicates_removed": len(results) - len(unique_results)
            }
        
        # Cache the result to prevent duplicate processing
        processed_emails[message_id] = response
        logger.info(f"💾 Cached result for email {message_id}")
        
        # Clean up cache if it gets too large
        if len(processed_emails) > MAX_CACHE_SIZE:
            # Remove oldest entries (simple FIFO)
            oldest_keys = list(processed_emails.keys())[:len(processed_emails) - MAX_CACHE_SIZE + 100]
            for key in oldest_keys:
                del processed_emails[key]
            logger.info(f"🧹 Cleaned up cache, removed {len(oldest_keys)} old entries")
        
        return response
            
    except Exception as e:
        logger.error(f"Error processing email data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing email data: {str(e)}")

@app.post("/analyze-warranty", response_model=WarrantyAnalysisResult)
async def analyze_warranty(file: UploadFile = File(...)):
    """
    Analyze PDF specifically for warranty information
    """
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Parse PDF
            logger.info(f"Analyzing warranty in PDF: {file.filename}")
            pdf_data = pdf_parser.parse_pdf(tmp_file_path)
            
            # Extract warranty-specific data
            warranty_analysis = data_extractor.analyze_warranty(pdf_data, file.filename)
            
            # Clean up temp file
            os.unlink(tmp_file_path)
            
            return warranty_analysis
            
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
            raise e
            
    except Exception as e:
        logger.error(f"Error analyzing warranty in PDF {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing warranty: {str(e)}")

@app.post("/batch-warranty-analysis")
async def batch_warranty_analysis(files: List[UploadFile] = File(...)):
    """
    Analyze multiple PDFs for warranty information
    """
    start_time = datetime.now()
    results = []
    errors = []
    warranty_count = 0
    
    for file in files:
        try:
            if not file.filename.lower().endswith('.pdf'):
                errors.append(f"{file.filename}: Not a PDF file")
                continue
                
            # Save uploaded file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_file_path = tmp_file.name
            
            try:
                # Parse PDF
                pdf_data = pdf_parser.parse_pdf(tmp_file_path)
                extracted_data = data_extractor.extract_from_pdf(pdf_data, file.filename)
                
                # Check if warranty data exists
                if extracted_data.warranty_data:
                    warranty_count += 1
                
                results.append(extracted_data)
                
                # Clean up temp file
                os.unlink(tmp_file_path)
                
            except Exception as e:
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)
                errors.append(f"{file.filename}: {str(e)}")
                
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")
    
    processing_time = (datetime.now() - start_time).total_seconds()
    
    return BatchProcessingResult(
        total_documents=len(files),
        processed_documents=len(results),
        successful_extractions=len([r for r in results if r.confidence > 0.5]),
        warranty_documents=warranty_count,
        failed_documents=len(errors),
        results=results,
        errors=errors,
        processing_time=processing_time
    )

@app.get("/supported-formats", response_model=SupportedFormatsResponse)
async def get_supported_formats():
    """
    Get list of supported document formats and types
    """
    return SupportedFormatsResponse(
        supported_formats=[".pdf"],
        document_types=[
            "invoice", "receipt", "warranty", "refund", "payment_confirmation",
            "order_confirmation", "delivery_confirmation", "bill", "statement"
        ],
        extraction_capabilities=[
            "vendor_name", "amount", "date", "invoice_number", "product_details",
            "warranty_period", "refund_amount", "payment_method", "tax_amount",
            "discount", "shipping_cost", "total_amount"
        ],
        warranty_analysis_features=[
            "warranty_period_extraction", "expiry_date_calculation", 
            "warranty_status_detection", "coverage_analysis",
            "risk_assessment", "expiry_warnings", "contact_information_extraction"
        ]
    )

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    )

