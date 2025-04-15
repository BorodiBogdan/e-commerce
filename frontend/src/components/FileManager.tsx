import React, { useState, useCallback, useEffect } from "react";
import { FileService } from "../services/fileService";
import { useOffline } from "../hooks/useOffline";

const fileService = FileService.getInstance();

export const FileManager: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOffline } = useOffline();

  const fetchFiles = useCallback(async () => {
    if (isOffline) {
      setError("Cannot fetch files while offline");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const serverFiles = await fileService.listFiles();
      setFiles(serverFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch files");
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError("Please select a file to upload");
      return;
    }

    if (isOffline) {
      setError("Cannot upload files while offline");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await fileService.uploadFile(selectedFile);
      await fetchFiles(); // Refresh the file list after upload
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setUploading(false);
    }
  }, [selectedFile, isOffline, fetchFiles]);

  const handleDownload = useCallback(
    async (filename: string) => {
      if (isOffline) {
        setError("Cannot download files while offline");
        return;
      }

      try {
        await fileService.downloadFile(filename);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to download file"
        );
      }
    },
    [isOffline]
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">File Manager</h2>

      <div className="mb-4">
        <input
          type="file"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
          disabled={isOffline}
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading || isOffline}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {uploading ? "Uploading..." : "Upload File"}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Available Files</h3>
        {loading ? (
          <div className="text-gray-500">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-gray-500">No files available</div>
        ) : (
          <ul className="space-y-2">
            {files.map((filename) => (
              <li key={filename} className="flex items-center justify-between">
                <span className="text-gray-700">{filename}</span>
                <button
                  onClick={() => handleDownload(filename)}
                  disabled={isOffline}
                  className="text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
