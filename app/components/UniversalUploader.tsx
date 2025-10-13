import React, { useRef, useState } from 'react';
import { Upload, Loader2, FileText } from 'lucide-react';
import { Button } from './ui/button';

interface UniversalUploaderProps {
  onUploadSuccess?: (result: any) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

const UniversalUploader: React.FC<UniversalUploaderProps> = ({ 
  onUploadSuccess, 
  onUploadError,
  accept = 'image/*,application/pdf', 
  multiple = false,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const resetUploader = () => {
    setError(null);
    setIsSuccess(false);
    setUploadProgress(0);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileType = (file: File): string => {
    // If browser provides a valid MIME type, use it
    if (file.type && file.type !== 'application/octet-stream') {
      return file.type;
    }
    
    // Otherwise, determine type from file extension
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    
    const extensionMap: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    return extensionMap[extension] || 'application/octet-stream';
  };

  const isValidFileType = (file: File): boolean => {
    const fileType = getFileType(file);
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 
      'image/png', 
      'image/gif',
      'image/webp'
    ];
    
    return allowedTypes.includes(fileType);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
  };

  const uploadFiles = async (files: FileList) => {
    setIsUploading(true);
    setError(null);
    setIsSuccess(false);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      
      // Validate files before upload
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          const errorMsg = `File ${file.name} is too large. Maximum size is 10MB.`;
          setError(errorMsg);
          setIsUploading(false);
          if (onUploadError) onUploadError(errorMsg);
          return;
        }
        
        // Check file type
        if (!isValidFileType(file)) {
          const errorMsg = `File ${file.name} has an unsupported type. Please upload PDF or image files.`;
          setError(errorMsg);
          setIsUploading(false);
          if (onUploadError) onUploadError(errorMsg);
          return;
        }
        
        formData.append('files', file);
      }
      
      // Set preview for first image file
      const firstFile = files[0];
      const firstFileType = getFileType(firstFile);
      if (firstFileType.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(firstFile));
      } else {
        setPreviewUrl(null);
      }
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/documents/upload');
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      
      xhr.onload = () => {
        setIsUploading(false);
        setUploadProgress(100);
        
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          
          // Show success state
          setIsSuccess(true);
          setError(null);
          
          if (onUploadSuccess) onUploadSuccess(result);
          
          // Reset success state after 3 seconds
          setTimeout(() => {
            setIsSuccess(false);
          }, 3000);
        } else {
          
          let errorMessage = 'Upload failed.';
          
          try {
            const errorData = JSON.parse(xhr.responseText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            // Use default error message
          }
          
          setError(errorMessage);
          setIsSuccess(false);
          if (onUploadError) onUploadError(errorMessage);
        }
      };
      
      xhr.onerror = () => {
        setIsUploading(false);
        
        const errorMsg = 'Network error. Please try again.';
        setError(errorMsg);
        setIsSuccess(false);
        if (onUploadError) onUploadError(errorMsg);
      };
      
      xhr.send(formData);
    } catch (err) {
      setIsUploading(false);
      
      const errorMsg = 'Upload failed. Please try again.';
      setError(errorMsg);
      setIsSuccess(false);
      if (onUploadError) onUploadError(errorMsg);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors relative ${className}`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      tabIndex={0}
      role="button"
      aria-label="Upload document"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
          <div className="text-sm text-slate-600 dark:text-slate-400">Uploading... {uploadProgress}%</div>
        </div>
      ) : isSuccess ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">Upload successful!</div>
        </div>
      ) : previewUrl ? (
        <div className="space-y-4">
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-48 mx-auto rounded-lg" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Click or drag to upload a different file</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Upload className="w-12 h-12 text-slate-400 mx-auto" />
          <div>
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100">Upload Document</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Click or drag to select a file (PDF, JPG, PNG, etc.)</p>
          </div>
        </div>
      )}
      {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
    </div>
  );
};

export default UniversalUploader; 