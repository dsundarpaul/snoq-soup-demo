import { useCallback, useState } from "react";
import { uploadFileViaS3Presigned } from "@/lib/api-client";
import type { AuthRole } from "@/lib/auth-tokens";

const ALLOWED_NAMESPACE = /^[a-zA-Z0-9_-]+$/;

export interface UploadResult {
  publicUrl: string;
}

export interface UseUploadOptions {
  namespace: string;
  auth?: AuthRole;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export function useUpload(options: UseUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        const { namespace, auth } = options;
        if (!ALLOWED_NAMESPACE.test(namespace)) {
          throw new Error("Invalid upload namespace");
        }

        setProgress(15);
        const { publicUrl } = await uploadFileViaS3Presigned(file, {
          namespace,
          auth,
        });
        setProgress(100);
        const result: UploadResult = { publicUrl };
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const wrapped =
          err instanceof Error ? err : new Error("Upload failed");
        setError(wrapped);
        options.onError?.(wrapped);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [options.namespace, options.auth, options.onSuccess, options.onError],
  );

  return { uploadFile, isUploading, progress, error };
}
