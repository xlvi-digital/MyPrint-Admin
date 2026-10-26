import React, { useState } from 'react';
import { MessageSquare, Sparkles, Check, AlertCircle, Copy, ArrowRight, X } from 'lucide-react';
import { parseWhatsAppOrder } from '../../services/parserService';
import { WhatsAppParseResult } from '../../types/order';

interface WhatsAppParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyParsed: (result: WhatsAppParseResult) => void;
}

const SAMPLE_WA_MESSAGE = `Bang mau order jersey 20 pcs bahan Milano.
Nama:
Budi 10 M
Andi 7 L
Rizky 9 XL
Fahmi 12 XXL

Tidak pakai rib.
Atasan Milano.
Celana Lotto saku 1.

Desain nanti saya kirim.
Atas nama: PASDAMA MENES
No WA: 082128346174`;

export const WhatsAppParserModal: React.FC<WhatsAppParserModalProps> = ({
  isOpen,
  onClose,
  onApplyParsed,
}) => {
  const [rawText, setRawText] = useState('');
  const [parseResult, setParseResult] = useState<WhatsAppParseResult | null>(null);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setRawText(text);
    if (text.trim().length > 10) {
      const res = parseWhatsAppOrder(text);
      setParseResult(res);
    } else {
      setParseResult(null);
    }
  };

  const handleUseSample = () => {
    handleTextChange(SAMPLE_WA_MESSAGE);
  };

  const handleConfirm = () => {
    if (!parseResult) return;
    onApplyParsed(parseResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 no-print">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-neutral-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200/80 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-neutral-900 text-sm sm:text-base">
                  Import Order dari Chat WhatsApp
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Smart AI Parser
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Paste pesan WhatsApp dari pelanggan. Sistem membaca bahan, jumlah, roster pemain, dan catatan otomatis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-xl"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Top Actions: Paste box + Sample trigger */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <span>Tempelkan Chat WhatsApp:</span>
              </label>
              <button
                type="button"
                onClick={handleUseSample}
                className="text-[11px] font-semibold text-[#D71920] hover:text-[#b8141a] flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gunakan Contoh Chat Pelanggan</span>
              </button>
            </div>

            <textarea
              rows={5}
              value={rawText}
              onChange={e => handleTextChange(e.target.value)}
              placeholder="Contoh: Bang mau order jersey 20 pcs bahan Milano. Nama: Budi 10 M, Andi 7 L..."
              className="w-full p-3.5 text-xs font-mono rounded-2xl border border-neutral-200 focus:border-[#D71920] bg-neutral-50/50 focus:bg-white outline-none transition-all placeholder:text-neutral-400"
            />
          </div>

          {/* Structured Review Results (Requirement #10) */}
          {parseResult && (
            <div className="space-y-4 pt-2 border-t border-neutral-100 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-neutral-900 tracking-tight uppercase flex items-center gap-2">
                  <span>Hasil Pembacaan & Verifikasi Sistem</span>
                </h4>
                <span className="text-[11px] text-neutral-400">
                  Periksa data sebelum membuat order
                </span>
              </div>

              {/* Status Chips Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Pemesan */}
                <div className="p-3 rounded-2xl border border-neutral-200 bg-neutral-50/70">
                  <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                    <span className="text-neutral-500 uppercase">Pemesan</span>
                    {parseResult.detectedFields.customerName ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Terdeteksi
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" /> Perlu Diisi
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-neutral-900 truncate">
                    {parseResult.customerName || 'Belum ditemukan'}
                  </div>
                </div>

                {/* Bahan */}
                <div className="p-3 rounded-2xl border border-neutral-200 bg-neutral-50/70">
                  <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                    <span className="text-neutral-500 uppercase">Bahan</span>
                    {parseResult.detectedFields.material ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Terdeteksi
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" /> Perlu Diisi
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-[#D71920] truncate">
                    {parseResult.material || 'Belum ditemukan'}
                  </div>
                </div>

                {/* Jumlah */}
                <div className="p-3 rounded-2xl border border-neutral-200 bg-neutral-50/70">
                  <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                    <span className="text-neutral-500 uppercase">Total Qty</span>
                    {parseResult.detectedFields.quantity ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Terdeteksi
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" /> Belum Ada
                      </span>
                    )}
                  </div>
                  <div className="font-mono font-bold text-xs text-neutral-900">
                    {parseResult.quantity ? `${parseResult.quantity} pcs` : 'Belum ditemukan'}
                  </div>
                </div>

                {/* Detail Pemain */}
                <div className="p-3 rounded-2xl border border-neutral-200 bg-neutral-50/70">
                  <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                    <span className="text-neutral-500 uppercase">Roster Pemain</span>
                    {parseResult.detectedFields.players ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Terdeteksi
                      </span>
                    ) : (
                      <span className="text-neutral-400">Tidak Ada</span>
                    )}
                  </div>
                  <div className="font-mono font-bold text-xs text-neutral-900">
                    {parseResult.players.length} nama / no
                  </div>
                </div>
              </div>

              {/* Roster Table Preview */}
              {parseResult.players.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-neutral-800">
                    <span>Daftar Pemain Terbaca ({parseResult.players.length} baris)</span>
                    <span className="text-[11px] font-normal text-neutral-400">
                      Format: Nama | No Punggung | Ukuran
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-neutral-200 bg-white">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-neutral-100 text-neutral-600 font-bold sticky top-0">
                        <tr>
                          <th className="py-1.5 px-3 w-10 text-center">#</th>
                          <th className="py-1.5 px-3">Nama</th>
                          <th className="py-1.5 px-3 w-24 text-center">No</th>
                          <th className="py-1.5 px-3 w-24 text-center">Ukuran</th>
                          <th className="py-1.5 px-3 w-16 text-center">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200/60 font-medium">
                        {parseResult.players.map((p, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50">
                            <td className="py-1 px-3 text-center text-neutral-400">{idx + 1}</td>
                            <td className="py-1 px-3 font-sans font-bold text-neutral-900 uppercase">
                              {p.name}
                            </td>
                            <td className="py-1 px-3 text-center">{p.number}</td>
                            <td className="py-1 px-3 text-center font-bold text-[#D71920]">
                              {p.size}
                            </td>
                            <td className="py-1 px-3 text-center">{p.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Extracted Notes Preview */}
              {parseResult.notes.length > 0 && (
                <div className="p-3 bg-red-50/40 rounded-2xl border border-red-100">
                  <span className="text-[10px] font-bold text-[#D71920] uppercase tracking-wider block mb-1">
                    Instruksi Produksi Terdeteksi:
                  </span>
                  <ul className="list-disc pl-4 text-xs font-mono font-bold text-neutral-800 space-y-0.5">
                    {parseResult.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-50/90 border-t border-neutral-200/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!parseResult}
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#D71920] hover:bg-[#b8141a] text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-red-500/20 disabled:opacity-50"
          >
            <span>Terapkan ke Order Baru</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
