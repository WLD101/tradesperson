'use client';

import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export type EntityType = 'JOB' | 'CUSTOMER' | 'QUOTE' | 'REQUISITION' | 'PRODUCT';

interface FileDropzoneProps {
  entityType: EntityType;
  entityId: string;
  onUploadComplete?: (fileId: string) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  entityType,
  entityId,
  onUploadComplete,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(10);
    setError(null);
    setSuccess(false);

    try {
      // 1. Request presigned upload URL from NestJS API
      const res = await fetch('/api/v1/storage/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to get upload authorization.');
      }

      const { fileId, uploadUrl } = await res.json();
      setProgress(30);

      // 2. Upload binary directly to S3 / MinIO
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Direct S3 upload failed.');
      }

      setProgress(80);

      // 3. Confirm upload status
      const confirmRes = await fetch(`/api/v1/storage/confirm/${fileId}`, {
        method: 'POST',
      });

      if (!confirmRes.ok) {
        throw new Error('Failed to confirm file attachment.');
      }

      setProgress(100);
      setSuccess(true);
      if (onUploadComplete) onUploadComplete(fileId);
    } catch (err: any) {
      setError(err.message || 'An unexpected upload error occurred.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
        {uploading ? (
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-2" />
        ) : success ? (
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
        ) : error ? (
          <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
        ) : (
          <UploadCloud className="h-10 w-10 text-slate-400 mb-2" />
        )}

        <span className="text-sm font-medium">
          {uploading
            ? 'Uploading file...'
            : success
            ? 'Upload Complete!'
            : 'Click or drag file to upload'}
        </span>
      </label>

      {uploading && (
        <div className="w-full mt-4 bg-slate-200 rounded-full h-2 dark:bg-slate-700">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
};
