// Client-side unsigned upload to Cloudinary. Requires two public env vars:
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
//   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET  (an unsigned preset)
// The server-side CLOUDINARY_URL is only used for signed/admin operations.
export async function uploadToCloudinary(file: File): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) {
    throw new Error("Cloudinary is not configured (set NEXT_PUBLIC_CLOUDINARY_* env vars)");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Photo upload failed");
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
