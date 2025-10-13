import PyPDF2
import pdfplumber
import pytesseract
from PIL import Image
import io
import re
import logging
from typing import Dict, List, Any, Optional
import tempfile
import os

logger = logging.getLogger(__name__)

class PDFParser:
    def __init__(self):
        self.ocr_enabled = True
        self.text_cleanup_patterns = [
            (r'\s+', ' '),  # Multiple spaces to single space
            (r'\n+', '\n'),  # Multiple newlines to single newline
            (r'[^\x00-\x7F]+', ' '),  # Remove non-ASCII characters
        ]
    
    def _is_readable_text(self, text: str) -> bool:
        """Check if extracted text is readable (not garbled binary)"""
        if not text or len(text.strip()) < 10:
            return False
        
        # Check for excessive non-printable characters
        printable_chars = sum(1 for c in text if c.isprintable() or c.isspace())
        total_chars = len(text)
        
        if total_chars == 0:
            return False
            
        printable_ratio = printable_chars / total_chars
        
        # If less than 70% of characters are printable, it's likely garbled
        if printable_ratio < 0.7:
            return False
        
        # Check for common garbled patterns
        garbled_patterns = [
            r'\\x[0-9a-fA-F]{2}',  # Hex escape sequences
            r'\\[0-9]{3}',  # Octal escape sequences
            r'endstream\s+endobj',  # PDF stream markers
            r'obj\s+<<',  # PDF object markers
            r'\/[A-Za-z]+\s+[0-9]+\s+[0-9]+\s+R',  # PDF references
        ]
        
        for pattern in garbled_patterns:
            if re.search(pattern, text):
                return False
        
        return True
    
    def parse_pdf(self, file_path: str) -> Dict[str, Any]:
        """
        Parse PDF file and extract all text content
        """
        try:
            logger.info(f"Starting PDF parsing for: {file_path}")
            
            # Extract text using multiple methods
            text_content = self._extract_text_pdfplumber(file_path)
            
            # If text extraction is poor, try PyPDF2
            if len(text_content.strip()) < 100:
                logger.info("Text extraction poor, trying PyPDF2...")
                pypdf2_text = self._extract_text_pypdf2(file_path)
                if len(pypdf2_text.strip()) > len(text_content.strip()):
                    text_content = pypdf2_text
            
            # If still poor, try OCR
            if len(text_content.strip()) < 100:
                logger.info("Text extraction still poor, trying OCR...")
                ocr_text = self._extract_text_ocr(file_path)
                if len(ocr_text.strip()) > len(text_content.strip()):
                    text_content = ocr_text
            
            # If still poor, try raw text extraction
            if len(text_content.strip()) < 100:
                logger.info("Text extraction still poor, trying raw text extraction...")
                raw_text = self._extract_raw_text(file_path)
                if len(raw_text.strip()) > len(text_content.strip()):
                    text_content = raw_text
            
            # Clean up text
            cleaned_text = self._clean_text(text_content)
            
            # Extract metadata
            metadata = self._extract_metadata(file_path)
            
            result = {
                "raw_text": text_content,
                "cleaned_text": cleaned_text,
                "metadata": metadata,
                "text_length": len(cleaned_text),
                "extraction_method": "pdfplumber" if len(text_content) > 100 else "ocr"
            }
            
            logger.info(f"PDF parsing completed. Text length: {len(cleaned_text)}")
            return result
            
        except Exception as e:
            logger.error(f"Error parsing PDF {file_path}: {str(e)}")
            raise
    
    def _extract_text_pdfplumber(self, file_path: str) -> str:
        """Extract text using pdfplumber (better for structured PDFs)"""
        text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text and self._is_readable_text(page_text):
                            text += f"\n--- Page {page_num + 1} ---\n"
                            text += page_text
                            
                            # Also extract tables if any
                            try:
                                tables = page.extract_tables()
                                if tables:
                                    text += "\n--- Tables ---\n"
                                    for table in tables:
                                        for row in table:
                                            if row:
                                                text += " | ".join([cell or "" for cell in row]) + "\n"
                            except Exception as table_error:
                                logger.warning(f"Table extraction failed on page {page_num + 1}: {str(table_error)}")
                                continue
                    except Exception as page_error:
                        logger.warning(f"pdfplumber page {page_num + 1} extraction failed: {str(page_error)}")
                        continue
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed: {str(e)}")
        
        return text
    
    def _extract_text_pypdf2(self, file_path: str) -> str:
        """Extract text using PyPDF2 (fallback method)"""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                # Try to create reader with strict=False to handle corrupted PDFs
                try:
                    pdf_reader = PyPDF2.PdfReader(file, strict=False)
                except Exception as reader_error:
                    logger.warning(f"PyPDF2 reader creation failed: {str(reader_error)}")
                    return text
                
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text and self._is_readable_text(page_text):
                            text += f"\n--- Page {page_num + 1} ---\n"
                            text += page_text
                    except Exception as page_error:
                        logger.warning(f"PyPDF2 page {page_num + 1} extraction failed: {str(page_error)}")
                        continue
        except Exception as e:
            logger.warning(f"PyPDF2 extraction failed: {str(e)}")
        
        return text
    
    def _extract_text_ocr(self, file_path: str) -> str:
        """Extract text using OCR (for scanned PDFs)"""
        if not self.ocr_enabled:
            return ""
        
        text = ""
        try:
            # Convert PDF pages to images and OCR them
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    try:
                        # Convert page to image
                        page_image = page.to_image(resolution=300)
                        pil_image = page_image.original
                        
                        # Perform OCR
                        page_text = pytesseract.image_to_string(pil_image, lang='eng')
                        if page_text.strip():
                            text += f"\n--- Page {page_num + 1} (OCR) ---\n"
                            text += page_text
                    except Exception as page_error:
                        logger.warning(f"OCR page {page_num + 1} extraction failed: {str(page_error)}")
                        continue
        except Exception as e:
            logger.warning(f"OCR extraction failed: {str(e)}")
        
        return text
    
    def _extract_raw_text(self, file_path: str) -> str:
        """Extract text by reading raw file content (for corrupted PDFs)"""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                content = file.read()
                # Try to extract text using regex patterns
                text_patterns = [
                    rb'BT\s+.*?ET',  # Text objects
                    rb'\(([^)]+)\)',  # Text in parentheses
                    rb'<([^>]+)>',   # Text in angle brackets
                    rb'\[([^\]]+)\]',  # Text in square brackets
                    rb'/([A-Za-z0-9\s]+)',  # Text after forward slash
                    rb'([A-Za-z0-9\s]{10,})',  # Long text sequences
                ]
                
                for pattern in text_patterns:
                    matches = re.findall(pattern, content, re.DOTALL)
                    for match in matches:
                        if isinstance(match, bytes):
                            try:
                                decoded = match.decode('utf-8', errors='ignore')
                                if decoded.strip():
                                    text += decoded + " "
                            except:
                                continue
                        else:
                            text += str(match) + " "
        except Exception as e:
            logger.warning(f"Raw text extraction failed: {str(e)}")
        
        return text
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        cleaned = text
        
        # First, try to decode any escaped sequences
        try:
            # Decode common escape sequences
            cleaned = cleaned.encode().decode('unicode_escape')
        except:
            pass
        
        # Remove excessive binary-like content
        cleaned = re.sub(r'\\x[0-9a-fA-F]{2,}', ' ', cleaned)  # Remove hex sequences
        cleaned = re.sub(r'\\[0-9]{3}', ' ', cleaned)  # Remove octal sequences
        cleaned = re.sub(r'endstream\s+endobj', ' ', cleaned)  # Remove PDF markers
        cleaned = re.sub(r'obj\s*<<.*?>>', ' ', cleaned)  # Remove PDF objects
        
        # Apply cleanup patterns
        for pattern, replacement in self.text_cleanup_patterns:
            cleaned = re.sub(pattern, replacement, cleaned)
        
        # Remove excessive whitespace
        cleaned = re.sub(r'\n\s*\n', '\n\n', cleaned)
        
        return cleaned.strip()
    
    def _extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract PDF metadata"""
        metadata = {
            "file_size": os.path.getsize(file_path),
            "pages": 0,
            "title": "",
            "author": "",
            "subject": "",
            "creator": "",
            "producer": "",
            "creation_date": "",
            "modification_date": ""
        }
        
        try:
            with open(file_path, 'rb') as file:
                # Try to create reader with strict=False to handle corrupted PDFs
                try:
                    pdf_reader = PyPDF2.PdfReader(file, strict=False)
                    metadata["pages"] = len(pdf_reader.pages)
                except Exception as reader_error:
                    logger.warning(f"PyPDF2 metadata reader creation failed: {str(reader_error)}")
                    return metadata
                
                try:
                    if pdf_reader.metadata:
                        pdf_metadata = pdf_reader.metadata
                        metadata.update({
                            "title": pdf_metadata.get("/Title", ""),
                            "author": pdf_metadata.get("/Author", ""),
                            "subject": pdf_metadata.get("/Subject", ""),
                            "creator": pdf_metadata.get("/Creator", ""),
                            "producer": pdf_metadata.get("/Producer", ""),
                            "creation_date": str(pdf_metadata.get("/CreationDate", "")),
                            "modification_date": str(pdf_metadata.get("/ModDate", ""))
                        })
                except Exception as metadata_error:
                    logger.warning(f"Metadata parsing failed: {str(metadata_error)}")
        except Exception as e:
            logger.warning(f"Metadata extraction failed: {str(e)}")
        
        return metadata
    
    def extract_tables(self, file_path: str) -> List[List[List[str]]]:
        """Extract tables from PDF"""
        tables = []
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_tables = page.extract_tables()
                    if page_tables:
                        tables.extend(page_tables)
        except Exception as e:
            logger.warning(f"Table extraction failed: {str(e)}")
        
        return tables
    
    def extract_images(self, file_path: str) -> List[Dict[str, Any]]:
        """Extract images from PDF"""
        images = []
        try:
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    page_images = page.images
                    for img in page_images:
                        images.append({
                            "page": page_num + 1,
                            "bbox": img["bbox"],
                            "width": img["width"],
                            "height": img["height"]
                        })
        except Exception as e:
            logger.warning(f"Image extraction failed: {str(e)}")
        
        return images

