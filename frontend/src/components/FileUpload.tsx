import React, { useState, useRef } from "react";
import { FileService } from "../services/fileService";

interface FileUploadProps {
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setProgress(0);

      const fileService = FileService.getInstance();
      await fileService.uploadFile(selectedFile);

      setProgress(100);
      onUploadSuccess?.();
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      onUploadError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <input
          type="file"
          onChange={handleFileSelect}
          ref={fileInputRef}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer"
        >
          Select File
        </label>
        {selectedFile && (
          <span className="text-gray-600">{selectedFile.name}</span>
        )}
      </div>

      {selectedFile && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
