#!/usr/bin/env python3
"""
Custom Invoice Parser - No External Libraries
Pure Python implementation for extracting invoice data
"""

import re
import json
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import base64
import io

class CustomInvoiceParser:
    def __init__(self):
        # Currency patterns for Indian Rupees
        self.currency_patterns = [
            r'₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'INR\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*rupees?',
            r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*₹',
            r'Amount[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Total[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Paid[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Price[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Cost[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Value[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Bill[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Invoice[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Receipt[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        ]
        
        # Date patterns
        self.date_patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})',
            r'(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4})',
            r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
            r'(?:Date|Dated?)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(?:Date|Dated?)[:\s]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})',
        ]
        
        # Invoice number patterns
        self.invoice_patterns = [
            r'Invoice\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'Bill\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'Order\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'Receipt\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'Transaction\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'Ref\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'ID\s*:?\s*([A-Z0-9\-]+)',
            r'#\s*([A-Z0-9\-]+)',
        ]
        
        # Vendor/company patterns
        self.vendor_patterns = [
            r'From[:\s]*([A-Za-z\s&\.]+)',
            r'Vendor[:\s]*([A-Za-z\s&\.]+)',
            r'Company[:\s]*([A-Za-z\s&\.]+)',
            r'Merchant[:\s]*([A-Za-z\s&\.]+)',
            r'Bill\s+To[:\s]*([A-Za-z\s&\.]+)',
            r'Invoice\s+From[:\s]*([A-Za-z\s&\.]+)',
            r'^([A-Za-z\s&\.]+)\s*$',  # Line with only company name
        ]
        
        # Product patterns - more specific to avoid false matches
        self.product_patterns = [
            r'(\d+)\s*x\s*([A-Za-z0-9\s\-\.]+?)\s*₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'([A-Za-z0-9\s\-\.]+?)\s*₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Item[:\s]*([A-Za-z0-9\s\-\.]+?)\s*₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Product[:\s]*([A-Za-z0-9\s\-\.]+?)\s*₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        ]
        
        # Tax patterns
        self.tax_patterns = [
            r'Tax[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'GST[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'CGST[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'SGST[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'IGST[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'VAT[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Service\s+Tax[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        ]
        
        # Payment method patterns
        self.payment_patterns = [
            r'Credit\s+Card',
            r'Debit\s+Card',
            r'UPI',
            r'Paytm',
            r'PhonePe',
            r'Google\s+Pay',
            r'Net\s+Banking',
            r'Cash',
            r'Cheque',
            r'Bank\s+Transfer',
            r'Wallet',
            r'COD',
            r'Cash\s+on\s+Delivery',
        ]
        
        # Warranty patterns
        self.warranty_patterns = [
            r'(\d+)\s*(?:year|yr|month|mo|day|d)\s*warranty',
            r'warranty[:\s]*(\d+)\s*(?:year|yr|month|mo|day|d)',
            r'(\d+)\s*(?:year|yr|month|mo|day|d)\s*coverage',
            r'warranty\s+period[:\s]*(\d+)\s*(?:year|yr|month|mo|day|d)',
        ]

    def parse_invoice_data(self, text: str, filename: str = "") -> Dict[str, Any]:
        """
        Parse invoice data from text using custom patterns
        """
        if not text or len(text.strip()) < 10:
            return self._create_empty_response(filename)
        
        # Clean text
        cleaned_text = self._clean_text(text)
        
        # Extract basic information
        vendor = self._extract_vendor(cleaned_text)
        amount = self._extract_amount(cleaned_text)
        date = self._extract_date(cleaned_text)
        invoice_number = self._extract_invoice_number(cleaned_text)
        
        # Extract products
        products = self._extract_products(cleaned_text)
        
        # Extract taxes
        tax_amount = self._extract_tax_amount(cleaned_text)
        
        # Extract payment method
        payment_method = self._extract_payment_method(cleaned_text)
        
        # Extract shipping cost
        shipping_cost = self._extract_shipping_cost(cleaned_text)
        
        # Extract discount
        discount = self._extract_discount(cleaned_text)
        
        # Extract warranty information
        warranty_data = self._extract_warranty_data(cleaned_text)
        
        # Determine document type
        document_type = self._classify_document(cleaned_text, filename)
        
        # Calculate confidence
        confidence = self._calculate_confidence(cleaned_text, amount, invoice_number, vendor)
        
        return {
            "document_type": document_type,
            "filename": filename,
            "vendor": vendor,
            "amount": amount,
            "date": date,
            "invoice_number": invoice_number,
            "invoice_data": {
                "products": products,
                "tax_amount": tax_amount,
                "payment_method": payment_method,
                "shipping_cost": shipping_cost,
                "discount": discount,
                "total_amount": amount
            },
            "warranty_data": warranty_data,
            "raw_text": cleaned_text[:1000] + "..." if len(cleaned_text) > 1000 else cleaned_text,
            "confidence": confidence,
            "processing_time": None,
            "metadata": {
                "parser": "custom_python",
                "extraction_method": "pattern_matching",
                "text_length": len(cleaned_text)
            }
        }

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s₹.,:;()\-/]', ' ', text)
        # Normalize currency symbols
        text = re.sub(r'[₹]', '₹', text)
        return text.strip()

    def _extract_vendor(self, text: str) -> str:
        """Extract vendor/company name"""
        # First try the existing patterns
        for pattern in self.vendor_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                vendor = match.strip()
                if len(vendor) > 3 and len(vendor) < 100:
                    return vendor
        
        # Enhanced vendor extraction for forwarded emails and subjects
        forwarded_vendor_patterns = [
            r'(?:with|from|at)\s+([A-Za-z\s&\.\-]+?)(?:\s+is\s+delivered|\s+order|\s+invoice|\s+confirmation)',
            r'(?:order|invoice|confirmation)\s+(?:for|with)\s+([A-Za-z\s&\.\-]+?)(?:\s+order|\s+delivered|\s+confirmation)',
            r'([A-Za-z\s&\.\-]+?)\s*-\s*(?:order|invoice|confirmation|delivered)',
            r'(?:KWA|AUSTIN\s+WOOD|ATOMBERG|DISTRICT|PHONEPE|MYNTRA|FLIPKART|AMAZON)',
            r'([A-Za-z\s&\.\-]+?)\s*:\s*(?:payment|fees|charges)',
        ]
        
        for pattern in forwarded_vendor_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                vendor = match.group(1).strip()
                # Clean up common prefixes/suffixes
                vendor = re.sub(r'^(with|from|at|order|invoice|confirmation|for)\s+', '', vendor, flags=re.IGNORECASE)
                vendor = re.sub(r'\s+(is\s+delivered|order|invoice|confirmation|delivered)$', '', vendor, flags=re.IGNORECASE)
                if len(vendor) > 2 and len(vendor) < 50:
                    return vendor.title()
        
        # Try to extract from first few lines
        lines = text.split('\n')[:5]
        for line in lines:
            line = line.strip()
            if len(line) > 5 and len(line) < 50:
                if re.match(r'^[A-Za-z\s&\.]+$', line) and not re.search(r'\d', line):
                    return line
        
        return "Unknown Vendor"

    def _extract_amount(self, text: str) -> float:
        """Extract monetary amount"""
        amounts = []
        
        # Enhanced currency patterns for better amount detection
        enhanced_patterns = self.currency_patterns + [
            r'Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',  # Rs. 774
            r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*rupees?',  # 774 rupees
            r'payment\s+of\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',  # payment of Rs. 774
            r'fees\s+payment[:\s]*Rs?\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',  # fees payment: Rs. 500
            r'charges\s+of\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',  # charges of Rs. 774
            r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*/-',  # 774/-
            r'₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',  # ₹774
        ]
        
        for pattern in enhanced_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    amount_str = match.replace(',', '').strip()
                    amount = float(amount_str)
                    if amount > 0:
                        amounts.append(amount)
                except ValueError:
                    continue
        
        if amounts:
            # Return the highest amount found (usually the total)
            return max(amounts)
        
        return 0.0

    def _extract_date(self, text: str) -> Optional[str]:
        """Extract date from text"""
        for pattern in self.date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    # Try to parse the date
                    date_str = match.strip()
                    if '/' in date_str:
                        parts = date_str.split('/')
                        if len(parts) == 3:
                            # Handle different date formats
                            if len(parts[2]) == 2:
                                parts[2] = '20' + parts[2]
                            return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                    elif '-' in date_str:
                        parts = date_str.split('-')
                        if len(parts) == 3:
                            if len(parts[2]) == 2:
                                parts[2] = '20' + parts[2]
                            return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                except:
                    continue
        
        return None

    def _extract_invoice_number(self, text: str) -> Optional[str]:
        """Extract invoice/bill number"""
        for pattern in self.invoice_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                invoice_num = match.strip()
                if len(invoice_num) > 2:
                    return invoice_num
        
        return None

    def _extract_products(self, text: str) -> List[Dict[str, Any]]:
        """Extract product details"""
        products = []
        
        # Look for specific product patterns in lines
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line or len(line) < 10:
                continue
                
            # Pattern 1: "1x Product Name - ₹500.00"
            match = re.search(r'(\d+)\s*x\s*([A-Za-z0-9\s\-\.]+?)\s*-\s*₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', line)
            if match:
                try:
                    products.append({
                        "quantity": int(match.group(1)),
                        "name": match.group(2).strip(),
                        "price": float(match.group(3).replace(',', ''))
                    })
                    continue
                except ValueError:
                    pass
            
            # Pattern 2: "Product Name ₹500.00" (without quantity)
            match = re.search(r'^([A-Za-z0-9\s\-\.]+?)\s*₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)$', line)
            if match and not any(word in line.lower() for word in ['total', 'subtotal', 'gst', 'tax', 'shipping', 'discount']):
                try:
                    products.append({
                        "quantity": 1,
                        "name": match.group(1).strip(),
                        "price": float(match.group(2).replace(',', ''))
                    })
                except ValueError:
                    pass
        
        return products

    def _extract_tax_amount(self, text: str) -> float:
        """Extract tax amount"""
        for pattern in self.tax_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    return float(match.replace(',', ''))
                except ValueError:
                    continue
        
        return 0.0

    def _extract_payment_method(self, text: str) -> Optional[str]:
        """Extract payment method"""
        text_lower = text.lower()
        for method in self.payment_patterns:
            if re.search(method, text_lower):
                return method.title()
        
        return None

    def _extract_shipping_cost(self, text: str) -> float:
        """Extract shipping cost"""
        shipping_patterns = [
            r'Shipping[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Delivery[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Freight[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        ]
        
        for pattern in shipping_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(',', ''))
                except ValueError:
                    continue
        
        return 0.0

    def _extract_discount(self, text: str) -> float:
        """Extract discount amount"""
        discount_patterns = [
            r'Discount[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Off[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Deduction[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        ]
        
        for pattern in discount_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(',', ''))
                except ValueError:
                    continue
        
        return 0.0

    def _extract_warranty_data(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract warranty information"""
        warranty_info = {}
        
        # Extract warranty period
        for pattern in self.warranty_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                warranty_info["warranty_period"] = match.group(0)
                break
        
        # Extract product name for warranty
        product_patterns = [
            r'Product[:\s]*([A-Za-z0-9\s\-\.]+)',
            r'Item[:\s]*([A-Za-z0-9\s\-\.]+)',
            r'Model[:\s]*([A-Za-z0-9\s\-\.]+)',
        ]
        
        for pattern in product_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                warranty_info["product_name"] = match.group(1).strip()
                break
        
        # Check warranty status
        if 'warranty' in text.lower() or 'guarantee' in text.lower():
            warranty_info["warranty_status"] = "active"
        else:
            warranty_info["warranty_status"] = "unknown"
        
        return warranty_info if warranty_info else None

    def _classify_document(self, text: str, filename: str) -> str:
        """Classify document type"""
        text_lower = text.lower()
        filename_lower = filename.lower()
        
        # Check for warranty keywords
        warranty_keywords = ['warranty', 'guarantee', 'warrant', 'coverage']
        warranty_score = sum(1 for keyword in warranty_keywords if keyword in text_lower)
        if warranty_score >= 2 or 'warranty' in filename_lower:
            return 'warranty'
        
        # Check for refund keywords
        refund_keywords = ['refund', 'return', 'money back', 'reimbursement']
        refund_score = sum(1 for keyword in refund_keywords if keyword in text_lower)
        if refund_score >= 2 or 'refund' in filename_lower:
            return 'refund'
        
        # Check for invoice keywords
        invoice_keywords = ['invoice', 'bill', 'receipt', 'payment', 'order']
        invoice_score = sum(1 for keyword in invoice_keywords if keyword in text_lower)
        if invoice_score >= 2 or any(word in filename_lower for word in ['invoice', 'bill', 'receipt']):
            return 'invoice'
        
        return 'document'

    def _calculate_confidence(self, text: str, amount: float, invoice_number: Optional[str], vendor: str) -> float:
        """Calculate confidence score based on extracted data quality"""
        confidence = 0.0
        
        # Base confidence
        if len(text) > 50:
            confidence += 0.2
        
        # Amount found
        if amount > 0:
            confidence += 0.3
        
        # Invoice number found
        if invoice_number:
            confidence += 0.2
        
        # Vendor found (not unknown)
        if vendor != "Unknown Vendor":
            confidence += 0.2
        
        # Text quality indicators
        if '₹' in text or 'rupee' in text.lower():
            confidence += 0.1
        
        return min(confidence, 1.0)

    def _create_empty_response(self, filename: str) -> Dict[str, Any]:
        """Create empty response when no data is extracted"""
        return {
            "document_type": "document",
            "filename": filename,
            "vendor": "Unknown Vendor",
            "amount": 0.0,
            "date": None,
            "invoice_number": None,
            "invoice_data": {
                "products": [],
                "tax_amount": 0.0,
                "payment_method": None,
                "shipping_cost": 0.0,
                "discount": 0.0,
                "total_amount": 0.0
            },
            "warranty_data": None,
            "raw_text": "",
            "confidence": 0.1,
            "processing_time": None,
            "metadata": {
                "parser": "custom_python",
                "extraction_method": "no_data",
                "text_length": 0
            }
        }

# Test function
def test_parser():
    parser = CustomInvoiceParser()
    
    sample_invoice = """
    INVOICE #INV-2024-001
    Amazon India Private Limited
    Date: January 15, 2024
    
    Bill To:
    John Doe
    123 Main Street
    Mumbai, Maharashtra 400001
    
    Items:
    1x Wireless Headphones - ₹2,500.00
    1x Phone Case - ₹500.00
    1x Screen Protector - ₹200.00
    
    Subtotal: ₹3,200.00
    GST (18%): ₹576.00
    Shipping: ₹0.00
    Total Amount: ₹3,776.00
    
    Payment Method: Credit Card
    Order Number: ORD-2024-001
    
    Warranty: 1 year manufacturer warranty on all electronics
    Return Policy: 30 days return window
    """
    
    result = parser.parse_invoice_data(sample_invoice, "test_invoice.pdf")
    print("Custom Parser Test Result:")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    test_parser()
