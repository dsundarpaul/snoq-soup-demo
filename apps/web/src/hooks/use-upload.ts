import { useState, useCallback } from "react";
import { apiFetchMaybeRetry, throwIfResNotOk } from "@/lib/api-client";
import type { AuthRole } from "@/lib/auth-tokens";

interface UploadResponse {
  publicUrl: string;
}

interface UseUploadOptions {
  auth?: AuthRole;
  namespace?: string;
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

const UPLOAD_PATH = "/api/v1/s3/upload";

export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        setProgress(10);
        const namespace = options.namespace ?? "general";
        const authRole = options.auth ?? "merchant";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("namespace", namespace);

        const response = await apiFetchMaybeRetry("POST", UPLOAD_PATH, {
          auth: authRole,
          body: formData,
          json: false,
        });
        await throwIfResNotOk(response, UPLOAD_PATH, authRole);

        setProgress(100);
        const data = (await response.json()) as UploadResponse;
        options.onSuccess?.(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options.auth, options.namespace, options.onSuccess, options.onError]
  );

  return {
    uploadFile,
    isUploading,
    error,
    progress,
  };
}
