from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from decimal import Decimal

class Address(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

class ProductItem(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0
    total_price: float = 0.0
    category: Optional[str] = None
    sku: Optional[str] = None
    model_number: Optional[str] = None

class InvoiceData(BaseModel):
    invoice_number: Optional[str] = None
    vendor: str
    amount: float
    date: Optional[str] = None
    products: List[ProductItem] = []
    tax_amount: float = 0.0
    payment_method: Optional[str] = None
    shipping_cost: float = 0.0
    discount: float = 0.0
    total_amount: float = 0.0
    billing_address: Optional[Address] = None
    shipping_address: Optional[Address] = None
    order_number: Optional[str] = None
    po_number: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None

class WarrantyData(BaseModel):
    vendor: str
    product_name: Optional[str] = None
    warranty_period: Optional[str] = None
    warranty_terms: Optional[str] = None
    warranty_status: str = "unknown"
    registration_date: Optional[str] = None
    expiry_date: Optional[str] = None
    warranty_type: Optional[str] = None  # manufacturer, extended, seller
    coverage_details: Optional[str] = None
    contact_info: Optional[str] = None
    serial_number: Optional[str] = None
    model_number: Optional[str] = None

class RefundData(BaseModel):
    vendor: str
    refund_amount: float
    refund_reason: Optional[str] = None
    refund_status: str = "unknown"
    refund_method: Optional[str] = None
    refund_date: Optional[str] = None
    transaction_id: Optional[str] = None
    original_purchase_date: Optional[str] = None
    refund_policy: Optional[str] = None

class DocumentData(BaseModel):
    document_type: str
    filename: str
    vendor: str
    amount: float = 0.0
    date: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_data: Optional[InvoiceData] = None
    warranty_data: Optional[WarrantyData] = None
    refund_data: Optional[RefundData] = None
    raw_text: str = ""
    confidence: float = 0.0
    processing_time: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    email_context: Optional[Dict[str, Any]] = None
    attachment_metadata: Optional[Dict[str, Any]] = None

class WarrantyAnalysisResult(BaseModel):
    document_id: str
    warranty_found: bool
    warranty_data: Optional[WarrantyData] = None
    analysis_confidence: float = 0.0
    key_findings: List[str] = []
    recommendations: List[str] = []
    risk_assessment: str = "low"  # low, medium, high
    expiry_warning: bool = False
    days_until_expiry: Optional[int] = None

class BatchProcessingResult(BaseModel):
    total_documents: int
    processed_documents: int
    successful_extractions: int
    warranty_documents: int
    failed_documents: int
    results: List[DocumentData] = []
    errors: List[str] = []
    processing_time: float = 0.0

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Union[DocumentData, WarrantyAnalysisResult, BatchProcessingResult]] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None

class HealthCheckResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "1.0.0"
    services: Dict[str, str] = {}

class SupportedFormatsResponse(BaseModel):
    supported_formats: List[str]
    document_types: List[str]
    extraction_capabilities: List[str]
    warranty_analysis_features: List[str]
