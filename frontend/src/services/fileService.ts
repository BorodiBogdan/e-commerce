import { API_BASE_URL } from "./api";

export class FileService {
  private static instance: FileService | null = null;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = API_BASE_URL;
  }

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  public async uploadFile(
    file: File
  ): Promise<{ status: string; message: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload file");
    }

    return response.json();
  }

  public async downloadFile(filename: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/download/${filename}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download file");
      }

      // Get the content type and filename from headers
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      const contentDisposition = response.headers.get("content-disposition");
      const downloadFilename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : filename;

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);

      // Trigger download
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      throw error;
    }
  }

  public async listFiles(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/files`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to list files");
      }

      const data = await response.json();
      return data.files;
    } catch (error) {
      console.error("List files error:", error);
      throw error;
    }
  }
}
