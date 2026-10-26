import { getSupabaseClient, isSupabaseConfigured } from './client';

export const COLLAR_BUCKET_PRIMARY = 'collar-references';
export const COLLAR_BUCKET_FALLBACK = 'order-designs';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileSizeFormatted?: string;
}

export interface UploadCollarResult {
  success: boolean;
  publicUrl?: string;
  imagePath?: string;
  bucket?: string;
  error?: string;
  isLocalOnly?: boolean;
}

export const supabaseStorageService = {
  /**
   * Validate file format (JPG, PNG, WebP) and size (<= 5MB)
   */
  validateFile(file: File): FileValidationResult {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const formattedSize = `${sizeInMB} MB`;

    // 1. Check size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `Ukuran file (${formattedSize}) melebihi batas maksimal 5 MB. Silakan kompres atau pilih file lain.`,
        fileSizeFormatted: formattedSize,
      };
    }

    // 2. Check MIME type and extension
    const hasValidMime = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase());
    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));

    if (!hasValidMime && !hasValidExt) {
      return {
        valid: false,
        error: `Format file "${file.name}" tidak didukung. Harap gunakan format gambar JPG, PNG, atau WebP.`,
        fileSizeFormatted: formattedSize,
      };
    }

    return { valid: true, fileSizeFormatted: formattedSize };
  },

  /**
   * Convert File into local Base64 / Data URL (used for local fallback or instant preview)
   */
  async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Upload collar reference image to Supabase Storage:
   * Target path: orders/{order_id}/collar/{timestamp}-{sanitized_filename}
   */
  async uploadCollarImage(
    orderId: string,
    file: File,
    preferredBucket = COLLAR_BUCKET_PRIMARY
  ): Promise<UploadCollarResult> {
    // 1. Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    const client = getSupabaseClient();

    // If Supabase is not configured or in offline demo mode, fallback to data URL
    if (!client || !isSupabaseConfigured()) {
      try {
        const localDataUrl = await this.fileToDataUrl(file);
        const virtualPath = `local/orders/${orderId}/collar/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        return {
          success: true,
          publicUrl: localDataUrl,
          imagePath: virtualPath,
          bucket: 'local',
          isLocalOnly: true,
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Gagal membaca file lokal: ${err.message}`,
        };
      }
    }

    // Prepare path: orders/{order_id}/collar/{filename}
    const cleanFileName = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
    const timestamp = Date.now();
    const storagePath = `orders/${orderId}/collar/${timestamp}-${cleanFileName}`;

    try {
      // Try primary bucket first
      let activeBucket = preferredBucket;
      let uploadResult = await client.storage
        .from(activeBucket)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg',
        });

      // If bucket does not exist, try fallback bucket 'order-designs'
      if (uploadResult.error && (uploadResult.error.message.includes('Bucket not found') || uploadResult.error.message.includes('404'))) {
        console.warn(`[Supabase Storage] Bucket "${activeBucket}" not found, trying fallback "${COLLAR_BUCKET_FALLBACK}"...`);
        activeBucket = COLLAR_BUCKET_FALLBACK;
        uploadResult = await client.storage
          .from(activeBucket)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || 'image/jpeg',
          });
      }

      if (uploadResult.error) {
        console.error('[Supabase Storage] Upload error:', uploadResult.error);
        throw new Error(uploadResult.error.message);
      }

      // Retrieve public URL from Supabase
      const { data: publicUrlData } = client.storage
        .from(activeBucket)
        .getPublicUrl(storagePath);

      return {
        success: true,
        publicUrl: publicUrlData.publicUrl,
        imagePath: storagePath,
        bucket: activeBucket,
        isLocalOnly: false,
      };
    } catch (err: any) {
      console.error('[Supabase Storage] Exception during collar upload:', err);
      // If network / bucket policy fails, fallback to local dataUrl so user's work isn't lost
      try {
        const localDataUrl = await this.fileToDataUrl(file);
        return {
          success: true,
          publicUrl: localDataUrl,
          imagePath: `fallback/orders/${orderId}/collar/${timestamp}-${cleanFileName}`,
          bucket: 'fallback_local',
          isLocalOnly: true,
          error: `Supabase Storage gagal (${err.message}), tersimpan sementara di browser.`,
        };
      } catch {
        return {
          success: false,
          error: `Gagal mengunggah gambar ke Supabase Storage: ${err.message}`,
        };
      }
    }
  },

  /**
   * Delete previous collar image from Supabase Storage (prevents orphaned files)
   * Safe to call; errors are logged without breaking user flow.
   */
  async deleteCollarImage(
    imagePath?: string,
    bucket = COLLAR_BUCKET_PRIMARY
  ): Promise<boolean> {
    if (!imagePath || imagePath.startsWith('local/') || imagePath.startsWith('data:')) {
      return true;
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return true;
    }

    try {
      // Attempt removal in primary bucket
      const { error: err1 } = await client.storage.from(bucket).remove([imagePath]);
      if (err1 && bucket !== COLLAR_BUCKET_FALLBACK) {
        // Try fallback bucket
        await client.storage.from(COLLAR_BUCKET_FALLBACK).remove([imagePath]);
      }
      return true;
    } catch (err) {
      console.warn('[Supabase Storage] Non-blocking warning deleting old image:', err);
      return false;
    }
  },

  /**
   * Extract relative storage object path from a Supabase storage URL or string
   */
  extractStoragePath(urlOrPath?: string | null): string | undefined {
    if (!urlOrPath) return undefined;
    if (urlOrPath.startsWith('data:')) return undefined;
    if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) return urlOrPath;
    const match = urlOrPath.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : undefined;
  },

  /**
   * Resolve an image path into a publicly accessible URL
   */
  resolveImageUrl(urlOrPath?: string | null): string | undefined {
    if (!urlOrPath) return undefined;
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://') || urlOrPath.startsWith('data:')) {
      return urlOrPath;
    }
    const client = getSupabaseClient();
    if (client) {
      const { data } = client.storage.from(COLLAR_BUCKET_PRIMARY).getPublicUrl(urlOrPath);
      return data.publicUrl;
    }
    return urlOrPath;
  },

  /**
   * Ensure image is fully loaded and decoded in memory before printing / PDF generation
   */
  async preloadImage(url?: string): Promise<boolean> {
    if (!url) return true;

    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          if ('decode' in img) {
            await img.decode();
          }
        } catch {
          // ignore decode errors if loaded
        }
        resolve(true);
      };
      img.onerror = () => {
        console.warn('[ImagePreloader] Failed to preload collar image:', url);
        resolve(false);
      };
      img.src = url;
    });
  },
};
