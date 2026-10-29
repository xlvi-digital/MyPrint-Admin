import React, { useMemo, useState } from 'react';
import { Check, Edit3, LoaderCircle, Plus, Search, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useMasterData } from '../hooks/useMasterData';
import {
  MasterDataCategory,
  MasterDataEntry,
  MasterDataValues,
  masterDataCategoryLabels,
  masterDataService,
} from '../services/supabase/masterDataService';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

const categories = Object.keys(masterDataCategoryLabels) as MasterDataCategory[];

const emptyValues: MasterDataValues = { name: '', code: '', description: '' };

export const MasterData: React.FC = () => {
  const { data, isLoading, error, isLocalFallback, reload } = useMasterData();
  const { session, role } = useSupabaseAuth();
  const canManage = Boolean(session && (role === 'owner' || role === 'admin'));
  const [category, setCategory] = useState<MasterDataCategory>('materials');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<MasterDataEntry | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [values, setValues] = useState<MasterDataValues>(emptyValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmEntry, setConfirmEntry] = useState<MasterDataEntry | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const entries = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return data[category].filter(entry =>
      !q || `${entry.name} ${entry.code || ''} ${entry.description}`.toLocaleLowerCase().includes(q),
    );
  }, [category, data, query]);

  const beginCreate = () => {
    setEditing(null);
    setValues(emptyValues);
    setIsFormOpen(true);
    setFormError(null);
  };

  const beginEdit = (entry: MasterDataEntry) => {
    setEditing(entry);
    setValues({ name: entry.name, code: entry.code || '', description: entry.description });
    setIsFormOpen(true);
    setFormError(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = values.name.trim();
    const code = values.code?.trim().toUpperCase() || '';
    if (!name || (category === 'jersey_sizes' && !code)) {
      setFormError(category === 'jersey_sizes' ? 'Kode dan nama ukuran wajib diisi.' : 'Nama wajib diisi.');
      return;
    }

    const duplicate = data[category].some(entry =>
      entry.id !== editing?.id && (
        entry.name.toLocaleLowerCase() === name.toLocaleLowerCase()
        || (category === 'jersey_sizes' && entry.code?.toLocaleLowerCase() === code.toLocaleLowerCase())
      ),
    );
    if (duplicate) {
      setFormError(category === 'jersey_sizes' ? 'Kode atau nama ukuran sudah digunakan.' : 'Nama sudah digunakan.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      if (editing) await masterDataService.update(category, editing.id, { ...values, name, code });
      else await masterDataService.create(category, { ...values, name, code });
      setEditing(null);
      setValues(emptyValues);
      setIsFormOpen(false);
      setMessage('Data master berhasil disimpan.');
      await reload();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan data master.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!confirmEntry || isToggling) return;
    const entry = confirmEntry;
    setMessage(null);
    setFormError(null);
    setIsToggling(true);
    try {
      await masterDataService.setActive(category, entry.id, !entry.isActive);
      setMessage(`${entry.name} berhasil ${entry.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`);
      setConfirmEntry(null);
      await reload();
    } catch (toggleError) {
      setFormError(toggleError instanceof Error ? toggleError.message : 'Gagal mengubah status data.');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-neutral-900">Pengelolaan Data Master</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Pilihan aktif digunakan pada order baru. Data yang dinonaktifkan tetap terlihat pada order lama.
            </p>
          </div>
          {session?.user.email && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">
                <ShieldCheck className="h-4 w-4" /> {session.user.email} · {role}
              </span>
            </div>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-amber-800">
          Hak ubah dibatasi oleh RLS Supabase dan memerlukan klaim server-managed <code>app_metadata.role</code> bernilai <code>owner</code> atau <code>admin</code>. Peran profil lokal aplikasi bukan sumber otorisasi.
        </p>
        {session && !canManage && (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            Akses ditolak untuk pengelolaan Data Master. Akun sudah masuk, tetapi tidak memiliki role owner/admin pada app_metadata.
          </p>
        )}
        {isLocalFallback && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
            Supabase belum dikonfigurasi. Order lokal tetap memakai pilihan bawaan, tetapi perubahan Data Master memerlukan koneksi Supabase.
          </p>
        )}
        {error && (
          <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <span>Gagal memuat data master: {error}</span>
            <button type="button" onClick={() => void reload()} disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-bold text-red-700 hover:bg-red-100 disabled:opacity-50">
              {isLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
              {isLoading ? 'Memuat...' : 'Coba lagi'}
            </button>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="flex gap-2 overflow-x-auto border-b border-neutral-200 p-3">
          {categories.map(item => (
            <button key={item} onClick={() => { setCategory(item); setEditing(null); setIsFormOpen(false); setMessage(null); setFormError(null); }}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${category === item ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>
              {masterDataCategoryLabels[item]}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Cari ${masterDataCategoryLabels[category].toLowerCase()}...`} className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-neutral-400" />
          </div>
          <button onClick={beginCreate} disabled={isLocalFallback || !canManage} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D71920] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#b8141a] disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="h-4 w-4" /> Tambah Data
          </button>
        </div>

        {(message || formError) && (
          <div className={`mx-4 mb-3 rounded-xl border p-3 text-xs ${formError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {formError || message}
          </div>
        )}

        {isFormOpen && (
          <form onSubmit={handleSave} className="mx-4 mb-4 grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2">
            {category === 'jersey_sizes' && (
              <label className="text-xs font-semibold text-neutral-700">
                Kode ukuran *
                <input required value={values.code || ''} onChange={event => setValues({ ...values, code: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono outline-none focus:border-[#D71920]" />
              </label>
            )}
            <label className="text-xs font-semibold text-neutral-700">
              {category === 'jersey_sizes' ? 'Nama ukuran *' : 'Nama *'}
              <input required value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 outline-none focus:border-[#D71920]" />
            </label>
            <label className="text-xs font-semibold text-neutral-700 sm:col-span-2">
              Keterangan (opsional)
              <textarea rows={2} value={values.description} onChange={event => setValues({ ...values, description: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 outline-none focus:border-[#D71920]" />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => { setEditing(null); setValues(emptyValues); setIsFormOpen(false); setFormError(null); }} className="rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-200">Batal</button>
              <button disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {isSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="bg-neutral-50 text-[10px] uppercase tracking-wide text-neutral-500">
              <tr>
                {category === 'jersey_sizes' && <th className="px-4 py-3">Kode</th>}
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index} className="animate-pulse">
                    {category === 'jersey_sizes' && <td className="px-4 py-4"><div className="h-3 w-12 rounded bg-neutral-200" /></td>}
                    <td className="px-4 py-4"><div className="h-3 w-32 rounded bg-neutral-200" /></td>
                    <td className="px-4 py-4"><div className="h-3 w-40 rounded bg-neutral-100" /></td>
                    <td className="px-4 py-4"><div className="h-5 w-16 rounded-full bg-neutral-100" /></td>
                    <td className="px-4 py-4"><div className="ml-auto h-6 w-16 rounded bg-neutral-100" /></td>
                  </tr>
                ))
              ) : entries.length ? entries.map(entry => (
                <tr key={entry.id} className="hover:bg-neutral-50">
                  {category === 'jersey_sizes' && <td className="px-4 py-3 font-mono font-bold">{entry.code}</td>}
                  <td className="px-4 py-3 font-semibold text-neutral-900">{entry.name}</td>
                  <td className="px-4 py-3 text-neutral-500">{entry.description || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${entry.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      {entry.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button disabled={isLocalFallback || !canManage} onClick={() => beginEdit(entry)} title="Edit data" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button disabled={isLocalFallback || !canManage || isToggling} onClick={() => setConfirmEntry(entry)} title={entry.isActive ? 'Nonaktifkan' : 'Aktifkan'} className={`rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-40 ${entry.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}`}>
                        {isToggling && confirmEntry?.id === entry.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : entry.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={category === 'jersey_sizes' ? 5 : 4} className="px-4 py-10 text-center text-neutral-500">Tidak ada data yang cocok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmModal
        isOpen={Boolean(confirmEntry)}
        title={`${confirmEntry?.isActive ? 'Nonaktifkan' : 'Aktifkan'} data master?`}
        subtitle={confirmEntry?.name}
        type={confirmEntry?.isActive ? 'warning' : 'default'}
        confirmText={confirmEntry?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        onCancel={() => setConfirmEntry(null)}
        onConfirm={() => void handleToggleActive()}
        isProcessing={isToggling}
        processingText="Memperbarui..."
      >
        <p>Data lama pada order tidak berubah. {confirmEntry?.isActive ? 'Data nonaktif tidak akan muncul untuk order baru.' : 'Data ini kembali tersedia pada order baru.'}</p>
      </ConfirmModal>
    </div>
  );
};
