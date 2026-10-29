import { Order, PlayerDetail, ProductionStatus } from '../types/order';
import { generateUuid } from '../utils/uuid';
import { generateNextLocalOrderNumber } from '../utils/formatters';

const DRAFT_KEY = 'myprintin_active_draft';
const LOCAL_ORDER_SEQUENCE_KEY = 'myprintin_order_number_last';
const LEGACY_ORDERS_KEY = 'myprintin_orders';

// Clean SVG Mockup for Jersey Sublime similar to Pasdama Jersey in PDF
const DEFAULT_JERSEY_MOCKUP = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" width="720" height="360">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#004D40"/>
      <stop offset="50%" stop-color="#00897B"/>
      <stop offset="100%" stop-color="#26A69A"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#80CBC4" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#004D40" stop-opacity="0.3"/>
    </linearGradient>
  </defs>
  
  <!-- Left Sleeve -->
  <g transform="translate(40, 60)">
    <polygon points="50,20 110,40 85,190 20,160" fill="url(#grad1)" stroke="#00332c" stroke-width="2"/>
    <polygon points="50,20 80,30 65,180 20,160" fill="url(#glow)"/>
    <rect x="42" y="70" width="28" height="18" fill="#c62828" rx="2"/>
    <rect x="42" y="79" width="28" height="9" fill="#ffffff" rx="1"/>
    <text x="60" y="225" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#004D40">LENGAN KIRI</text>
  </g>

  <!-- Front Body -->
  <g transform="translate(190, 30)">
    <path d="M50,40 L95,20 L145,55 L195,20 L240,40 L260,250 L30,250 Z" fill="url(#grad1)" stroke="#00332c" stroke-width="2.5"/>
    <!-- Collar & chest details -->
    <polygon points="120,40 145,75 170,40" fill="#ffffff" opacity="0.95"/>
    <circle cx="145" cy="85" r="2.5" fill="#333"/>
    <circle cx="145" cy="98" r="2.5" fill="#333"/>
    
    <!-- Chest text & graphics -->
    <text x="145" y="130" font-family="sans-serif" font-size="16" font-weight="900" text-anchor="middle" fill="#ffffff" letter-spacing="3">PASDAMA</text>
    <text x="145" y="112" font-family="sans-serif" font-size="8" font-weight="bold" text-anchor="middle" fill="#80CBC4" letter-spacing="1">PASKIBRA MUDA</text>
    
    <!-- Emblem -->
    <circle cx="210" cy="115" r="14" fill="#FFB300" stroke="#fff" stroke-width="1.5"/>
    <polygon points="210,105 214,113 223,113 216,118 219,126 210,121 201,126 204,118 197,113 206,113" fill="#D71920"/>
    
    <text x="145" y="275" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#004D40">TAMPAK DEPAN</text>
  </g>

  <!-- Back Body -->
  <g transform="translate(470, 30)">
    <path d="M50,40 L95,20 L145,35 L195,20 L240,40 L260,250 L30,250 Z" fill="url(#grad1)" stroke="#00332c" stroke-width="2.5"/>
    <!-- Back graphics -->
    <path d="M70,80 Q145,50 220,80 L205,140 Q145,110 85,140 Z" fill="url(#glow)"/>
    <text x="145" y="115" font-family="sans-serif" font-size="18" font-weight="900" text-anchor="middle" fill="#ffffff" letter-spacing="2">PASKIBRA</text>
    <text x="145" y="132" font-family="sans-serif" font-size="7" font-weight="bold" text-anchor="middle" fill="#E0F2F1" letter-spacing="1">110 MALNO PUSAT MENES</text>
    
    <!-- Number 10 graphic -->
    <text x="145" y="200" font-family="Impact, sans-serif" font-size="52" font-weight="bold" text-anchor="middle" fill="#ffffff" stroke="#004D40" stroke-width="1.5">10</text>
    
    <text x="145" y="275" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#004D40">TAMPAK BELAKANG</text>
  </g>
</svg>
`)}`;

const DEFAULT_COLLAR_MOCKUP = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <rect width="300" height="200" fill="#E0F2F1" rx="8"/>
  <!-- Polo Collar fold -->
  <path d="M70,120 L100,50 L150,85 L200,50 L230,120 L185,120 L150,150 L115,120 Z" fill="#004D40" stroke="#00251a" stroke-width="2"/>
  <polygon points="120,85 150,120 180,85" fill="#00796B"/>
  <rect x="143" y="90" width="14" height="60" fill="#004D40" stroke="#00251a" rx="2"/>
  <circle cx="150" cy="105" r="3.5" fill="#ffffff" stroke="#999" stroke-width="0.8"/>
  <circle cx="150" cy="125" r="3.5" fill="#ffffff" stroke="#999" stroke-width="0.8"/>
  <circle cx="150" cy="142" r="3.5" fill="#ffffff" stroke="#999" stroke-width="0.8"/>
  <text x="150" y="185" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#004D40">POLO KANCING 2 / 3</text>
</svg>
`)}`;

// Seed initial orders matching user's PDF exact case + realistic orders
const INITIAL_DEMO_ORDERS: Order[] = [
  {
    id: 'ord-366-pasdama',
    orderNumber: '366',
    customer: {
      name: '2610205SQTYEP6',
      phone: '+62 821-2834-6174',
      email: 'paskibra.pasdama@example.com',
      teamName: 'PASDAMA (Paskibra Menes)',
      address: 'Jl. Raya Menes No. 45, Pandeglang',
      orderDate: '2026-10-22',
      deadlineDate: '2026-10-29',
      orderNumber: '366',
    },
    product: {
      productType: 'Jersey Sublime',
      material: 'Milano',
      color: 'Hijau Toska Kombinasi Hitam',
      model: 'Reguler Fit',
      sleeve: 'Pendek',
      rib: 'Tidak Pakai Rib',
      totalQuantity: 76,
      unitPrice: 110000,
      totalPrice: 8360000,
      downPayment: 4500000,
      remainingPayment: 3860000,
    },
    useTableThreshold: 5,
    players: [
      { id: 'p1', name: 'BUDI SANTOSO', number: '10', size: 'M', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p2', name: 'ANDI PRASETYO', number: '7', size: 'L', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p3', name: 'RIZKY RAMADHAN', number: '9', size: 'XL', quantity: 1, notes: 'Kiper Toska' },
      { id: 'p4', name: 'FAHMI AL FARUQ', number: '12', size: 'XXL', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p5', name: 'ILHAM MAULANA', number: '4', size: 'L', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p6', name: 'DENI KURNIAWAN', number: '8', size: 'M', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p7', name: 'AGUS SETIAWAN', number: '11', size: 'L', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p8', name: 'YUSUF HIDAYAT', number: '5', size: 'XL', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p9', name: 'HENDRA WIJAYA', number: '2', size: 'S', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p10', name: 'SURYA PERDANA', number: '23', size: 'M', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p11', name: 'DIMAS ARYA', number: '14', size: 'L', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p12', name: 'BAYU NUGROHO', number: '17', size: 'M', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p13', name: 'EKO PRASETYO', number: '6', size: 'L', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p14', name: 'GILANG RAMADHAN', number: '19', size: 'XL', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p15', name: 'ARIF BUDIMAN', number: '3', size: 'M', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p16', name: 'TEGUH SANTOSO', number: '21', size: 'XXL', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p17', name: 'WAHYU UTOMO', number: '15', size: 'L', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p18', name: 'BAGAS ADITYA', number: '22', size: 'S', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p19', name: 'RENO FEBRIAN', number: '18', size: 'M', quantity: 1, notes: 'Atasan Milano' },
      { id: 'p20', name: 'FIKRI HAIKAL', number: '1', size: 'L', quantity: 1, notes: 'Kiper Hitam' },
      { id: 'p21', name: 'ANGGOTA PASUKAN A', number: '-', size: 'M', quantity: 18, notes: 'Celana Lotto Saku 1' },
      { id: 'p22', name: 'ANGGOTA PASUKAN B', number: '-', size: 'L', quantity: 20, notes: 'Celana Lotto Saku 1' },
      { id: 'p23', name: 'PEMBINA / PELATIH', number: '00', size: '3XL', quantity: 2, notes: 'Lengan Panjang' },
      { id: 'p24', name: 'OFFICIAL TEAM', number: '-', size: 'XL', quantity: 16, notes: 'Polo Kancing 2' },
    ],
    printingMachines: [
      { id: 'm1', name: 'MESIN EPSON F7270' },
      { id: 'm2', name: 'MESIN EPSON F7270' },
      { id: 'm3', name: 'MESIN EPSON F7270' },
      { id: 'm4', name: 'MESIN EPSON F7270' },
      { id: 'm5', name: 'MESIN EPSON F7270' },
    ],
    designs: [
      {
        id: 'd1',
        label: 'Desain Pasdama Green (Depan, Belakang & Lengan)',
        dataUrl: DEFAULT_JERSEY_MOCKUP,
        fileName: 'pasdama_jersey_mockup.svg',
      },
    ],
    collar: {
      modelName: 'POLO KANCING 2',
      imageUrl: DEFAULT_COLLAR_MOCKUP,
    },
    notes: 'DATA TERPISAH DI HALAMAN BELAKANG\nTIDAK PAKAI RIB\nATASAN MILANO\nCELANA LOTTO SAKU 1',
    productionStatus: 'PRINTING',
    signoff: {
      designerName: 'GIAN',
      designerInitial: 'GIAN',
      pressSigned: true,
      cuttingSigned: false,
      jahitSigned: false,
    },
    createdAt: '2026-10-22T08:30:00.000Z',
    updatedAt: '2026-10-23T14:15:00.000Z',
  },
  {
    id: 'ord-2026-0002',
    orderNumber: 'ORD-2026-0002',
    customer: {
      name: 'HENDRA PRAKOSO',
      phone: '+62 812-4455-8899',
      email: 'hendra.garuda@gmail.com',
      teamName: 'GARUDA FC SEMARANG',
      address: 'Stadion Citarum No. 12, Semarang',
      orderDate: '2026-10-21',
      deadlineDate: '2026-10-27',
      orderNumber: 'ORD-2026-0002',
    },
    product: {
      productType: 'Jersey Sublime Setelan',
      material: 'Drifit Benzema',
      color: 'Merah Putih Gradasi',
      model: 'Reguler Fit',
      sleeve: 'Pendek',
      rib: 'Rib Leher + Tangan Merah',
      totalQuantity: 24,
      unitPrice: 125000,
      totalPrice: 3000000,
      downPayment: 2000000,
      remainingPayment: 1000000,
    },
    useTableThreshold: 5,
    players: [
      { id: 'g1', name: 'HENDRA', number: '10', size: 'L', quantity: 1, notes: 'Kapten' },
      { id: 'g2', name: 'BAGUS', number: '7', size: 'M', quantity: 1, notes: '-' },
      { id: 'g3', name: 'KURNIAWAN', number: '9', size: 'L', quantity: 1, notes: '-' },
      { id: 'g4', name: 'ALDO', number: '1', size: 'XL', quantity: 1, notes: 'Kiper Kuning' },
      { id: 'g5', name: 'TIM UTAMA (M)', number: '-', size: 'M', quantity: 10, notes: 'Jersey Merah' },
      { id: 'g6', name: 'TIM UTAMA (L)', number: '-', size: 'L', quantity: 10, notes: 'Jersey Merah' },
    ],
    printingMachines: [
      { id: 'm1', name: 'MESIN EPSON F7270' },
      { id: 'm2', name: 'MESIN EPSON F9470' },
      { id: 'm3', name: 'MESIN MIMAKI TS100' },
    ],
    designs: [
      {
        id: 'd1',
        label: 'Desain Garuda FC',
        dataUrl: DEFAULT_JERSEY_MOCKUP,
        fileName: 'garuda_mockup.svg',
      },
    ],
    collar: {
      modelName: 'V-NECK RIB TUMPANG',
      imageUrl: DEFAULT_COLLAR_MOCKUP,
    },
    notes: 'Kerah V-Neck tumpang warna merah cabai.\nNomor dada ukuran 10cm.\nLogo garuda flock woven.',
    productionStatus: 'JAHIT',
    signoff: {
      designerName: 'RAFLI',
      designerInitial: 'RAF',
      pressSigned: true,
      cuttingSigned: true,
      jahitSigned: false,
    },
    createdAt: '2026-10-21T09:00:00.000Z',
    updatedAt: '2026-10-23T11:00:00.000Z',
  },
  {
    id: 'ord-2026-0003',
    orderNumber: 'ORD-2026-0003',
    customer: {
      name: 'SITI NURHALIZA',
      phone: '+62 857-9900-1122',
      email: 'siti@jakartarun.id',
      teamName: 'JAKARTA NIGHT RUNNERS',
      address: 'GBK Senayan Gate 5, Jakarta',
      orderDate: '2026-10-23',
      deadlineDate: '2026-11-02',
      orderNumber: 'ORD-2026-0003',
    },
    product: {
      productType: 'Jersey Running Singlet',
      material: 'Drifit Jarum / Brazil',
      color: 'Neon Cyan & Black',
      model: 'Singlet / Sleeveless',
      sleeve: 'Tanpa Lengan',
      rib: 'Bias Tape Hitam',
      totalQuantity: 50,
      unitPrice: 95000,
      totalPrice: 4750000,
      downPayment: 3000000,
      remainingPayment: 1750000,
    },
    useTableThreshold: 5,
    players: [
      { id: 'r1', name: 'SITI N', number: '101', size: 'S', quantity: 1, notes: 'Lead Runner' },
      { id: 'r2', name: 'DIMAS K', number: '102', size: 'M', quantity: 1, notes: 'Pacer' },
      { id: 'r3', name: 'RUNNERS SIZE S', number: '-', size: 'S', quantity: 12, notes: '-' },
      { id: 'r4', name: 'RUNNERS SIZE M', number: '-', size: 'M', quantity: 20, notes: '-' },
      { id: 'r5', name: 'RUNNERS SIZE L', number: '-', size: 'L', quantity: 12, notes: '-' },
      { id: 'r6', name: 'RUNNERS SIZE XL', number: '-', size: 'XL', quantity: 4, notes: '-' },
    ],
    printingMachines: [
      { id: 'm1', name: 'MESIN EPSON F7270' },
      { id: 'm2', name: 'MESIN EPSON F7270' },
    ],
    designs: [],
    collar: {
      modelName: 'O-NECK STANDAR',
    },
    notes: 'Kain drifit ultra-ringan anti-bakteri. Reflective tape di bagian pundak kanan dan kiri.',
    productionStatus: 'DESAIN',
    signoff: {
      designerName: 'GIAN',
      designerInitial: 'GIAN',
      pressSigned: false,
      cuttingSigned: false,
      jahitSigned: false,
    },
    createdAt: '2026-10-23T10:15:00.000Z',
    updatedAt: '2026-10-23T10:15:00.000Z',
  },
];

let memoryOrders: Order[] = INITIAL_DEMO_ORDERS;

export const storageService = {
  getOrders(): Order[] {
    return memoryOrders;
  },

  getOrderById(id: string): Order | undefined {
    const orders = this.getOrders();
    return orders.find(o => o.id === id || o.orderNumber === id);
  },

  getLegacyOrders(): Order[] | null {
    try {
      const stored = localStorage.getItem(LEGACY_ORDERS_KEY);
      if (!stored) return null;
      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed as Order[] : null;
    } catch (error) {
      console.warn('Could not read the legacy browser order backup.', error);
      return null;
    }
  },

  clearLegacyOrders(): boolean {
    try {
      localStorage.removeItem(LEGACY_ORDERS_KEY);
      return true;
    } catch (error) {
      console.error('Could not clear the legacy browser order cache.', error);
      return false;
    }
  },

  getNextLocalOrderNumber(): string {
    const year = new Date().getFullYear();
    const counterKey = `${LOCAL_ORDER_SEQUENCE_KEY}_${year}`;
    let savedSequence = 0;
    try {
      savedSequence = Number(localStorage.getItem(counterKey)) || 0;
    } catch (error) {
      console.warn('Could not read the local order sequence.', error);
    }
    const nextNumber = generateNextLocalOrderNumber(this.getOrders(), year, savedSequence);
    try {
      localStorage.setItem(counterKey, nextNumber.slice(`ORD-${year}-`.length));
    } catch (error) {
      console.warn('Could not save the local order sequence.', error);
    }
    return nextNumber;
  },

  saveOrder(order: Order): Order {
    const orders = [...this.getOrders()];
    const existingIndex = orders.findIndex(o => o.id === order.id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      orders[existingIndex] = {
        ...order,
        updatedAt: now,
      };
    } else {
      orders.unshift({
        ...order,
        createdAt: order.createdAt || now,
        updatedAt: now,
      });
    }

    memoryOrders = orders;
    this.clearDraft();
    return order;
  },

  deleteOrder(id: string): boolean {
    const orders = this.getOrders();
    memoryOrders = orders.filter(o => o.id !== id);
    return true;
  },

  duplicateOrder(id: string): Order | null {
    const target = this.getOrderById(id);
    if (!target) return null;

    const newId = generateUuid();

    const duplicated: Order = {
      ...target,
      id: newId,
      orderNumber: '',
      players: target.players.map((player, index) => ({
        ...player,
        id: `copy-${newId}-player-${index + 1}`,
      })),
      designs: target.designs.map((design, index) => ({
        ...design,
        id: `copy-${newId}-design-${index + 1}`,
      })),
      printingMachines: target.printingMachines.map((machine, index) => ({
        ...machine,
        id: `copy-${newId}-machine-${index + 1}`,
      })),
      customer: {
        ...target.customer,
        orderNumber: '',
        orderDate: new Date().toISOString().split('T')[0],
      },
      productionStatus: 'DRAFT',
      signoff: {
        designerName: '',
        designerInitial: '',
        pressSigned: false,
        cuttingSigned: false,
        jahitSigned: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return duplicated;
  },

  saveOrders(orders: Order[]): void {
    memoryOrders = orders;
  },

  updateProductionStatus(id: string, status: ProductionStatus): Order | null {
    const orders = [...this.getOrders()];
    const order = orders.find(o => o.id === id);
    if (!order) return null;

    order.productionStatus = status;
    order.updatedAt = new Date().toISOString();
    memoryOrders = orders;
    return order;
  },

  getDraft(): Partial<Order> | null {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      return draft ? JSON.parse(draft) : null;
    } catch {
      return null;
    }
  },

  saveDraft(draftData: Partial<Order>): void {
    try {
      const lightDraft = { ...draftData };
      delete lightDraft.designs;
      const safeDraft = {
        ...lightDraft,
        collar: lightDraft.collar
          ? {
              ...lightDraft.collar,
              imageUrl: lightDraft.collar.imageUrl?.startsWith('data:')
                ? undefined
                : lightDraft.collar.imageUrl,
            }
          : undefined,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(safeDraft));
    } catch (e) {
      console.warn('Could not save draft to localStorage', e);
    }
  },

  clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.warn('Could not clear the local order draft.', error);
    }
  },

  resetToDemoData(): void {
    memoryOrders = INITIAL_DEMO_ORDERS;
  },

  clearAllOrders(): void {
    memoryOrders = [];
  },
};
