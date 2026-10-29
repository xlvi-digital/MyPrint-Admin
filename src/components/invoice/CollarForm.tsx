import React, { useState } from 'react';
import { CollarSpec } from '../../types/order';
import { Shirt, Upload, Trash2, LoaderCircle } from 'lucide-react';
import { useMasterData } from '../../hooks/useMasterData';
import { supabaseStorageService } from '../../services/supabase/storageService';

interface CollarFormProps {
  orderId: string;
  collar: CollarSpec;
  onChange: (collar: CollarSpec) => void;
  preserveLegacyValues?: boolean;
}

export const CollarForm: React.FC<CollarFormProps> = ({ orderId, collar, onChange, preserveLegacyValues = true }) => {
  const masterData = useMasterData();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = supabaseStorageService.validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'File gambar tidak valid.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await supabaseStorageService.uploadCollarImage(orderId, file);
      if (!result.success || !result.publicUrl || !result.imagePath) {
        throw new Error(result.error || 'Gagal mengunggah gambar kerah ke Supabase Storage.');
      }
      onChange({
        ...collar,
        imageUrl: result.publicUrl,
        imagePath: result.imagePath,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Gagal mengunggah gambar kerah.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    onChange({
      ...collar,
      imageUrl: undefined,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Shirt className="w-4 h-4 text-[#D71920]" />
            <span>Spesifikasi Model Kerah</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Tipe kerah (Polo, O-Neck, V-Neck) dan visual contoh fitting leher.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Model Kerah text selection */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Pilihan Model Kerah
            </label>
            <select
              value={masterData.options('collar_models', collar.modelName, preserveLegacyValues).some(item => item.name === collar.modelName)
                ? collar.modelName
                : 'CUSTOM'}
              onChange={e => onChange({ ...collar, modelName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:border-neutral-400 outline-none font-bold text-neutral-900 mb-2"
            >
              {masterData.options('collar_models', collar.modelName, preserveLegacyValues)
                .filter(item => item.name !== 'CUSTOM')
                .map(item => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
              <option value="CUSTOM">CUSTOM</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Keterangan Model Custom (Jika Diperlukan)
            </label>
            <input
              type="text"
              value={collar.modelName}
              onChange={e => onChange({ ...collar, modelName: e.target.value.toUpperCase() })}
              placeholder="Contoh: POLO KANCING 2 / V-NECK RIB TUMPANG"
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:border-[#D71920] outline-none font-bold text-neutral-900 uppercase"
            />
          </div>

          <label className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors ${isUploading ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
            {isUploading
              ? <LoaderCircle className="w-3.5 h-3.5 animate-spin text-neutral-500" />
              : <Upload className="w-3.5 h-3.5 text-neutral-500" />}
            <span>{isUploading ? 'Mengunggah...' : collar.imageUrl ? 'Ganti Foto Kerah' : 'Upload Foto Contoh Kerah'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          {uploadError && <p className="mt-2 text-xs text-red-600" role="alert">{uploadError}</p>}
        </div>

        {/* Collar Mockup Preview */}
        <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 min-h-[140px]">
          {collar.imageUrl ? (
            <div className="relative group w-full max-w-[220px] aspect-4/3 flex items-center justify-center bg-white rounded-lg p-1 border border-neutral-200">
              <img
                src={collar.imageUrl}
                alt={collar.modelName}
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-md shadow-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title="Hapus Foto"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="text-center text-neutral-400 text-xs p-4">
              <Shirt className="w-6 h-6 mx-auto mb-1 text-neutral-300" />
              <span>Belum ada foto model kerah.</span>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                (Akan ditampilkan di section Kerah pada PDF)
              </p>
            </div>
          )}
          <span className="text-[11px] font-bold text-neutral-800 mt-2 text-center uppercase tracking-wide">
            {collar.modelName || 'POLO KANCING 2'}
          </span>
        </div>
      </div>
    </div>
  );
};
