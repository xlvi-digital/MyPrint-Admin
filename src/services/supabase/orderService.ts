import { getSupabaseClient, isSupabaseConfigured } from './client';
import { Order, PlayerDetail, ProductionStatus, CollarSpec } from '../../types/order';
import { storageService } from '../storageService';
import { authRoleService } from './authRoleService';
import { supabaseStorageService } from './storageService';
import { isValidUuid, generateUuid } from '../../utils/uuid';
import { masterDataService } from './masterDataService';

export interface ActivityLog {
  id: string;
  orderId?: string;
  orderNumber: string;
  action: string;
  actorName: string;
  actorRole: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface SaveOrderResult {
  success: boolean;
  order: Order;
  error?: string;
  designsError?: string;
  assetsError?: string;
  source: 'supabase' | 'local';
}

interface OrderDesignRow {
  id: string;
  label: string | null;
  data_url: string | null;
  file_name: string | null;
  sort_order: number | null;
  storage_path: string | null;
  storage_bucket: string | null;
}

// Map database row to domain Order model
const mapDbRowToOrder = (
  row: any,
  items: any[] = [],
  designs: any[] = [],
  printing: any[] = [],
  collarRow: any = null
): Order => {
  const players: PlayerDetail[] = items.map(item => ({
    id: item.id || `item-${Math.random()}`,
    name: item.name || '',
    number: item.number || '',
    size: item.size || 'L',
    quantity: Number(item.quantity) || 1,
    notes: item.notes || '',
    sleeve: item.sleeve === 'Pendek' || item.sleeve === 'Panjang' ? item.sleeve : undefined,
  }));

  const mappedDesigns = designs.map(d => ({
    id: d.id,
    label: d.label || 'Desain',
    dataUrl: d.resolved_url || d.data_url || '',
    fileName: d.file_name || '',
    storagePath: d.storage_path || undefined,
    storageBucket: d.storage_bucket || undefined,
  }));

  const mappedPrinting = printing.map(p => ({
    id: p.id,
    name: p.machine_name || '',
  }));

  return {
    id: String(row.id),
    orderNumber: row.order_number,
    salesChannel: row.sales_channel === 'Shopee' || row.sales_channel === 'Tokopedia'
      ? row.sales_channel
      : 'Offline',
    externalOrderNumber: row.external_order_number || '',
    customer: {
      name: row.customer_name,
      phone: row.customer_phone || '',
      email: row.customer_email || '',
      teamName: row.team_name || '',
      address: row.customer_address || '',
      orderDate: row.order_date || new Date().toISOString().split('T')[0],
      deadlineDate: row.deadline_date || '',
      orderNumber: row.order_number,
    },
    product: {
      productType: row.product_type || 'Jersey Sublime',
      material: row.material || 'Milano',
      color: row.color || 'Custom Sublime',
      model: row.model || 'Reguler Fit',
      sleeve: row.sleeve || 'Pendek',
      rib: row.rib || 'Tidak Pakai Rib',
      totalQuantity: Number(row.total_quantity) || 0,
      unitPrice: Number(row.unit_price) || 0,
      totalPrice: Number(row.total_price) || 0,
      downPayment: Number(row.down_payment) || 0,
      remainingPayment: Number(row.remaining_payment) || 0,
    },
    players,
    useTableThreshold: row.use_table_threshold ?? 5,
    printingMachines: mappedPrinting.length > 0 ? mappedPrinting : [{ id: '1', name: 'EPSON F7270' }],
    designs: mappedDesigns,
    collar: {
      modelName: collarRow?.model_name || 'POLO KANCING 2',
      imageUrl: collarRow?.image_url ? supabaseStorageService.resolveImageUrl(collarRow.image_url) : undefined,
      imagePath: collarRow?.image_path || (collarRow?.image_url ? supabaseStorageService.extractStoragePath(collarRow.image_url) : undefined),
      updatedAt: collarRow?.updated_at || collarRow?.created_at || undefined,
    },
    notes: row.notes || '',
    productionStatus: (row.production_status as ProductionStatus) || 'DRAFT',
    signoff: {
      designerName: row.designer_name || '',
      designerInitial: row.designer_initial || '',
      pressSigned: Boolean(row.press_signed),
      cuttingSigned: Boolean(row.cutting_signed),
      jahitSigned: Boolean(row.jahit_signed),
    },
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
};

export const supabaseOrderService = {
  async deleteDesignAssetIfUnreferenced(storageBucket?: string, storagePath?: string): Promise<void> {
    if (!storageBucket || !storagePath || storageBucket === 'local') return;
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) return;

    const { data, error } = await client
      .from('order_designs')
      .select('id')
      .eq('storage_bucket', storageBucket)
      .eq('storage_path', storagePath)
      .limit(1);
    if (error) {
      throw new Error(`Gagal memeriksa referensi file desain sebelum menghapus: ${error.message}`);
    }
    if (data?.length) return;
    await supabaseStorageService.deleteOrderDesignFile(storageBucket, storagePath);
  },

  // Keep the response bounded; Supabase should not send an unbounded order history.
  async getOrders(options: { fallbackToLocal?: boolean } = {}): Promise<Order[]> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      if (options.fallbackToLocal === false) {
        throw new Error('Supabase belum dikonfigurasi untuk membaca data pesanan.');
      }
      return storageService.getOrders();
    }

    try {
      const { data: ordersData, error: ordersError } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (ordersError) {
        console.warn('[Supabase] Fetch orders error:', ordersError);
        throw new Error(ordersError.message);
      }

      if (!ordersData || ordersData.length === 0) {
        // Connected to Supabase, but no orders yet. Return real empty array (no fake dummy data!)
        storageService.saveOrders([]);
        return [];
      }

      const orderIds = ordersData.map(o => o.id);

      // Fetch related items in parallel
      const [itemsRes, designsRes, printRes, collarRes] = await Promise.all([
        client.from('order_items').select('*').in('order_id', orderIds).order('sort_order', { ascending: true }),
        client.from('order_designs').select('*').in('order_id', orderIds),
        client.from('order_printing').select('*').in('order_id', orderIds).order('sort_order', { ascending: true }),
        client.from('order_collar').select('*').in('order_id', orderIds),
      ]);

      const relatedError = itemsRes.error || designsRes.error || printRes.error || collarRes.error;
      if (relatedError) {
        throw new Error(`Gagal membaca data order terkait: ${relatedError.message}`);
      }

      const designRows = await Promise.all((designsRes.data || []).map(async (design: Record<string, any>) => {
        if (!design.storage_path || !design.storage_bucket) return design;
        return {
          ...design,
          resolved_url: await supabaseStorageService.createSignedOrderDesignUrl(
            design.storage_bucket,
            design.storage_path,
          ),
        };
      }));

      const itemsByOrder = (itemsRes.data || []).reduce((acc: any, item: any) => {
        acc[item.order_id] = acc[item.order_id] || [];
        acc[item.order_id].push(item);
        return acc;
      }, {});

      const designsByOrder = designRows.reduce((acc: any, d: any) => {
        acc[d.order_id] = acc[d.order_id] || [];
        acc[d.order_id].push(d);
        return acc;
      }, {});

      const printByOrder = (printRes.data || []).reduce((acc: any, p: any) => {
        acc[p.order_id] = acc[p.order_id] || [];
        acc[p.order_id].push(p);
        return acc;
      }, {});

      const collarByOrder = (collarRes.data || []).reduce((acc: any, c: any) => {
        acc[c.order_id] = c;
        return acc;
      }, {});

      const assembledOrders: Order[] = ordersData.map(row =>
        mapDbRowToOrder(
          row,
          itemsByOrder[row.id] || [],
          designsByOrder[row.id] || [],
          printByOrder[row.id] || [],
          collarByOrder[row.id] || null
        )
      );

      // Keep only an in-memory snapshot; orders and image URLs are never persisted to browser storage.
      storageService.saveOrders(assembledOrders);
      return assembledOrders;
    } catch (err: any) {
      throw new Error(err instanceof Error ? err.message : 'Gagal memuat data order dari Supabase.');
    }
  },

  // Save or update an order with true database transaction logic and detailed errors
  async saveOrder(order: Order): Promise<SaveOrderResult> {
    const client = getSupabaseClient();
    const currentProfile = authRoleService.getCurrentProfile();

    // The orders table uses TEXT IDs; preserve existing IDs so retries update the same row.
    if (!isValidUuid(order.id)) {
      order = { ...order, id: generateUuid() };
    }

    if (!client || !isSupabaseConfigured()) {
      return {
        success: false,
        order,
        error: 'Supabase belum dikonfigurasi. Pesanan tidak disimpan secara lokal.',
        source: 'local',
      };
    }

    try {
      const { data: existingOrder, error: existingOrderError } = await client
        .from('orders')
        .select('id, order_number')
        .eq('id', order.id)
        .maybeSingle();

      if (existingOrderError) {
        throw new Error(`Gagal memeriksa order berdasarkan ID: ${existingOrderError.message}`);
      }

      const isExistingOrder = Boolean(existingOrder);
      if (existingOrder) {
        order = {
          ...order,
          orderNumber: existingOrder.order_number,
          customer: { ...order.customer, orderNumber: existingOrder.order_number },
        };
      }

      let upsertData: { id: string; order_number: string } | null = null;
      let upsertOrderError: { message: string; code?: string; details?: string } | null = null;
      let exhaustedOrderNumberConflict = false;
      const maxNumberAttempts = isExistingOrder ? 1 : 3;

      for (let attempt = 0; attempt < maxNumberAttempts; attempt++) {
        if (!isExistingOrder) {
          const { data: allocatedNumber, error: allocateError } = await client.rpc(
            'next_order_number',
            {
              p_year: new Date().getFullYear(),
              p_order_id: order.id,
              p_force_new: attempt > 0,
            },
          );

          if (allocateError || typeof allocatedNumber !== 'string') {
            const message = allocateError?.message || 'RPC tidak mengembalikan nomor order.';
            const missingRpc = allocateError?.code === 'PGRST202'
              || /schema cache|could not find the function/i.test(message);
            const instruction = missingRpc
              ? 'Jalankan migration_atomic_order_numbers.sql di project Supabase yang sama dengan URL aplikasi, lalu pastikan schema cache PostgREST sudah dimuat ulang.'
              : 'Pastikan migration_atomic_order_numbers.sql sudah diterapkan.';
            throw new Error(
              `Gagal membuat nomor order aman di database: ${message}. ${instruction}`,
            );
          }

          order = {
            ...order,
            orderNumber: allocatedNumber,
            customer: { ...order.customer, orderNumber: allocatedNumber },
          };
        }

        const [materialId, productTypeId] = await Promise.all([
          masterDataService.resolveId('materials', order.product.material),
          masterDataService.resolveId('product_types', order.product.productType),
        ]);
        const orderPayload = {
          id: order.id,
          order_number: order.orderNumber,
          sales_channel: order.salesChannel || 'Offline',
          external_order_number: order.externalOrderNumber?.trim() || null,
          customer_name: order.customer.name.trim(),
          customer_phone: order.customer.phone ? order.customer.phone.trim() : null,
          customer_email: order.customer.email ? order.customer.email.trim() : null,
          team_name: order.customer.teamName ? order.customer.teamName.trim() : null,
          customer_address: order.customer.address ? order.customer.address.trim() : null,
          order_date: order.customer.orderDate || new Date().toISOString().split('T')[0],
          deadline_date: order.customer.deadlineDate || null,
          product_type: order.product.productType || 'Jersey Sublime',
          product_type_id: productTypeId,
          material: order.product.material || 'Milano',
          material_id: materialId,
          color: order.product.color || null,
          model: order.product.model || 'Reguler Fit',
          sleeve: order.product.sleeve || 'Pendek',
          rib: order.product.rib || 'Tidak Pakai Rib',
          total_quantity: Number(order.product.totalQuantity) || 1,
          unit_price: Number(order.product.unitPrice) || 0,
          total_price: Number(order.product.totalPrice) || 0,
          down_payment: Number(order.product.downPayment) || 0,
          remaining_payment: Number(order.product.remainingPayment) || 0,
          use_table_threshold: order.useTableThreshold ?? 5,
          notes: order.notes || null,
          production_status: order.productionStatus || 'DRAFT',
          designer_name: order.signoff.designerName || null,
          designer_initial: order.signoff.designerInitial || null,
          press_signed: Boolean(order.signoff.pressSigned),
          cutting_signed: Boolean(order.signoff.cuttingSigned),
          jahit_signed: Boolean(order.signoff.jahitSigned),
          created_by_name: currentProfile.name,
          updated_at: new Date().toISOString(),
        };

        const upsertResult = await client
          .from('orders')
          .upsert(orderPayload, { onConflict: 'id' })
          .select('id, order_number')
          .single();

        upsertData = upsertResult.data;
        upsertOrderError = upsertResult.error;
        if (!upsertOrderError) break;

        const isOrderNumberConflict =
          upsertOrderError.code === '23505' &&
          (upsertOrderError.details?.includes('orders_order_number_key') ||
            upsertOrderError.message.includes('orders_order_number_key'));
        if (!isExistingOrder && isOrderNumberConflict && attempt + 1 < maxNumberAttempts) {
          continue;
        }
        exhaustedOrderNumberConflict = !isExistingOrder && isOrderNumberConflict;
        break;
      }

      if (upsertOrderError || !upsertData) {
        const detail = upsertOrderError?.message || 'Database tidak mengembalikan order yang tersimpan.';
        const conflictMessage = exhaustedOrderNumberConflict
          ? 'Nomor order masih bentrok setelah 3 alokasi; tidak ada roster yang ditulis. Silakan coba lagi.'
          : detail;
        console.error('[Supabase] Upsert Order Error:', upsertOrderError);
        return {
          success: false,
          order,
          error: `Gagal menyimpan ke tabel orders: ${conflictMessage} (${upsertOrderError?.code || 'DB'})`,
          source: 'supabase',
        };
      }

      const savedOrderId = upsertData.id;
      if (!isValidUuid(savedOrderId)) {
        return {
          success: false,
          order,
          error: 'Supabase menyimpan order tanpa ID UUID yang valid; metadata turunannya tidak diproses.',
          source: 'supabase',
        };
      }
      order = {
        ...order,
        id: savedOrderId,
        orderNumber: upsertData.order_number,
        customer: { ...order.customer, orderNumber: upsertData.order_number },
      };
      let assetsError: string | undefined;
      if (order.collar.imageUrl?.startsWith('data:')) {
        order = { ...order, collar: { ...order.collar, imageUrl: undefined, imagePath: undefined } };
        assetsError = 'Gambar referensi kerah belum disimpan karena belum diunggah ke Supabase Storage.';
      }

      // 2. Sync Order Items / Player Roster
      // Clear previous items for this order to avoid stale or duplicate rows
      const { error: deleteItemsErr } = await client
        .from('order_items')
        .delete()
        .eq('order_id', savedOrderId);

      if (deleteItemsErr) {
        console.error('[Supabase] Failed to clear previous order items:', deleteItemsErr);
        return {
          success: false,
          order,
          error: `Order #${order.orderNumber} tersimpan, namun roster lama tidak dapat disinkronkan dengan aman: ${deleteItemsErr.message}`,
          source: 'supabase',
        };
      }

      if (order.players && order.players.length > 0) {
        // Build roster payload without sending temporary frontend IDs (e.g. "p-...") to the UUID column.
        // Let PostgreSQL auto-generate genuine UUIDs via default gen_random_uuid().
        const itemsToInsert = await Promise.all(order.players.map(async (p, index) => {
          const itemPayload: Record<string, any> = {
            order_id: savedOrderId,
            name: p.name.trim(),
            number: p.number ? String(p.number).trim() : '',
            size: p.size || 'L',
            size_id: await masterDataService.resolveId('jersey_sizes', p.size || 'L'),
            quantity: Number(p.quantity) || 1,
            notes: p.notes ? p.notes.trim() : null,
            sleeve: p.sleeve || null,
            sort_order: index + 1,
          };
          // Only send id if it's already a valid UUID from database
          if (isValidUuid(p.id)) {
            itemPayload.id = p.id;
          }
          return itemPayload;
        }));

        const { data: savedItems, error: insertItemsErr } = await client
          .from('order_items')
          .insert(itemsToInsert)
          .select();

        if (insertItemsErr) {
          console.error('[Supabase] Save roster failed', {
            code: insertItemsErr.code,
            message: insertItemsErr.message,
            details: insertItemsErr.details,
            hint: insertItemsErr.hint,
          });
          return {
            success: false,
            order: { ...order, id: savedOrderId },
            error: `Order #${order.orderNumber} tersimpan, namun roster pemain gagal: ${insertItemsErr.message}`,
            source: 'supabase',
          };
        }

        // Map back the database-generated UUIDs to order.players
        if (savedItems && savedItems.length > 0) {
          order.players = savedItems.map(item => ({
            id: item.id,
            name: item.name || '',
            number: item.number || '',
            size: item.size || 'L',
            quantity: Number(item.quantity) || 1,
            notes: item.notes || '',
            sleeve: item.sleeve === 'Pendek' || item.sleeve === 'Panjang' ? item.sleeve : undefined,
          }));
        }
      }

      // 3. Sync design records with database-generated UUIDs before removing stale rows.
      const { data: previousDesigns, error: previousDesignsError } = await client
        .from('order_designs')
        .select('id, label, data_url, file_name, sort_order, storage_path, storage_bucket')
        .eq('order_id', savedOrderId);
      const previousDesignRows: OrderDesignRow[] = previousDesigns || [];
      let designsError: string | undefined;
      if (previousDesignsError) {
        designsError = `Desain lama gagal dibaca untuk disinkronkan: ${previousDesignsError.message}`;
        order.designs = previousDesignRows.map(design => ({
          id: design.id,
          label: design.label || 'Desain',
          dataUrl: design.data_url || '',
          fileName: design.file_name || '',
          storagePath: design.storage_path || undefined,
          storageBucket: design.storage_bucket || undefined,
        }));
      } else {
        const savedDesignRows = new Map<string, Record<string, any>>();
        const insertedDesignIds: string[] = [];
        const previousById = new Map(previousDesignRows.map(design => [design.id, design]));
        const previousByStoragePath = new Map(
          previousDesignRows
            .filter(design => design.storage_path && design.storage_bucket)
            .map(design => [`${design.storage_bucket}:${design.storage_path}`, design]),
        );
        const makeDesignPayload = (design: Order['designs'][number], index: number) => ({
          order_id: savedOrderId,
          label: design.label || 'Desain Utama',
          data_url: design.storagePath || design.dataUrl,
          file_name: design.fileName || null,
          sort_order: index + 1,
          storage_path: design.storagePath || null,
          storage_bucket: design.storageBucket || null,
        });

        try {
          for (const [index, design] of (order.designs || []).entries()) {
            if (design.dataUrl.startsWith('data:') && !design.storagePath) {
              throw new Error(`Desain "${design.fileName || design.label}" belum diunggah ke Supabase Storage.`);
            }
            const payload = makeDesignPayload(design, index);
            const existing = isValidUuid(design.id) ? previousById.get(design.id) : undefined;
            const matchingPath = design.storagePath && design.storageBucket
              ? previousByStoragePath.get(`${design.storageBucket}:${design.storagePath}`)
              : undefined;
            const recordToUpdate = existing || matchingPath;

            if (recordToUpdate) {
              const { data, error } = await client
                .from('order_designs')
                .update(payload)
                .eq('id', recordToUpdate.id)
                .eq('order_id', savedOrderId)
                .select('id, label, data_url, file_name, sort_order, storage_path, storage_bucket')
                .single();
              if (error || !data) {
                throw new Error(error?.message || 'Supabase tidak mengembalikan desain yang diperbarui.');
              }
              savedDesignRows.set(design.id, data);
              continue;
            }

            const { data, error } = await client
              .from('order_designs')
              .insert(payload)
              .select('id, label, data_url, file_name, sort_order, storage_path, storage_bucket')
              .single();
            if (error || !data) {
              throw new Error(error?.message || 'Supabase tidak mengembalikan ID UUID desain baru.');
            }
            insertedDesignIds.push(data.id);
            savedDesignRows.set(design.id, data);
          }
        } catch (designSaveError) {
          const reason = designSaveError instanceof Error
            ? designSaveError.message
            : 'Kesalahan tidak diketahui saat menyimpan metadata desain.';
          const rollbackErrors: string[] = [];
          if (insertedDesignIds.length > 0) {
            const { error } = await client
              .from('order_designs')
              .delete()
              .in('id', insertedDesignIds)
              .eq('order_id', savedOrderId);
            if (error) rollbackErrors.push(`metadata sementara gagal dibatalkan: ${error.message}`);
          }
          for (const design of order.designs || []) {
            if (!design.storagePath || !design.storageBucket || isValidUuid(design.id)) continue;
            try {
              await this.deleteDesignAssetIfUnreferenced(design.storageBucket, design.storagePath);
            } catch (cleanupError) {
              rollbackErrors.push(
                cleanupError instanceof Error ? cleanupError.message : 'file Storage sementara gagal dibersihkan.',
              );
            }
          }
          designsError = `Order tersimpan, tetapi metadata desain gagal disimpan: ${reason}${rollbackErrors.length ? ` (${rollbackErrors.join('; ')})` : ''}`;
          order.designs = previousDesignRows.map(design => ({
            id: design.id,
            label: design.label || 'Desain',
            dataUrl: design.data_url || '',
            fileName: design.file_name || '',
            storagePath: design.storage_path || undefined,
            storageBucket: design.storage_bucket || undefined,
          }));
        }

        if (!designsError) {
          const savedDesigns = (order.designs || []).map(design => {
            const row = savedDesignRows.get(design.id);
            return {
              ...design,
              id: row?.id || design.id,
              dataUrl: design.storagePath ? design.dataUrl : row?.data_url || design.dataUrl,
              fileName: row?.file_name || design.fileName,
              storagePath: row?.storage_path || undefined,
              storageBucket: row?.storage_bucket || undefined,
              label: row?.label || design.label,
            };
          });
          const wantedDesignIds = new Set(savedDesigns.map(design => design.id));
          const removedDesigns = previousDesignRows.filter(design => !wantedDesignIds.has(design.id));
          const changedStorageRefs = previousDesignRows.filter(previous => {
            if (!previous.storage_path || !previous.storage_bucket) return false;
            const current = savedDesigns.find(design => design.id === previous.id);
            return !current
              || current.storagePath !== previous.storage_path
              || current.storageBucket !== previous.storage_bucket;
          });
          if (removedDesigns.length > 0) {
            const { error } = await client
              .from('order_designs')
              .delete()
              .in('id', removedDesigns.map(design => design.id))
              .eq('order_id', savedOrderId);
            if (error) {
              designsError = `Order tersimpan, tetapi desain lama gagal dihapus dari database: ${error.message}`;
              order.designs = savedDesigns;
            }
          }

          if (!designsError) {
            order.designs = savedDesigns;
            for (const oldDesign of changedStorageRefs) {
              if (!oldDesign.storage_path || !oldDesign.storage_bucket) continue;
              try {
                await this.deleteDesignAssetIfUnreferenced(oldDesign.storage_bucket, oldDesign.storage_path);
              } catch (cleanupError) {
                console.error('[Supabase] Desain lama tersimpan sebagai orphan di Storage:', cleanupError);
              }
            }
          }
        }
      }

      // 4. Sync Printing Machines
      await client.from('order_printing').delete().eq('order_id', savedOrderId);
      if (order.printingMachines && order.printingMachines.length > 0) {
        const printingToInsert = order.printingMachines.map((m, index) => {
          const printPayload: Record<string, any> = {
            order_id: savedOrderId,
            machine_name: m.name,
            sort_order: index + 1,
          };
          if (isValidUuid(m.id)) {
            printPayload.id = m.id;
          }
          return printPayload;
        });

        const { data: savedPrint, error: insertPrintErr } = await client
          .from('order_printing')
          .insert(printingToInsert)
          .select();

        if (insertPrintErr) {
          console.warn('[Supabase] Warning syncing printing machines:', insertPrintErr.message);
        } else if (savedPrint && savedPrint.length > 0) {
          order.printingMachines = savedPrint.map(p => ({
            id: p.id,
            name: p.machine_name,
          }));
        }
      }

      // 5. Sync Collar Spec & Visual Reference
      await client.from('order_collar').delete().eq('order_id', savedOrderId);
      if (order.collar) {
          const collarImageUrl = order.collar.imageUrl || order.collar.imagePath || null;
        const fullPayload: Record<string, any> = {
          order_id: savedOrderId,
          model_name: order.collar.modelName || 'POLO KANCING 2',
          collar_model_id: await masterDataService.resolveId('collar_models', order.collar.modelName || 'POLO KANCING 2'),
          image_url: collarImageUrl,
          image_path: order.collar.imagePath || null,
          updated_at: new Date().toISOString(),
        };

        let { error: collarErr } = await client.from('order_collar').insert(fullPayload);
        if (collarErr && (collarErr.message.includes('image_path') || collarErr.message.includes('updated_at'))) {
          // Schema in DB does not have image_path column; fallback to actual existing column image_url
          const fallbackRes = await client.from('order_collar').insert({
            order_id: savedOrderId,
            model_name: order.collar.modelName || 'POLO KANCING 2',
            collar_model_id: fullPayload.collar_model_id,
            image_url: collarImageUrl,
          });
          collarErr = fallbackRes.error;
        }

        if (collarErr) {
          console.warn('[Supabase] Warning syncing collar:', collarErr.message);
        }
      }

      // 6. Log Activity in database
      await this.logActivity(
        savedOrderId,
        order.orderNumber,
        'ORDER_SAVED',
        {
          customer: order.customer.name,
          totalQty: order.product.totalQuantity,
          playerCount: (order.players || []).length,
          actor: currentProfile.name,
        }
      );

      // Keep local storage cache updated with verified UUIDs
      order.id = savedOrderId;
      storageService.saveOrder(order);

      return { success: true, order, designsError, assetsError, source: 'supabase' };
    } catch (err: any) {
      console.error('[Supabase] Critical exception saving order:', err);
      return {
        success: false,
        order,
        error: `Eksepsi database: ${err.message || 'Unknown network error'}`,
        source: 'supabase',
      };
    }
  },

  // Update Production Status with snake_case column `production_status`
  async updateProductionStatus(
    orderId: string,
    newStatus: ProductionStatus
  ): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    const currentProfile = authRoleService.getCurrentProfile();

    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: 'Supabase belum dikonfigurasi untuk memperbarui status pesanan.' };
    }

    try {
      const { data, error } = await client
        .from('orders')
        .update({
          production_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select('order_number')
        .single();

      if (error) {
        console.error('[Supabase] Update status error:', error);
        return { success: false, error: error.message };
      }

      storageService.updateProductionStatus(orderId, newStatus);

      if (data) {
        await this.logActivity(orderId, data.order_number, `STATUS_CHANGED_TO_${newStatus}`, {
          newStatus,
          actor: currentProfile.name,
        });
      }

      return { success: true };
    } catch (err: any) {
      console.error('[Supabase] Exception updating status:', err);
      return { success: false, error: err.message };
    }
  },

  // Update Collar Specification & Reference Image with Safe File Replacement
  async updateCollar(
    orderId: string,
    collar: CollarSpec,
    oldImagePath?: string
  ): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    const currentProfile = authRoleService.getCurrentProfile();

    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: 'Supabase belum dikonfigurasi untuk memperbarui data kerah.' };
    }
    if (collar.imageUrl?.startsWith('data:')) {
      return { success: false, error: 'Gambar kerah belum diunggah ke Supabase Storage.' };
    }

    const target = storageService.getOrderById(orderId);

    try {
      // 1. Delete and re-insert into order_collar table
      await client.from('order_collar').delete().eq('order_id', orderId);

      const collarImageUrl = collar.imageUrl || collar.imagePath || null;
      const fullPayload: Record<string, any> = {
        order_id: orderId,
        model_name: collar.modelName || 'POLO KANCING 2',
        collar_model_id: await masterDataService.resolveId('collar_models', collar.modelName || 'POLO KANCING 2'),
        image_url: collarImageUrl,
        image_path: collar.imagePath || null,
        updated_at: new Date().toISOString(),
      };

      let { error: insertErr } = await client.from('order_collar').insert(fullPayload);

      if (insertErr && (insertErr.message.includes('image_path') || insertErr.message.includes('updated_at'))) {
        // Fallback to actual schema columns (order_id, model_name, image_url)
        const fallbackRes = await client.from('order_collar').insert({
          order_id: orderId,
          model_name: collar.modelName || 'POLO KANCING 2',
          collar_model_id: fullPayload.collar_model_id,
          image_url: collarImageUrl,
        });
        insertErr = fallbackRes.error;
      }

      if (insertErr) {
        console.error('[Supabase] Update collar DB error:', insertErr);
        return { success: false, error: `Gagal memperbarui spesifikasi kerah: ${insertErr.message}` };
      }
      if (target) {
        target.collar = collar;
        storageService.saveOrder(target);
      }

      // 2. Touch order updated_at
      await client
        .from('orders')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', orderId);

      // 3. SAFE REPLACEMENT: Only delete old image after database update succeeded!
      if (oldImagePath && oldImagePath !== collar.imagePath) {
        await supabaseStorageService.deleteCollarImage(oldImagePath);
      }

      // 4. Log Activity
      if (target) {
        await this.logActivity(orderId, target.orderNumber, 'COLLAR_UPDATED', {
          collarModel: collar.modelName,
          hasImage: Boolean(collar.imageUrl),
          actor: currentProfile.name,
        });
      }

      return { success: true };
    } catch (err: any) {
      console.error('[Supabase] Exception updating collar:', err);
      return { success: false, error: err.message };
    }
  },

  // Delete Order
  async deleteOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    const target = storageService.getOrderById(orderId);
    const client = getSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: 'Supabase belum dikonfigurasi. Pesanan tidak dihapus.' };
    }

    try {
      const { error } = await client.from('orders').delete().eq('id', orderId);
      if (error) {
        console.error('[Supabase] Delete order error:', error);
        return { success: false, error: error.message };
      }

      storageService.deleteOrder(orderId);

      if (target) {
        await this.logActivity(orderId, target.orderNumber, 'ORDER_DELETED', {
          customer: target.customer.name,
        });
      }

      return { success: true };
    } catch (err: any) {
      console.error('[Supabase] Exception deleting order:', err);
      return { success: false, error: err.message };
    }
  },

  // Log workshop activity for audit trail
  async logActivity(
    orderId: string,
    orderNumber: string,
    action: string,
    details?: Record<string, any>
  ): Promise<void> {
    const client = getSupabaseClient();
    const currentProfile = authRoleService.getCurrentProfile();

    if (!client || !isSupabaseConfigured()) {
      try {
        const localLogs = JSON.parse(localStorage.getItem('myprintin_activity_logs') || '[]');
        localLogs.unshift({
          id: `local-log-${Date.now()}`,
          orderId,
          orderNumber,
          action,
          actorName: currentProfile.name,
          actorRole: currentProfile.role,
          details,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('myprintin_activity_logs', JSON.stringify(localLogs.slice(0, 50)));
      } catch {}
      return;
    }

    try {
      await client.from('order_activity_logs').insert({
        order_id: isValidUuid(orderId) ? orderId : null,
        order_number: orderNumber,
        action,
        actor_name: currentProfile.name,
        actor_role: currentProfile.role,
        details,
      });
    } catch (err) {
      console.warn('[Supabase] Could not record activity log:', err);
    }
  },

  // Fetch audit trail
  async getActivityLogs(): Promise<ActivityLog[]> {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      try {
        return JSON.parse(localStorage.getItem('myprintin_activity_logs') || '[]');
      } catch {
        return [];
      }
    }

    try {
      const { data, error } = await client
        .from('order_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(35);

      if (error || !data) {
        return JSON.parse(localStorage.getItem('myprintin_activity_logs') || '[]');
      }

      return data.map(d => ({
        id: d.id,
        orderId: d.order_id,
        orderNumber: d.order_number,
        action: d.action,
        actorName: d.actor_name,
        actorRole: d.actor_role,
        details: d.details,
        createdAt: d.created_at,
      }));
    } catch {
      return JSON.parse(localStorage.getItem('myprintin_activity_logs') || '[]');
    }
  },
};
