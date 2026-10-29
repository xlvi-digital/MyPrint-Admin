export type ProductionStatus = 
  | 'DRAFT' 
  | 'DESAIN' 
  | 'PRINTING' 
  | 'PRESS' 
  | 'CUTTING' 
  | 'JAHIT' 
  | 'FINISHING' 
  | 'SELESAI';

export type SalesChannel = 'Offline' | 'Shopee' | 'Tokopedia';

export interface Customer {
  name: string;
  phone: string;
  email?: string;
  teamName?: string;
  address?: string;
  orderDate: string;
  deadlineDate?: string;
  orderNumber: string;
}

export interface Product {
  productType: string; // e.g. "Jersey Sublime", "Setelan Jersey", "Kaos Event", "Jaket Printing"
  material: string;    // e.g. "Milano", "Drifit Benzema", "Drifit Bintik", "Lotto", "Serena"
  color: string;       // e.g. "Hijau Toska Kombinasi Hitam"
  model: string;       // e.g. "Reguler Fit", "Raglan", "Slim Fit"
  sleeve: string;      // e.g. "Pendek", "Panjang", "Kombinasi"
  rib: string;         // e.g. "Tidak Pakai Rib", "Rib Leher Saja", "Rib Leher + Tangan"
  totalQuantity: number;
  unitPrice: number;
  totalPrice: number;
  downPayment: number;
  remainingPayment: number;
}

export interface PlayerDetail {
  id: string;
  name: string;
  number: string;
  size: string;
  quantity: number;
  notes?: string;
  sleeve?: 'Pendek' | 'Panjang';
}

export interface PrintingMachine {
  id: string;
  name: string;
}

export interface DesignAsset {
  id: string;
  label: string; // "Desain Depan", "Desain Belakang", "Lengan Kiri", "Lengan Kanan", "Celana", "Detail Kerah", "Referensi"
  dataUrl: string;
  fileName?: string;
  storagePath?: string;
  storageBucket?: string;
}

export interface CollarSpec {
  modelName: string; // e.g. "POLO KANCING 2", "O-NECK", "V-NECK", "SHANGHAI", "CUSTOM"
  imageUrl?: string;
  imagePath?: string;
  updatedAt?: string;
}

export interface WorkflowSignoff {
  designerName: string;
  designerInitial: string;
  pressSigned: boolean;
  cuttingSigned: boolean;
  jahitSigned: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  salesChannel?: SalesChannel;
  externalOrderNumber?: string;
  customer: Customer;
  product: Product;
  players: PlayerDetail[];
  useTableThreshold: number; // default 5 rows
  printingMachines: PrintingMachine[];
  designs: DesignAsset[];
  collar: CollarSpec;
  notes: string;
  productionStatus: ProductionStatus;
  signoff: WorkflowSignoff;
  createdAt: string;
  updatedAt: string;
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  step: number;
}

export const PRODUCTION_STATUS_STEPS: { status: ProductionStatus; label: string; description: string }[] = [
  { status: 'DRAFT', label: 'Draft', description: 'Order baru dicatat' },
  { status: 'DESAIN', label: 'Desain', description: 'Layout & approval mockup' },
  { status: 'PRINTING', label: 'Printing', description: 'Cetak sublime pada kertas transfer' },
  { status: 'PRESS', label: 'Press', description: 'Heat transfer sublim ke kain' },
  { status: 'CUTTING', label: 'Cutting', description: 'Pemotongan pola kain jersey' },
  { status: 'JAHIT', label: 'Jahit', description: 'Proses penjahitan & obras' },
  { status: 'FINISHING', label: 'Finishing', description: 'QC, pasang kancing/label & packing' },
  { status: 'SELESAI', label: 'Selesai', description: 'Siap kirim / diambil pemesan' },
];

export const COMMON_MATERIALS = [
  'Milano',
  'Drifit Benzema',
  'Drifit Bintik / Nike',
  'Drifit Jarum',
  'Drifit Paving',
  'Lotto',
  'Paragon',
  'Serena',
  'Dryfit Brazil',
  'Polyester Sublime',
  'Custom',
];

export const COMMON_COLLARS = [
  'POLO KANCING 2',
  'POLO KANCING 3',
  'O-NECK STANDAR',
  'O-NECK RIB',
  'V-NECK STANDAR',
  'V-NECK RIB TUMPANG',
  'SHANGHAI / MANDARIN',
  'KERAH KEMEJA SUBLIME',
  'CUSTOM',
];

export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', 'Custom'];

export interface WhatsAppParseResult {
  customerName?: string;
  phone?: string;
  teamName?: string;
  productType?: string;
  material?: string;
  quantity?: number;
  rib?: string;
  collar?: string;
  players: { name: string; number: string; size: string; quantity: number }[];
  notes: string[];
  rawText: string;
  detectedFields: {
    customerName: boolean;
    phone: boolean;
    productType: boolean;
    material: boolean;
    quantity: boolean;
    players: boolean;
    notes: boolean;
  };
}

export interface SizeRecapItem {
  size: string;
  quantity: number;
}
