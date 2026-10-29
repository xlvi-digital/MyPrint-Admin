import { getSupabaseClient, isSupabaseConfigured } from './client';

export const COLLAR_BUCKET_PRIMARY = 'collar-references';
export const COLLAR_BUCKET_FALLBACK = 'order-designs';
export const ORDER_DESIGN_BUCKET = 'order-designs-private';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_DESIGN_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const signedOrderDesignUrlCache = new Map<string, { url: string; expiresAt: number }>();

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

export interface UploadDesignResult {
  success: boolean;
  imageUrl?: string;
  storagePath?: string;
  storageBucket?: string;
  isLocalOnly?: boolean;
  error?: string;
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

  /** Convert a selected file into a temporary preview URL; this is never persisted. */
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

    if (!client || !isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase belum dikonfigurasi. Gambar kerah tidak dapat disimpan tanpa Supabase Storage.',
      };
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
      return {
        success: false,
        error: `Gagal mengunggah gambar ke Supabase Storage: ${err.message}`,
      };
    }
  },

  validateDesignFile(file: File): FileValidationResult {
    const formattedSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    if (file.size > MAX_DESIGN_FILE_SIZE_BYTES) {
      return { valid: false, error: `Ukuran file ${formattedSize} melebihi batas maksimum desain 10 MB.`, fileSizeFormatted: formattedSize };
    }
    const hasValidType = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase());
    const hasValidExtension = ALLOWED_EXTENSIONS.some(extension => file.name.toLowerCase().endsWith(extension));
    if (!hasValidType && !hasValidExtension) {
      return { valid: false, error: `Format ${file.name} tidak didukung. Pilih JPG, JPEG, PNG, atau WebP.`, fileSizeFormatted: formattedSize };
    }
    return { valid: true, fileSizeFormatted: formattedSize };
  },

  async uploadOrderDesign(orderId: string, file: File): Promise<UploadDesignResult> {
    const validation = this.validateDesignFile(file);
    if (!validation.valid) return { success: false, error: validation.error };

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase belum dikonfigurasi. Gambar desain tidak dapat disimpan tanpa Supabase Storage.',
      };
    }

    const cleanFileName = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, '_');
    const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = `orders/${orderId}/designs/${uniqueId}-${cleanFileName}`;
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    const contentType = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())
      ? file.type.toLowerCase()
      : extension === '.png' ? 'image/png'
        : extension === '.webp' ? 'image/webp'
          : 'image/jpeg';
    const { error: uploadError } = await client.storage
      .from(ORDER_DESIGN_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType,
      });
    if (uploadError) {
      return {
        success: false,
        error: `Gagal mengunggah ${file.name} ke Supabase Storage: ${uploadError.message}`,
      };
    }

    const { data: signedUrl, error: signedUrlError } = await client.storage
      .from(ORDER_DESIGN_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    if (signedUrlError || !signedUrl?.signedUrl) {
      const { error: cleanupError } = await client.storage.from(ORDER_DESIGN_BUCKET).remove([storagePath]);
      return {
        success: false,
        error: `Gagal membuat tautan gambar ${file.name}: ${signedUrlError?.message || 'URL bertanda tangan tidak tersedia.'}${cleanupError ? ` File sementara juga gagal dibersihkan: ${cleanupError.message}` : ''}`,
      };
    }

    return {
      success: true,
      imageUrl: signedUrl.signedUrl,
      storagePath,
      storageBucket: ORDER_DESIGN_BUCKET,
      isLocalOnly: false,
    };
  },

  async createSignedOrderDesignUrl(bucket: string, storagePath: string): Promise<string> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi untuk membaca desain tersimpan.');
    }
    const cacheKey = `${bucket}:${storagePath}`;
    const cached = signedOrderDesignUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;

    const { data, error } = await client.storage.from(bucket).createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    if (error || !data?.signedUrl) {
      throw new Error(`Gagal membuat URL desain tersimpan: ${error?.message || 'URL tidak tersedia.'}`);
    }
    signedOrderDesignUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: Date.now() + 6 * 24 * 60 * 60 * 1000,
    });
    return data.signedUrl;
  },

  async deleteOrderDesignFile(bucket: string, storagePath: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) return;
    const { error } = await client.storage.from(bucket).remove([storagePath]);
    if (error) throw new Error(`Gagal menghapus file desain dari Supabase Storage: ${error.message}`);
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
