import { ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadTaskSnapshot } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload progress callback
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * Upload media to Cloudinary (免費25GB + 25GB視頻)
 * Fallback to Firebase Storage if Cloudinary fails
 */
export async function uploadMedia(
  file: File,
  folder: 'posts' | 'profiles' | 'themes',
  userId: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  // Try Cloudinary first for better limits
  try {
    return await uploadToCloudinary(file, folder, userId, onProgress);
  } catch (cloudinaryError) {
    console.warn('Cloudinary upload failed, falling back to Firebase Storage:', cloudinaryError);
    // Fallback to Firebase Storage
    return await uploadToFirebase(file, folder, userId, onProgress);
  }
}

/**
 * Upload to Cloudinary with progress tracking
 */
async function uploadToCloudinary(
  file: File,
  folder: string,
  userId: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dgfroevza';
  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'kcis_media';
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary not configured: set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET');
  }
  
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `${folder}/${userId}`);
    
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.secure_url);
      } else {
        reject(new Error(`Cloudinary upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });
    
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);
    xhr.send(formData);
  });
}

/**
 * Upload to Firebase Storage with progress tracking
 */
async function uploadToFirebase(
  file: File,
  folder: string,
  userId: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `${folder}/${userId}/${timestamp}_${sanitizedName}`;
  
  const storageRef = ref(storage, filename);
  
  const metadata = {
    contentType: file.type,
    customMetadata: {
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    }
  };
  
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);
  
  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
}

/**
 * Delete media file from storage (both Cloudinary and Firebase)
 */
export async function deleteMedia(url: string): Promise<void> {
  try {
    // Check if it's a Cloudinary URL
    if (url.includes('cloudinary.com')) {
      // Cloudinary deletion requires backend API with secret key
      // For now, just log it (files will age out or can be cleaned up manually)
      console.log('Cloudinary file marked for cleanup:', url);
      return;
    }
    
    // Firebase Storage deletion
    const urlObj = new URL(url);
    const path = decodeURIComponent(urlObj.pathname.split('/o/')[1]?.split('?')[0]);
    
    if (!path) {
      console.warn('Could not extract path from URL:', url);
      return;
    }
    
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Failed to delete media:', error);
  }
}

/**
 * Convert base64 data URL to File object
 */
export function dataURLtoFile(dataURL: string, filename: string): File {
  const parts = dataURL.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Upload base64 media to storage with progress
 */
export async function uploadBase64Media(
  base64: string,
  folder: 'posts' | 'profiles' | 'themes',
  userId: string,
  filename: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  // If the base64 payload is small enough, keep it inline (avoids storage/CORS)
  // Estimate bytes from base64 length: bytes ≈ (len * 3) / 4
  const estimatedBytes = Math.floor((base64.length * 3) / 4);
  const INLINE_LIMIT = 700 * 1024; // ~0.7MB raw (stays under Firestore 1MB limit)
  if (estimatedBytes <= INLINE_LIMIT) {
    if (onProgress) onProgress(100);
    return base64; // store inline in Firestore
  }

  const file = dataURLtoFile(base64, filename);
  return uploadMedia(file, folder, userId, onProgress);
}
