import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";

export function useUploader() {
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);

  async function upload(file: File): Promise<Id<"_storage">> {
    const postUrl = await generateUploadUrl();
    const response = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!response.ok) throw new Error("Upload failed. Please try again.");
    const payload = (await response.json()) as { storageId?: string };
    if (!payload.storageId) throw new Error("Upload did not return a file id.");
    return payload.storageId as Id<"_storage">;
  }

  return { upload };
}
