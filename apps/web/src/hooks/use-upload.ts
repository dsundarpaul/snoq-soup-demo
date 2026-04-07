import { useState, useCallback } from "react";
import type { UppyFile } from "@uppy/core";
import { apiFetch, throwIfResNotOk } from "@/lib/api-client";
import type { AuthRole } from "@/lib/auth-tokens";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  metadata: UploadMetadata;
}

interface UseUploadOptions {
  auth?: AuthRole;
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for handling file uploads with presigned URLs.
 *
 * This hook implements the two-step presigned URL upload flow:
 * 1. Request a presigned URL from your backend (sends JSON metadata, NOT the file)
 * 2. Upload the file directly to the presigned URL
 *
 * @example
 * ```tsx
 * function FileUploader() {
 *   const { uploadFile, isUploading, error } = useUpload({
 *     onSuccess: (response) => {
 *       console.log("Uploaded to:", response.objectPath);
 *     },
 *   });
 *
 *   const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (file) {
 *       await uploadFile(file);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={handleFileChange} disabled={isUploading} />
 *       {isUploading && <p>Uploading...</p>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const requestUploadUrl = useCallback(
    async (file: File): Promise<UploadResponse> => {
      const contentType =
        file.type && file.type.length > 0 ? file.type : "image/png";
      const response = await apiFetch("POST", "/api/v1/upload/presign", {
        auth: options.auth ?? "merchant",
        body: {
          filename: file.name,
          contentType,
          size: file.size,
        },
      });
      await throwIfResNotOk(response);
      const data = (await response.json()) as {
        presignedUrl: string;
        publicUrl: string;
        key?: string;
      };
      return {
        uploadURL: data.presignedUrl,
        objectPath: data.publicUrl || data.key || "",
        metadata: {
          name: file.name,
          size: file.size,
          contentType,
        },
      };
    },
    [options.auth]
  );

  /**
   * Upload a file directly to the presigned URL.
   */
  const uploadToPresignedUrl = useCallback(
    async (file: File, uploadURL: string): Promise<void> => {
      const response = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to upload file to storage");
      }
    },
    []
  );

  /**
   * Upload a file using the presigned URL flow.
   *
   * @param file - The file to upload
   * @returns The upload response containing the object path
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        // Step 1: Request presigned URL (send metadata as JSON)
        setProgress(10);
        const uploadResponse = await requestUploadUrl(file);

        // Step 2: Upload file directly to presigned URL
        setProgress(30);
        await uploadToPresignedUrl(file, uploadResponse.uploadURL);

        setProgress(100);
        options.onSuccess?.(uploadResponse);
        return uploadResponse;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [requestUploadUrl, uploadToPresignedUrl, options.onSuccess, options.onError]
  );

  /**
   * Get upload parameters for Uppy's AWS S3 plugin.
   *
   * IMPORTANT: This function receives the UppyFile object from Uppy.
   * Use file.name, file.size, file.type to request per-file presigned URLs.
   *
   * Use this with the ObjectUploader component:
   * ```tsx
   * <ObjectUploader onGetUploadParameters={getUploadParameters}>
   *   Upload
   * </ObjectUploader>
   * ```
   */
  const getUploadParameters = useCallback(
    async (
      file: UppyFile<Record<string, unknown>, Record<string, unknown>>
    ): Promise<{
      method: "PUT";
      url: string;
      headers?: Record<string, string>;
    }> => {
      const f = file.data as File;
      const contentType =
        f.type && f.type.length > 0 ? f.type : "image/png";
      const response = await apiFetch("POST", "/api/v1/upload/presign", {
        auth: options.auth ?? "merchant",
        body: {
          filename: f.name,
          contentType,
          size: f.size,
        },
      });
      await throwIfResNotOk(response);
      const data = (await response.json()) as { presignedUrl: string };
      return {
        method: "PUT",
        url: data.presignedUrl,
        headers: { "Content-Type": contentType },
      };
    },
    [options.auth]
  );

  return {
    uploadFile,
    getUploadParameters,
    isUploading,
    error,
    progress,
  };
}
