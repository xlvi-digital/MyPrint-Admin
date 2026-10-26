import React, { useState } from 'react';
import { DesignAsset } from '../../types/order';
import { 
  Image as ImageIcon, 
  UploadCloud, 
  Trash2, 
  Eye, 
  X, 
  Sparkles,
  Maximize2
} from 'lucide-react';

interface DesignUploaderProps {
  designs: DesignAsset[];
  onChange: (designs: DesignAsset[]) => void;
  materialName?: string;
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
  materialName = 'Milano',
}) => {
  const [selectedPreview, setSelectedPreview] = useState<DesignAsset | null>(null);
  const [selectedSlot, setSelectedSlot] = useState(DESIGN_PRESET_SLOTS[0]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        alert('Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau SVG.');
        return;
      }

      // Check max size (approx 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran gambar terlalu besar. Maksimum 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = event => {
        const dataUrl = event.target?.result as string;
        const newAsset: DesignAsset = {
          id: `design-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          label: selectedSlot || file.name.replace(/\.[^/.]+$/, ''),
          dataUrl,
          fileName: file.name,
        };
        onChange([...designs, newAsset]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleDelete = (id: string) => {
    onChange(designs.filter(d => d.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-neutral-100 gap-3">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#D71920]" />
            <span>Upload Desain Produk (Sublimation Artwork)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            File desain mock-up jersey, pola potongan, atau gambar visual untuk panduan operator printing.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
          Step 3
        </span>
      </div>

      {/* Upload Dropzone */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1 flex flex-col gap-3">
          <label className="block text-xs font-semibold text-neutral-700">
            Pilih Kategori Posisi Desain
          </label>
          <select
            value={selectedSlot}
            onChange={e => setSelectedSlot(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:border-neutral-400 outline-none font-medium"
          >
            {DESIGN_PRESET_SLOTS.map(slot => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>

          {/* Drag & Drop Area */}
          <label className="flex-1 min-h-[160px] border-2 border-dashed border-neutral-300 hover:border-[#D71920] rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-red-50/20 group">
            <UploadCloud className="w-8 h-8 text-neutral-400 group-hover:text-[#D71920] transition-colors mb-2" />
            <span className="text-xs font-bold text-neutral-800">
              Klik atau Drag & Drop Gambar
            </span>
            <span className="text-[10px] text-neutral-400 mt-1 max-w-[180px] leading-tight">
              JPG, PNG, WEBP (Maks 10MB). Resolusi tajam direkomendasikan.
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Gallery Preview of uploaded artwork */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-neutral-700">
              Galeri Desain Terupload ({designs.length})
            </label>
            <span className="text-[10px] text-neutral-400">
              Format: Object-fit contain (tidak memotong proporsi)
            </span>
          </div>

          {designs.length === 0 ? (
            <div className="h-44 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 flex flex-col items-center justify-center text-neutral-400 text-xs p-4 text-center">
              <ImageIcon className="w-8 h-8 mb-2 text-neutral-300" />
              <span>Belum ada desain diupload untuk pesanan ini.</span>
              <span className="text-[10px] text-neutral-400 mt-0.5">
                Operator workshop membutuhkan visual desain yang jelas.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {designs.map(design => (
                <div
                  key={design.id}
                  className="group relative rounded-xl border border-neutral-200/80 bg-neutral-50/40 p-2 overflow-hidden hover:shadow-md transition-all flex flex-col"
                >
                  <div className="relative aspect-4/3 w-full bg-white rounded-lg overflow-hidden flex items-center justify-center border border-neutral-100">
                    <img
                      src={design.dataUrl}
                      alt={design.label}
                      className="w-full h-full object-contain p-1 opacity-100 filter-none mix-blend-normal"
                    />
                    <div className="absolute inset-0 bg-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPreview(design)}
                        className="p-1.5 bg-white text-neutral-900 rounded-lg shadow-sm hover:scale-105 transition-transform"
                        title="Perbesar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(design.id)}
                        className="p-1.5 bg-red-600 text-white rounded-lg shadow-sm hover:scale-105 transition-transform"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 px-0.5">
                    <p className="text-[11px] font-bold text-neutral-800 truncate" title={design.label}>
                      {design.label}
                    </p>
                    <p className="text-[9px] text-[#D71920] font-semibold uppercase tracking-wider">
                      Bahan: {materialName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200">
              <div>
                <h4 className="font-bold text-neutral-900 text-sm">{selectedPreview.label}</h4>
                <p className="text-xs text-neutral-400">{selectedPreview.fileName || 'Preview Gambar Desain'}</p>
              </div>
              <button
                onClick={() => setSelectedPreview(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] flex items-center justify-center overflow-auto p-2 bg-neutral-100 rounded-xl">
              <img
                src={selectedPreview.dataUrl}
                alt={selectedPreview.label}
                className="max-h-[70vh] w-auto object-contain rounded opacity-100 filter-none mix-blend-normal"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
