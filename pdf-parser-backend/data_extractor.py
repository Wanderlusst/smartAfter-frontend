import re
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import dateparser
from decimal import  InvalidOperation
from models import (
    DocumentData, InvoiceData, WarrantyData, RefundData, 
    WarrantyAnalysisResult
)

logger = logging.getLogger(__name__)

class DataExtractor:
    def __init__(self):
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
            r'Order[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Payment[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Charges[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Fees[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*/-',  # Common Indian format
            r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*INR',
            r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*Rs',
        ]
        
        self.date_patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})',
            r'(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4})',
            r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
            r'(?:Date|Dated?)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(?:Date|Dated?)[:\s]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})',
        ]
        
        self.invoice_patterns = [
            r'Invoice\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'Bill\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'Order\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'Receipt\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'Transaction\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'Ref\s*#?\s*:?\s*([A-Z0-9\-]+)',
            r'ID\s*:?\s*([A-Z0-9\-]+)',
        ]
        
        self.vendor_patterns = [
            r'From[:\s]*([A-Za-z\s&\.]+)',
            r'Vendor[:\s]*([A-Za-z\s&\.]+)',
            r'Company[:\s]*([A-Za-z\s&\.]+)',
            r'Merchant[:\s]*([A-Za-z\s&\.]+)',
            r'Bill\s+To[:\s]*([A-Za-z\s&\.]+)',
            r'Invoice\s+From[:\s]*([A-Za-z\s&\.]+)',
        ]
        
        self.warranty_keywords = [
            'warranty', 'guarantee', 'warrant', 'coverage', 'protection',
            'extended warranty', 'manufacturer warranty', 'seller warranty',
            'warranty period', 'warranty terms', 'warranty conditions'
        ]
        
        self.refund_keywords = [
            'refund', 'return', 'money back', 'reimbursement', 'repayment',
            'refund processed', 'refund amount', 'refund policy',
            'return policy', 'cancellation', 'void'
        ]
        
        self.invoice_keywords = [
            'invoice', 'bill', 'receipt', 'payment', 'order', 'purchase',
            'invoice number', 'bill number', 'receipt number', 'order number',
            'payment confirmation', 'order confirmation', 'purchase confirmation'
        ]
    
    def extract_from_pdf(self, pdf_data: Dict[str, Any], filename: str) -> DocumentData:
        """Extract all types of data from PDF"""
        text = pdf_data.get('cleaned_text', '')
        
        # Determine document type
        doc_type = self._classify_document(text, filename)
        
        # Extract common data
        vendor = self._extract_vendor(text)
        amount = self._extract_amount(text)
        date = self._extract_date(text)
        invoice_number = self._extract_invoice_number(text)
        
        # Extract specific data based on document type
        if doc_type == 'invoice':
            invoice_data = self._extract_invoice_data(text, vendor, amount, date, invoice_number)
            return DocumentData(
                document_type='invoice',
                filename=filename,
                vendor=vendor,
                amount=amount,
                date=date,
                invoice_number=invoice_number,
                invoice_data=invoice_data,
                raw_text=text[:1000] + "..." if len(text) > 1000 else text,
                confidence=0.8
            )
        
        elif doc_type == 'warranty':
            warranty_data = self._extract_warranty_data(text, vendor, date)
            return DocumentData(
                document_type='warranty',
                filename=filename,
                vendor=vendor,
                amount=amount,
                date=date,
                warranty_data=warranty_data,
                raw_text=text[:1000] + "..." if len(text) > 1000 else text,
                confidence=0.8
            )
        
        elif doc_type == 'refund':
            refund_data = self._extract_refund_data(text, vendor, amount, date)
            return DocumentData(
                document_type='refund',
                filename=filename,
                vendor=vendor,
                amount=amount,
                date=date,
                refund_data=refund_data,
                raw_text=text[:1000] + "..." if len(text) > 1000 else text,
                confidence=0.8
            )
        
        else:
            # Generic document
            return DocumentData(
                document_type='document',
                filename=filename,
                vendor=vendor,
                amount=amount,
                date=date,
                invoice_number=invoice_number,
                raw_text=text[:1000] + "..." if len(text) > 1000 else text,
                confidence=0.6
            )
    
    def extract_from_text(self, text: str, document_type: str = "auto") -> DocumentData:
        """Extract data from raw text"""
        if document_type == "auto":
            doc_type = self._classify_document(text, "")
        else:
            doc_type = document_type
        
        vendor = self._extract_vendor(text)
        amount = self._extract_amount(text)
        date = self._extract_date(text)
        invoice_number = self._extract_invoice_number(text)
        
        return DocumentData(
            document_type=doc_type,
            filename="text_input",
            vendor=vendor,
            amount=amount,
            date=date,
            invoice_number=invoice_number,
            raw_text=text[:1000] + "..." if len(text) > 1000 else text,
            confidence=0.7
        )
    
    def _classify_document(self, text: str, filename: str) -> str:
        """Classify document type based on content"""
        text_lower = text.lower()
        filename_lower = filename.lower()
        
        # Check for warranty keywords
        warranty_score = sum(1 for keyword in self.warranty_keywords if keyword in text_lower)
        if warranty_score >= 2 or 'warranty' in filename_lower:
            return 'warranty'
        
        # Check for refund keywords
        refund_score = sum(1 for keyword in self.refund_keywords if keyword in text_lower)
        if refund_score >= 2 or 'refund' in filename_lower:
            return 'refund'
        
        # Check for invoice keywords
        invoice_score = sum(1 for keyword in self.invoice_keywords if keyword in text_lower)
        if invoice_score >= 2 or any(word in filename_lower for word in ['invoice', 'bill', 'receipt']):
            return 'invoice'
        
        # Default to document
        return 'document'
    
    def _extract_vendor(self, text: str) -> str:
        """Extract vendor/company name"""
        # First try the existing patterns
        for pattern in self.vendor_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                vendor = match.group(1).strip()
                if len(vendor) > 3 and len(vendor) < 100:
                    return vendor
        
        # Enhanced vendor extraction for forwarded emails and subjects
        # Look for common vendor patterns in forwarded emails
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
        
        # Try to extract from common patterns
        lines = text.split('\n')
        for line in lines[:10]:  # Check first 10 lines
            line = line.strip()
            if len(line) > 5 and len(line) < 50:
                # Check if line looks like a company name
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
                    # Clean the amount string
                    amount_str = match.replace(',', '').strip()
                    amount = float(amount_str)
                    if amount > 0:
                        amounts.append(amount)
                except (ValueError, InvalidOperation):
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
                    # Parse date using dateparser
                    parsed_date = dateparser.parse(match)
                    if parsed_date:
                        return parsed_date.isoformat()
                except:
                    continue
        
        return None
    
    def _extract_invoice_number(self, text: str) -> Optional[str]:
        """Extract invoice/bill number"""
        for pattern in self.invoice_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_invoice_data(self, text: str, vendor: str, amount: float, date: Optional[str], invoice_number: Optional[str]) -> InvoiceData:
        """Extract detailed invoice data"""
        # Extract product details
        products = self._extract_products(text)
        
        # Extract tax information
        tax_amount = self._extract_tax_amount(text)
        
        # Extract payment method
        payment_method = self._extract_payment_method(text)
        
        # Extract shipping information
        shipping_cost = self._extract_shipping_cost(text)
        
        # Extract discount
        discount = self._extract_discount(text)
        
        return InvoiceData(
            invoice_number=invoice_number,
            vendor=vendor,
            amount=amount,
            date=date,
            products=products,
            tax_amount=tax_amount,
            payment_method=payment_method,
            shipping_cost=shipping_cost,
            discount=discount,
            total_amount=amount
        )
    
    def _extract_warranty_data(self, text: str, vendor: str, date: Optional[str]) -> WarrantyData:
        """Extract warranty information"""
        # Extract warranty period
        warranty_period = self._extract_warranty_period(text)
        
        # Extract product name
        product_name = self._extract_product_name(text)
        
        # Extract warranty terms
        warranty_terms = self._extract_warranty_terms(text)
        
        # Extract warranty status
        warranty_status = self._extract_warranty_status(text)
        
        return WarrantyData(
            vendor=vendor,
            product_name=product_name,
            warranty_period=warranty_period,
            warranty_terms=warranty_terms,
            warranty_status=warranty_status,
            registration_date=date
        )
    
    def _extract_refund_data(self, text: str, vendor: str, amount: float, date: Optional[str]) -> RefundData:
        """Extract refund information"""
        # Extract refund reason
        refund_reason = self._extract_refund_reason(text)
        
        # Extract refund status
        refund_status = self._extract_refund_status(text)
        
        # Extract refund method
        refund_method = self._extract_refund_method(text)
        
        return RefundData(
            vendor=vendor,
            refund_amount=amount,
            refund_reason=refund_reason,
            refund_status=refund_status,
            refund_method=refund_method,
            refund_date=date
        )
    
    def _extract_products(self, text: str) -> List[Dict[str, Any]]:
        """Extract product details from text"""
        products = []
        
        # Look for product patterns
        product_patterns = [
            r'(\d+)\s*x\s*([A-Za-z0-9\s\-\.]+?)\s*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'([A-Za-z0-9\s\-\.]+?)\s*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        ]
        
        for pattern in product_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if len(match) == 3:  # qty, name, price
                    products.append({
                        "quantity": int(match[0]) if match[0].isdigit() else 1,
                        "name": match[1].strip(),
                        "price": float(match[2].replace(',', ''))
                    })
                elif len(match) == 2:  # name, price
                    products.append({
                        "quantity": 1,
                        "name": match[0].strip(),
                        "price": float(match[1].replace(',', ''))
                    })
        
        return products
    
    def _extract_tax_amount(self, text: str) -> float:
        """Extract tax amount"""
        tax_patterns = [
            r'Tax[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'GST[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'VAT[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Service\s+Tax[:\s]*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        ]
        
        for pattern in tax_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(',', ''))
                except ValueError:
                    continue
        
        return 0.0
    
    def _extract_payment_method(self, text: str) -> Optional[str]:
        """Extract payment method"""
        payment_methods = [
            'credit card', 'debit card', 'cash', 'cheque', 'bank transfer',
            'upi', 'paytm', 'phonepe', 'google pay', 'net banking',
            'wallet', 'cod', 'cash on delivery'
        ]
        
        text_lower = text.lower()
        for method in payment_methods:
            if method in text_lower:
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
    
    def _extract_warranty_period(self, text: str) -> Optional[str]:
        """Extract warranty period"""
        warranty_patterns = [
            r'(\d+)\s*(?:year|yr|month|mo|day|d)\s*warranty',
            r'warranty[:\s]*(\d+)\s*(?:year|yr|month|mo|day|d)',
            r'(\d+)\s*(?:year|yr|month|mo|day|d)\s*coverage',
        ]
        
        for pattern in warranty_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)
        
        return None
    
    def _extract_product_name(self, text: str) -> Optional[str]:
        """Extract product name from warranty document"""
        # Look for product patterns in warranty documents
        product_patterns = [
            r'Product[:\s]*([A-Za-z0-9\s\-\.]+)',
            r'Item[:\s]*([A-Za-z0-9\s\-\.]+)',
            r'Model[:\s]*([A-Za-z0-9\s\-\.]+)',
        ]
        
        for pattern in product_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_warranty_terms(self, text: str) -> Optional[str]:
        """Extract warranty terms and conditions"""
        # Look for warranty terms section
        terms_patterns = [
            r'Terms[:\s]*([A-Za-z0-9\s\-\.\,]+)',
            r'Conditions[:\s]*([A-Za-z0-9\s\-\.\,]+)',
            r'Coverage[:\s]*([A-Za-z0-9\s\-\.\,]+)',
        ]
        
        for pattern in terms_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_warranty_status(self, text: str) -> str:
        """Extract warranty status"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['active', 'valid', 'current']):
            return 'active'
        elif any(word in text_lower for word in ['expired', 'invalid', 'void']):
            return 'expired'
        else:
            return 'unknown'
    
    def _extract_refund_reason(self, text: str) -> Optional[str]:
        """Extract refund reason"""
        reason_patterns = [
            r'Reason[:\s]*([A-Za-z0-9\s\-\.\,]+)',
            r'Cause[:\s]*([A-Za-z0-9\s\-\.\,]+)',
            r'Why[:\s]*([A-Za-z0-9\s\-\.\,]+)',
        ]
        
        for pattern in reason_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_refund_status(self, text: str) -> str:
        """Extract refund status"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['processed', 'completed', 'approved']):
            return 'processed'
        elif any(word in text_lower for word in ['pending', 'processing', 'under review']):
            return 'pending'
        elif any(word in text_lower for word in ['rejected', 'denied', 'declined']):
            return 'rejected'
        else:
            return 'unknown'
    
    def _extract_refund_method(self, text: str) -> Optional[str]:
        """Extract refund method"""
        refund_methods = [
            'credit card', 'debit card', 'bank transfer', 'upi', 'paytm',
            'phonepe', 'google pay', 'cheque', 'cash', 'wallet'
        ]
        
        text_lower = text.lower()
        for method in refund_methods:
            if method in text_lower:
                return method.title()
        
        return None
    
    def analyze_warranty(self, pdf_data: Dict[str, Any], filename: str) -> WarrantyAnalysisResult:
        """
        Analyze PDF specifically for warranty information and provide detailed analysis
        """
        text = pdf_data.get('cleaned_text', '')
        document_id = f"doc_{hash(filename)}_{int(datetime.now().timestamp())}"
        
        # Extract warranty data
        warranty_data = self._extract_warranty_data(text, self._extract_vendor(text), self._extract_date(text))
        
        # Analyze warranty information
        warranty_found = warranty_data is not None and warranty_data.warranty_period is not None
        key_findings = []
        recommendations = []
        risk_assessment = "low"
        expiry_warning = False
        days_until_expiry = None
        
        if warranty_found:
            # Calculate expiry date and warnings
            if warranty_data.registration_date and warranty_data.warranty_period:
                try:
                    reg_date = datetime.fromisoformat(warranty_data.registration_date.replace('Z', '+00:00'))
                    
                    # Parse warranty period (e.g., "1 year", "12 months", "365 days")
                    period_days = self._parse_warranty_period_to_days(warranty_data.warranty_period)
                    if period_days:
                        expiry_date = reg_date + timedelta(days=period_days)
                        warranty_data.expiry_date = expiry_date.isoformat()
                        
                        # Calculate days until expiry
                        days_until_expiry = (expiry_date - datetime.now()).days
                        
                        # Set expiry warning if less than 30 days
                        if days_until_expiry <= 30:
                            expiry_warning = True
                            risk_assessment = "high" if days_until_expiry <= 7 else "medium"
                        
                        # Generate key findings
                        key_findings.append(f"Warranty period: {warranty_data.warranty_period}")
                        key_findings.append(f"Registration date: {warranty_data.registration_date}")
                        key_findings.append(f"Expiry date: {expiry_date.strftime('%Y-%m-%d')}")
                        
                        if days_until_expiry > 0:
                            key_findings.append(f"Days remaining: {days_until_expiry}")
                        else:
                            key_findings.append("Warranty has expired")
                            risk_assessment = "high"
                        
                        # Generate recommendations
                        if days_until_expiry <= 30 and days_until_expiry > 0:
                            recommendations.append("Warranty expires soon - consider registering for extended warranty")
                            recommendations.append("Save warranty document and contact information")
                        elif days_until_expiry <= 0:
                            recommendations.append("Warranty has expired - check if extended warranty is available")
                        else:
                            recommendations.append("Warranty is active - keep documentation safe")
                            recommendations.append("Set reminder for warranty expiry")
                        
                        # Add product-specific recommendations
                        if warranty_data.product_name:
                            recommendations.append(f"Register product '{warranty_data.product_name}' with manufacturer")
                        
                        if warranty_data.contact_info:
                            recommendations.append("Save warranty contact information for future claims")
                    
                except Exception as e:
                    logger.warning(f"Error calculating warranty expiry: {str(e)}")
                    key_findings.append("Could not calculate warranty expiry date")
            
            # Analyze warranty terms
            if warranty_data.warranty_terms:
                key_findings.append(f"Warranty terms: {warranty_data.warranty_terms}")
            
            # Analyze warranty status
            if warranty_data.warranty_status != "unknown":
                key_findings.append(f"Warranty status: {warranty_data.warranty_status}")
                if warranty_data.warranty_status == "expired":
                    risk_assessment = "high"
                    recommendations.append("Warranty is expired - consider purchasing extended warranty")
                elif warranty_data.warranty_status == "active":
                    recommendations.append("Warranty is active - keep all documentation")
        
        else:
            key_findings.append("No warranty information found in document")
            recommendations.append("Check if warranty information is available separately")
            recommendations.append("Contact vendor for warranty details")
            risk_assessment = "medium"
        
        # Calculate confidence based on data quality
        confidence = 0.0
        if warranty_found:
            confidence = 0.8
            if warranty_data.product_name:
                confidence += 0.1
            if warranty_data.contact_info:
                confidence += 0.1
            if warranty_data.warranty_terms:
                confidence += 0.1
        else:
            # Check if document might contain warranty info
            warranty_keywords_found = sum(1 for keyword in self.warranty_keywords if keyword in text.lower())
            if warranty_keywords_found > 0:
                confidence = 0.3
                key_findings.append("Warranty keywords found but no structured data extracted")
            else:
                confidence = 0.1
                key_findings.append("No warranty-related content detected")
        
        return WarrantyAnalysisResult(
            document_id=document_id,
            warranty_found=warranty_found,
            warranty_data=warranty_data,
            analysis_confidence=min(confidence, 1.0),
            key_findings=key_findings,
            recommendations=recommendations,
            risk_assessment=risk_assessment,
            expiry_warning=expiry_warning,
            days_until_expiry=days_until_expiry
        )
    
    def _parse_warranty_period_to_days(self, warranty_period: str) -> Optional[int]:
        """
        Parse warranty period string to days
        """
        if not warranty_period:
            return None
        
        period_lower = warranty_period.lower()
        
        # Extract number and unit
        import re
        match = re.search(r'(\d+)\s*(year|yr|month|mo|day|d)', period_lower)
        if not match:
            return None
        
        number = int(match.group(1))
        unit = match.group(2)
        
        if unit in ['year', 'yr']:
            return number * 365
        elif unit in ['month', 'mo']:
            return number * 30
        elif unit in ['day', 'd']:
            return number
        
        return None

