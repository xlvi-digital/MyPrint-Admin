import { useCallback, useEffect, useState } from 'react';
import { MasterDataCategory, MasterDataEntry, masterDataService } from '../services/supabase/masterDataService';
import { COMMON_COLLARS, COMMON_MATERIALS, STANDARD_SIZES } from '../types/order';
import { isSupabaseConfigured } from '../services/supabase/client';

export type MasterDataState = Record<MasterDataCategory, MasterDataEntry[]>;

const emptyData: MasterDataState = {
  materials: [],
  jersey_sizes: [],
  product_types: [],
  collar_models: [],
};

const localMasterData: MasterDataState = {
  materials: COMMON_MATERIALS.map((name, index) => ({
    id: `local-material-${index}`,
    name,
    description: '',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  })),
  jersey_sizes: STANDARD_SIZES.map((name, index) => ({
    id: `local-size-${index}`,
    name,
    code: name,
    description: '',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  })),
  product_types: [
    'Jersey Sublime',
    'Jersey Sublime Setelan',
    'Jersey Running / Singlet',
    'Jaket / Hoodie Sublime',
    'Kaos Event Sublime',
    'Celana Olahraga / Lotto',
    'Rompi Futsal / Basket',
    'Custom Apparel',
  ].map((name, index) => ({
    id: `local-product-${index}`,
    name,
    description: '',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  })),
  collar_models: COMMON_COLLARS.map((name, index) => ({
    id: `local-collar-${index}`,
    name,
    description: '',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  })),
};

export const useMasterData = () => {
  const [data, setData] = useState<MasterDataState>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLocalFallback = !isSupabaseConfigured();

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!isSupabaseConfigured()) {
      setData(localMasterData);
      setIsLoading(false);
      return;
    }
    try {
      setData(await masterDataService.listAll(true));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Gagal memuat data master.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const options = useCallback((category: MasterDataCategory, currentValue = '', includeLegacy = true) => {
    const active = data[category].filter(entry => entry.isActive);
    if (!includeLegacy) return active;
    const currentEntry = data[category].find(entry => entry.name === currentValue || entry.code === currentValue);
    if (currentValue && currentEntry && !currentEntry.isActive) return [...active, currentEntry];
    if (currentValue && !currentEntry) {
      return [...active, {
        id: `legacy-${currentValue}`,
        name: currentValue,
        code: category === 'jersey_sizes' ? currentValue : undefined,
        description: '',
        isActive: false,
        createdAt: '',
        updatedAt: '',
      }];
    }
    return active;
  }, [data]);

  return { data, isLoading, error, isLocalFallback, reload, options };
};
