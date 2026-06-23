'use server';

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using process.env keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadToCloudinary(formData: FormData): Promise<string> {
  const file = formData.get('file') as File | null;
  if (!file) {
    throw new Error('No file provided');
  }

  // Double check environment variables are set
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables are not configured properly.');
  }

  try {
    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary using upload_stream
    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'signal_attachments',
        },
        (error, result) => {
          if (error || !result) {
            console.error('Cloudinary upload stream error:', error);
            reject(error || new Error('Upload to Cloudinary failed'));
          } else {
            resolve(result.secure_url);
          }
        }
      );
      uploadStream.end(buffer);
    });
  } catch (err: any) {
    console.error('Error in uploadToCloudinary:', err);
    throw new Error(err.message || 'Failed to upload attachment');
  }
}
