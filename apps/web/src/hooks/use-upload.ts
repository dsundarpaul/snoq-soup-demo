import { useCallback, useState } from "react";
import { upload } from "@vercel/blob/client";
import { API_ORIGIN } from "@/lib/app-config";
import { type AuthRole, getAccessToken } from "@/lib/auth-tokens";

const CLIENT_UPLOAD_PATH = "/api/v1/s3/blob/client-upload";
const ALLOWED_NAMESPACE = /^[a-zA-Z0-9_-]+$/;

export interface UploadResult {
  publicUrl: string;
  pathname: string;
  contentType?: string;
}

export interface UseUploadOptions {
  namespace: string;
  auth?: AuthRole;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

function buildUploadPathname(namespace: string, file: File): string {
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  return `${namespace}/${safe}`;
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
        const { namespace } = options;
        if (!ALLOWED_NAMESPACE.test(namespace)) {
          throw new Error("Invalid upload namespace");
        }
        const role = options.auth ?? "merchant";
        const token = getAccessToken(role);
        if (!token) {
          throw new Error("You must be signed in to upload files");
        }

        const pathname = buildUploadPathname(namespace, file);
        const blob = await upload(pathname, file, {
          access: "public",
          contentType: file.type || undefined,
          handleUploadUrl: `${API_ORIGIN}${CLIENT_UPLOAD_PATH}`,
          clientPayload: JSON.stringify({ namespace }),
          headers: { Authorization: `Bearer ${token}` },
          onUploadProgress: ({ percentage }) => setProgress(percentage),
        });

        const result: UploadResult = {
          publicUrl: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
        };
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
