import React, { useRef, useState } from 'react';
import { DesignAsset } from '../../types/order';
import {
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Eye,
  X,
  Sparkles,
  LoaderCircle,
  Replace,
} from 'lucide-react';
import { supabaseStorageService } from '../../services/supabase/storageService';
import { supabaseOrderService } from '../../services/supabase/orderService';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { isSupabaseConfigured } from '../../services/supabase/client';

interface DesignUploaderProps {
  designs: DesignAsset[];
  onChange: (designs: DesignAsset[]) => void | Promise<void>;
  orderId: string;
  materialName?: string;
  disabled?: boolean;
}

interface UploadStatus {
  id: string;
  fileName: string;
  status: 'queued' | 'uploading' | 'uploaded' | 'failed';
}

const DESIGN_PRESET_SLOTS = [
  'Tampak Depan & Belakang (Full Sublime)',
  'Desain Depan',
  'Desain Belakang',
  'Desain Lengan Kiri & Kanan',
  'Desain Celana / Bawahan',
  'Referensi Motif / Detail Logo',
];

export const DesignUploader: React.FC<DesignUploaderProps> = ({
  designs,
  onChange,
  orderId,
  materialName = 'Milano',
  disabled = false,
}) => {
  const [selectedPreview, setSelectedPreview] = useState<DesignAsset | null>(null);
  const [selectedSlot, setSelectedSlot] = useState(DESIGN_PRESET_SLOTS[0]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [deletingDesignId, setDeletingDesignId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { role } = useSupabaseAuth();
  const hasManagementAccess = !isSupabaseConfigured() || role === 'owner' || role === 'admin';
  const isDisabled = disabled || !hasManagementAccess;
  const replaceTarget = useRef<string | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const applyChange = async (nextDesigns: DesignAsset[], newlyUploaded: DesignAsset[] = []) => {
    try {
      await onChange(nextDesigns);
      return true;
    } catch (saveError) {
      const cleanupErrors: string[] = [];
      await Promise.all(newlyUploaded.map(async design => {
        if (!design.storagePath || !design.storageBucket) return;
        try {
          await supabaseOrderService.deleteDesignAssetIfUnreferenced(design.storageBucket, design.storagePath);
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError instanceof Error ? cleanupError.message : 'File gagal dibersihkan.');
        }
      }));
      setError([
        saveError instanceof Error ? saveError.message : 'Perubahan desain gagal disimpan.',
        ...cleanupErrors,
      ].join(' '));
      return false;
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const targetId = replaceTarget.current;
    event.target.value = '';
    replaceTarget.current = null;
    if (!files.length) return;
    if (targetId && files.length > 1) {
      setError('Pilih satu file saja untuk mengganti desain.');
      return;
    }

    setError(null);
    setUploadingFiles(files.map(file => file.name));
    const statuses = files.map((file, index) => ({
      id: `${index}-${file.name}`,
      fileName: file.name,
      status: 'queued' as const,
    }));
    setUploadStatuses(statuses);
    const uploadedDesigns: DesignAsset[] = [];
    const errors: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        const statusId = statuses[index].id;
        setUploadStatuses(current => current.map(item => item.id === statusId ? { ...item, status: 'uploading' } : item));
        let result;
        try {
          result = await supabaseStorageService.uploadOrderDesign(orderId, file);
        } catch (uploadError) {
          errors.push(uploadError instanceof Error ? `Gagal mengunggah ${file.name}: ${uploadError.message}` : `Gagal mengunggah ${file.name}.`);
          setUploadStatuses(current => current.map(item => item.id === statusId ? { ...item, status: 'failed' } : item));
          continue;
        }
        if (!result.success || !result.imageUrl) {
          errors.push(result.error || `Gagal mengunggah ${file.name}.`);
          setUploadStatuses(current => current.map(item => item.id === statusId ? { ...item, status: 'failed' } : item));
          continue;
        }
        setUploadStatuses(current => current.map(item => item.id === statusId ? { ...item, status: 'uploaded' } : item));
        const previous = targetId ? designs.find(design => design.id === targetId) : undefined;
        uploadedDesigns.push({
          id: targetId || `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          label: previous?.label || selectedSlot || file.name.replace(/\.[^/.]+$/, ''),
          dataUrl: result.imageUrl,
          fileName: file.name,
          storagePath: result.storagePath,
          storageBucket: result.storageBucket,
        });
      }

      if (uploadedDesigns.length) {
        const nextDesigns = targetId
          ? designs.map(design => design.id === targetId ? uploadedDesigns[0] : design)
          : [...designs, ...uploadedDesigns];
        const saved = await applyChange(nextDesigns, uploadedDesigns);
        if (saved) {
          const first = uploadedDesigns[0];
          setSelectedPreview(first);
          if (targetId) {
            const previous = designs.find(design => design.id === targetId);
            if (previous?.storagePath && previous.storageBucket) {
              try {
                await supabaseOrderService.deleteDesignAssetIfUnreferenced(previous.storageBucket, previous.storagePath);
              } catch (cleanupError) {
                setError(cleanupError instanceof Error ? cleanupError.message : 'File desain lama gagal dibersihkan.');
              }
            }
          }
        }
      }
      if (errors.length) setError(errors.join(' '));
    } catch (uploadFlowError) {
      setError(uploadFlowError instanceof Error ? uploadFlowError.message : 'Proses upload desain gagal.');
    } finally {
      setUploadingFiles([]);
    }
  };

  const handleDelete = async (design: DesignAsset) => {
    if (!window.confirm(`Hapus desain "${design.fileName || design.label}"? Perubahan tersimpan setelah order diperbarui.`)) return;
    setError(null);
    setDeletingDesignId(design.id);
    try {
      const saved = await applyChange(designs.filter(item => item.id !== design.id));
      if (!saved) return;
      if (selectedPreview?.id === design.id) setSelectedPreview(null);
      if (design.storagePath && design.storageBucket) {
        try {
          await supabaseOrderService.deleteDesignAssetIfUnreferenced(design.storageBucket, design.storagePath);
        } catch (deleteError) {
          setError(deleteError instanceof Error ? deleteError.message : 'File desain gagal dibersihkan.');
        }
      }
    } finally {
      setDeletingDesignId(null);
    }
  };

  const handleReplaceClick = (designId: string) => {
    replaceTarget.current = designId;
    replaceInput.current?.click();
  };

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs sm:p-6">
      <div className="mb-5 flex flex-col gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-neutral-900">
            <ImageIcon className="h-4 w-4 text-[#D71920]" />
            <span>Upload Desain Produk</span>
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">JPG, JPEG, PNG, atau WebP · Maksimum 10 MB per gambar · Tersimpan di Supabase Storage.</p>
        </div>
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">Step 3</span>
      </div>

      <input ref={replaceInput} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" disabled={isDisabled || uploadingFiles.length > 0} />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="flex flex-col gap-3">
          <label className="block text-xs font-semibold text-neutral-700">
            Kategori Posisi Desain
            <select value={selectedSlot} onChange={event => setSelectedSlot(event.target.value)} disabled={isDisabled || uploadingFiles.length > 0} className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium outline-none focus:border-neutral-400">
              {DESIGN_PRESET_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </label>

          <label className={`flex min-h-[150px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${isDisabled || uploadingFiles.length ? 'cursor-not-allowed border-neutral-200 bg-neutral-100' : 'cursor-pointer border-neutral-300 bg-neutral-50/50 hover:border-[#D71920] hover:bg-red-50/20'}`}>
            {uploadingFiles.length ? <LoaderCircle className="mb-2 h-8 w-8 animate-spin text-[#D71920]" /> : <UploadCloud className="mb-2 h-8 w-8 text-neutral-400" />}
            <span className="text-xs font-bold text-neutral-800">{uploadingFiles.length ? `Mengunggah ${uploadingFiles.length} gambar...` : 'Pilih beberapa gambar'}</span>
            <span className="mt-1 max-w-[190px] text-[10px] leading-tight text-neutral-500">
              {uploadingFiles.length ? uploadingFiles.join(', ') : 'JPG, JPEG, PNG, WebP · Maks 10 MB tiap file'}
            </span>
            <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple onChange={handleUpload} disabled={isDisabled || uploadingFiles.length > 0} className="hidden" />
          </label>
        </div>

        <div className="md:col-span-2">
          {uploadStatuses.length > 0 && (
            <ul className="mb-3 space-y-1.5" aria-live="polite">
              {uploadStatuses.map(item => (
                <li key={item.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px]">
                  {item.status === 'uploading' || item.status === 'queued'
                    ? <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-[#D71920]" />
                    : item.status === 'uploaded'
                      ? <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      : <X className="h-3.5 w-3.5 shrink-0 text-red-600" />}
                  <span className="min-w-0 flex-1 truncate">{item.fileName}</span>
                  <span className={item.status === 'failed' ? 'font-semibold text-red-700' : 'text-neutral-500'}>
                    {item.status === 'queued' ? 'Menunggu' : item.status === 'uploading' ? 'Mengunggah...' : item.status === 'uploaded' ? 'Terunggah' : 'Gagal'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-neutral-700">Galeri Desain ({designs.length})</label>
            <span className="text-[10px] text-neutral-400">Preview proporsi penuh · Bahan: {materialName}</span>
          </div>

          {designs.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 text-center text-xs text-neutral-400">
              <ImageIcon className="mb-2 h-8 w-8 text-neutral-300" />
              <span>Belum ada desain untuk order ini.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {designs.map(design => (
                <article key={design.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/40 p-2 hover:shadow-md">
                  <button type="button" onClick={() => setSelectedPreview(design)} className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border border-neutral-100 bg-white" title={`Perbesar ${design.label}`}>
                    <img src={design.dataUrl} alt={design.label} className="h-full w-full object-contain p-1" />
                  </button>
                  <div className="mt-2 min-w-0">
                    <p className="truncate text-[11px] font-bold text-neutral-800" title={design.fileName || design.label}>{design.fileName || design.label}</p>
                    <p className="truncate text-[10px] text-neutral-500" title={design.label}>{design.label}</p>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <button type="button" disabled={isDisabled || uploadingFiles.length > 0} onClick={() => setSelectedPreview(design)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50">
                      <Eye className="h-3 w-3" /> Preview
                    </button>
                    <button type="button" disabled={isDisabled || uploadingFiles.length > 0} onClick={() => handleReplaceClick(design.id)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50">
                      <Replace className="h-3 w-3" /> Ganti
                    </button>
                    <button type="button" disabled={isDisabled || uploadingFiles.length > 0 || deletingDesignId !== null} onClick={() => void handleDelete(design)} className="flex items-center justify-center rounded-lg border border-red-100 bg-white px-2 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50" title="Hapus desain">
                      {deletingDesignId === design.id ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      {!hasManagementAccess && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Upload dan pengelolaan desain memerlukan app_metadata.role owner atau admin.</p>}
      {!uploadingFiles.length && <p className="mt-4 flex items-center gap-1.5 text-[10px] text-neutral-400"><Sparkles className="h-3 w-3" />Gambar terhubung ke order ini dan disimpan dalam bucket privat.</p>}

      {selectedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Preview desain">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-bold text-neutral-900">{selectedPreview.label}</h4>
                <p className="truncate text-xs text-neutral-500">{selectedPreview.fileName || 'Preview gambar desain'}</p>
              </div>
              <button type="button" onClick={() => setSelectedPreview(null)} aria-label="Tutup preview" className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-xl bg-neutral-100 p-2">
              <img src={selectedPreview.dataUrl} alt={selectedPreview.label} className="max-h-[70vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
