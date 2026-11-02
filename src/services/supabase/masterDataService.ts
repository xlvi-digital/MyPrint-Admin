import { getSupabaseClient, isSupabaseConfigured } from './client';
import { STANDARD_SIZES } from '../../types/order';

export type MasterDataCategory = 'materials' | 'jersey_sizes' | 'product_types' | 'collar_models';

export interface MasterDataEntry {
  id: string;
  name: string;
  code?: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MasterDataValues = {
  name: string;
  code?: string;
  description: string;
};

const categories: MasterDataCategory[] = ['materials', 'jersey_sizes', 'product_types', 'collar_models'];
let cachedMasterData: Record<MasterDataCategory, MasterDataEntry[]> | null = null;
let masterDataRequest: Promise<Record<MasterDataCategory, MasterDataEntry[]>> | null = null;

const requireClient = () => {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) {
    throw new Error('Supabase belum dikonfigurasi. Hubungkan database di Pengaturan terlebih dahulu.');
  }
  return client;
};

const mapEntry = (row: Record<string, unknown>): MasterDataEntry => ({
  id: String(row.id),
  name: String(row.name || ''),
  code: typeof row.code === 'string' ? row.code : undefined,
  description: String(row.description || ''),
  isActive: Boolean(row.is_active),
  createdAt: String(row.created_at || ''),
  updatedAt: String(row.updated_at || ''),
});

const throwDatabaseError = (action: string, error: { message: string; code?: string }) => {
  throw new Error(`${action}: ${error.message}${error.code ? ` (${error.code})` : ''}`);
};

export const masterDataService = {
  async resolveId(category: MasterDataCategory, value: string): Promise<string | null> {
    if (!value.trim()) return null;
    const records = (await this.listAll())[category];
    const record = records.find(entry => category === 'jersey_sizes'
      ? entry.code === value.trim()
      : entry.name === value.trim());
    return record?.id || null;
  },

  async listAll(forceRefresh = false): Promise<Record<MasterDataCategory, MasterDataEntry[]>> {
    if (!forceRefresh && cachedMasterData) return cachedMasterData;
    if (!forceRefresh && masterDataRequest) return masterDataRequest;
    const client = requireClient();
    masterDataRequest = (async () => {
      const results = await Promise.all(categories.map(async category => {
        const sortColumn = category === 'jersey_sizes' ? 'code' : 'name';
        const { data, error } = await client.from(category).select('*').order(sortColumn, { ascending: true });
        if (error) throwDatabaseError(`Gagal membaca data ${category}`, error);
        const entries = (data || []).map((row: Record<string, unknown>) => mapEntry(row));
        if (category === 'jersey_sizes') {
          entries.sort((left, right) => {
            const leftIndex = STANDARD_SIZES.indexOf(left.code || left.name);
            const rightIndex = STANDARD_SIZES.indexOf(right.code || right.name);
            if (leftIndex !== -1 || rightIndex !== -1) {
              return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex)
                - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
            }
            return left.name.localeCompare(right.name);
          });
        }
        return [category, entries] as const;
      }));
      cachedMasterData = Object.fromEntries(results) as Record<MasterDataCategory, MasterDataEntry[]>;
      return cachedMasterData;
    })();
    try {
      return await masterDataRequest;
    } finally {
      masterDataRequest = null;
    }
  },

  async create(category: MasterDataCategory, values: MasterDataValues): Promise<MasterDataEntry> {
    const client = requireClient();
    const payload = {
      name: values.name.trim(),
      ...(category === 'jersey_sizes' ? { code: values.code?.trim().toUpperCase() } : {}),
      description: values.description.trim() || null,
    };
    const { data, error } = await client.from(category).insert(payload).select('*').single();
    if (error) throwDatabaseError('Gagal menambahkan data master', error);
    cachedMasterData = null;
    return mapEntry(data);
  },

  async update(category: MasterDataCategory, id: string, values: MasterDataValues): Promise<MasterDataEntry> {
    const client = requireClient();
    const payload = {
      name: values.name.trim(),
      ...(category === 'jersey_sizes' ? { code: values.code?.trim().toUpperCase() } : {}),
      description: values.description.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await client.from(category).update(payload).eq('id', id).select('*').single();
    if (error) throwDatabaseError('Gagal mengubah data master', error);
    cachedMasterData = null;
    return mapEntry(data);
  },

  async setActive(category: MasterDataCategory, id: string, isActive: boolean): Promise<void> {
    const client = requireClient();
    const { error } = await client.from(category).update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throwDatabaseError('Gagal mengubah status data master', error);
    cachedMasterData = null;
  },
};

export const masterDataCategoryLabels: Record<MasterDataCategory, string> = {
  materials: 'Jenis Bahan',
  jersey_sizes: 'Ukuran Jersey',
  product_types: 'Jenis Produk',
  collar_models: 'Model Kerah',
};
