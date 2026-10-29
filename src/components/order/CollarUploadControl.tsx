import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ExternalLink,
  Eye
} from 'lucide-react';
import { CollarSpec } from '../../types/order';
import { supabaseStorageService, MAX_FILE_SIZE_BYTES } from '../../services/supabase/storageService';
import { useMasterData } from '../../hooks/useMasterData';

interface CollarUploadControlProps {
  orderId?: string;
  value: CollarSpec;
  onChange: (newCollar: CollarSpec, pendingFile?: File) => void;
  onUploadStart?: () => void;
  onUploadEnd?: (error?: string) => void;
  disabled?: boolean;
}

export const CollarUploadControl: React.FC<CollarUploadControlProps> = ({
  orderId,
  value,
  onChange,
  onUploadStart,
  onUploadEnd,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFullPreviewModal, setShowFullPreviewModal] = useState(false);
  const masterData = useMasterData();

  // Check if current model is among standard choices or custom
  const [isCustomMode, setIsCustomMode] = useState<boolean>(true);
  const [customModelText, setCustomModelText] = useState<string>(value.modelName === 'CUSTOM' ? '' : value.modelName);

  useEffect(() => {
    if (masterData.data.collar_models.length === 0) return;
    const isKnown = masterData.data.collar_models.some(item => item.name === value.modelName);
    setIsCustomMode(value.modelName === 'CUSTOM' || !isKnown);
    if (!isKnown && value.modelName !== 'CUSTOM') setCustomModelText(value.modelName);
  }, [masterData.data.collar_models, value.modelName]);

  // Handle Dropdown Change
  const handleModelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === 'CUSTOM') {
      setIsCustomMode(true);
      onChange({
        ...value,
        modelName: customModelText.trim() ? customModelText.toUpperCase() : 'CUSTOM',
      });
    } else {
      setIsCustomMode(false);
      onChange({
        ...value,
        modelName: selected,
      });
    }
  };

  // Handle Custom Model Text Change
  const handleCustomTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCustomModelText(text);
    onChange({
      ...value,
      modelName: text.toUpperCase() || 'CUSTOM',
    });
  };

  // Process File Selection / Drop
  const handleFile = async (file: File) => {
    setErrorMessage(null);

    // 1. Validate File
    const validation = supabaseStorageService.validateFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'File tidak valid.');
      return;
    }

    // 2. If we have an existing orderId, we can upload immediately to Supabase Storage
    if (orderId) {
      setIsUploading(true);
      onUploadStart?.();

      try {
        const uploadRes = await supabaseStorageService.uploadCollarImage(orderId, file);
        if (!uploadRes.success || !uploadRes.publicUrl) {
          throw new Error(uploadRes.error || 'Gagal mengunggah gambar ke storage.');
        }

        onChange(
          {
            ...value,
            imageUrl: uploadRes.publicUrl,
            imagePath: uploadRes.imagePath,
            updatedAt: new Date().toISOString(),
          },
          undefined // No pending file needed since already uploaded
        );

        onUploadEnd?.();
      } catch (err: any) {
        console.error('[CollarUploadControl] Upload failed:', err);
        setErrorMessage(err.message || 'Gagal mengunggah gambar referensi.');
        onUploadEnd?.(err.message);
      } finally {
        setIsUploading(false);
      }
    } else {
      // 3. For new orders not yet saved (in QuickOrder), create instant local preview URL and pass pending file
      try {
        const localPreviewUrl = await supabaseStorageService.fileToDataUrl(file);
        onChange(
          {
            ...value,
            imageUrl: localPreviewUrl,
            imagePath: `pending/${file.name}`,
            updatedAt: new Date().toISOString(),
          },
          file // Pass file to be uploaded when order is saved
        );
      } catch (err: any) {
        setErrorMessage('Gagal membaca gambar yang dipilih: ' + err.message);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
    // reset input so the same file can be reselected if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Remove Collar Image
  const handleRemoveImage = () => {
    setErrorMessage(null);
    onChange(
      {
        ...value,
        imageUrl: undefined,
        imagePath: undefined,
        updatedAt: new Date().toISOString(),
      },
      undefined
    );
  };

  // Trigger file picker
  const triggerFilePicker = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const hasImage = Boolean(value.imageUrl);
  const isStorageUrl = value.imageUrl?.includes('supabase') || value.imageUrl?.startsWith('http');

  return (
    <div className="space-y-3.5">
      {/* 1. MODEL SELECTION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
            <span>Model Kerah Jersey</span>
            <span className="text-[10px] font-mono text-[#D71920] font-bold px-1.5 py-0.2 rounded bg-red-50 border border-red-100">
              A4 Print Ready
            </span>
          </label>
          <span className="text-[11px] text-neutral-400">
            {isCustomMode ? 'Model Custom Pilihan Anda' : 'Standar Workshop'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className={isCustomMode ? 'sm:col-span-6' : 'sm:col-span-12'}>
            <select
              value={isCustomMode ? 'CUSTOM' : value.modelName || 'POLO KANCING 2'}
              onChange={handleModelSelectChange}
              disabled={disabled || isUploading}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200/90 bg-white font-bold text-neutral-800 outline-none focus:border-[#D71920] focus:ring-2 focus:ring-red-500/10 transition-all cursor-pointer disabled:opacity-50"
            >
              {masterData.options('collar_models', value.modelName, Boolean(orderId))
                .filter(item => item.name !== 'CUSTOM')
                .map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
              <option value="CUSTOM">★ MODEL CUSTOM (KETIK SENDIRI)...</option>
            </select>
          </div>

          {/* Custom Model Text Input */}
          {isCustomMode && (
            <div className="sm:col-span-6 animate-in fade-in duration-150">
              <input
                type="text"
                value={customModelText}
                onChange={handleCustomTextChange}
                disabled={disabled || isUploading}
                placeholder="Contoh: KERAH RETRO V-RIB HITAM MERAH"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-red-200 bg-red-50/30 font-bold text-neutral-900 placeholder:text-neutral-400 placeholder:font-normal outline-none focus:border-[#D71920] focus:ring-2 focus:ring-red-500/10 uppercase"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. IMAGE UPLOAD & PREVIEW AREA */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#D71920]" />
            <span>Foto / Gambar Referensi Kerah</span>
          </label>
          <span className="text-[10px] text-neutral-400">
            JPG, PNG, WebP (Maks. 5MB)
          </span>
        </div>

        {/* Hidden Native File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {/* CASE A: NO IMAGE YET -> DROPZONE */}
        {!hasImage ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFilePicker}
            className={`relative group border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-[#D71920] bg-red-50/50 scale-[1.01]'
                : 'border-neutral-200/90 hover:border-neutral-300 bg-neutral-50/60 hover:bg-neutral-50'
            } ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex items-center justify-center text-neutral-500 group-hover:text-[#D71920] group-hover:scale-105 transition-all">
                {isUploading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-[#D71920]" />
                ) : (
                  <UploadCloud className="w-5 h-5" />
                )}
              </div>

              <div>
                <span className="text-xs font-bold text-neutral-800 block group-hover:text-[#D71920] transition-colors">
                  {isUploading ? 'Mengunggah ke Supabase...' : 'Klik atau seret foto kerah ke sini'}
                </span>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Foto fisik kerah, potongan pola, atau sketsa untuk panduan bagian jahit
                </p>
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-[10px] font-medium text-neutral-600 shadow-2xs">
                <span>Pilih Foto Kerah</span>
              </div>
            </div>
          </div>
        ) : (
          /* CASE B: IMAGE EXISTS -> PREVIEW & CONTROLS */
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-3 shadow-2xs flex flex-col sm:flex-row items-center gap-4">
            {/* Aspect Ratio Preserved Thumbnail */}
            <div 
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-neutral-50 border border-neutral-200 overflow-hidden flex items-center justify-center shrink-0 p-1 group cursor-pointer"
              onClick={() => setShowFullPreviewModal(true)}
              title="Klik untuk melihat ukuran penuh"
            >
              <img
                src={value.imageUrl}
                alt={value.modelName || 'Model Kerah'}
                className="max-w-full max-h-full object-contain drop-shadow-2xs"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                <Eye className="w-5 h-5" />
              </div>
            </div>

            {/* Info & Action Buttons */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Foto Terpasang</span>
                </span>
                {isStorageUrl && (
                  <span className="text-[10px] font-mono text-neutral-400">
                    (Cloud Storage)
                  </span>
                )}
              </div>

              <div className="font-bold text-xs text-neutral-900 truncate uppercase">
                {value.modelName || 'POLO KANCING 2'}
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                {value.imagePath || 'Foto referensi visual terhubung dengan lembar cetak A4'}
              </p>

              {/* Action Buttons: Ganti Gambar & Hapus Gambar */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                <button
                  type="button"
                  onClick={triggerFilePicker}
                  disabled={disabled || isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:scale-[0.98] rounded-xl transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                  <span>{isUploading ? 'Mengunggah...' : 'Ganti Gambar'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={disabled || isUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 active:scale-[0.98] rounded-xl transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Gambar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFullPreviewModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 rounded-xl"
                  title="Lihat ukuran penuh"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Validation / Upload Error Message */}
        {errorMessage && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#D71920] shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-700 hover:text-red-900 font-bold px-1.5 text-xs"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* MODAL FULL PREVIEW */}
      {showFullPreviewModal && value.imageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs no-print animate-in fade-in duration-150">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl p-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase text-neutral-800">
                  Referensi Kerah: {value.modelName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFullPreviewModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-neutral-900 rounded-2xl my-2">
              <img
                src={value.imageUrl}
                alt={value.modelName}
                className="max-h-[60vh] max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="text-center text-xs text-neutral-500 pt-1">
              Visual ini akan otomatis muncul pada bagian "MODEL KERAH" di Form Order Sublime A4.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
