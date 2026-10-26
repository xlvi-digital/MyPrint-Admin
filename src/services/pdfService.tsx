import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Order } from '../types/order';
import { OrderPrintDocument } from '../components/print/OrderPrintDocument';
import { normalizeRoster } from '../utils/rosterData';

const MODERN_COLOR_FUNCTION = /\b(?:oklch|oklab|lch|lab|color)\([^)]*\)/gi;

function normalizeModernColors(documentClone: Document, containerId: string) {
  const cloneWindow = documentClone.defaultView;
  const renderingRoot = documentClone.getElementById(containerId);
  const canvas = documentClone.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!cloneWindow || !renderingRoot || !context) {
    throw new Error('Tidak dapat menyiapkan warna yang kompatibel untuk rendering PDF.');
  }

  const colorCache = new Map<string, string>();
  const convertColor = (colorFunction: string) => {
    const cached = colorCache.get(colorFunction);
    if (cached) return cached;

    context.clearRect(0, 0, 1, 1);
    context.fillStyle = 'rgb(1, 2, 3)';
    context.fillStyle = colorFunction;
    if (context.fillStyle === 'rgb(1, 2, 3)') {
      throw new Error(`Renderer browser tidak mendukung warna PDF: ${colorFunction}`);
    }
    context.fillRect(0, 0, 1, 1);

    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
    const rgbColor = `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
    colorCache.set(colorFunction, rgbColor);
    return rgbColor;
  };

  [renderingRoot, ...Array.from(renderingRoot.querySelectorAll('*'))].forEach(element => {
    const computedStyle = cloneWindow.getComputedStyle(element);
    for (let index = 0; index < computedStyle.length; index++) {
      const property = computedStyle.item(index);
      const value = computedStyle.getPropertyValue(property);
      if (!MODERN_COLOR_FUNCTION.test(value)) {
        MODERN_COLOR_FUNCTION.lastIndex = 0;
        continue;
      }
      MODERN_COLOR_FUNCTION.lastIndex = 0;

      const compatibleValue = value.replace(MODERN_COLOR_FUNCTION, convertColor);
      MODERN_COLOR_FUNCTION.lastIndex = 0;
      element instanceof cloneWindow.HTMLElement
        ? element.style.setProperty(property, compatibleValue)
        : element.setAttribute('style', `${element.getAttribute('style') || ''};${property}:${compatibleValue}`);
    }
  });
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  const imageName = image.alt || 'gambar Form Order';
  const fail = () => new Error(`Gagal memuat ${imageName} sebelum PDF dibuat.`);
  if (image.complete) {
    return image.naturalWidth > 0 ? Promise.resolve() : Promise.reject(fail());
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(fail());
    }, 10000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
    };
    const onLoad = () => {
      cleanup();
      image.naturalWidth > 0 ? resolve() : reject(fail());
    };
    const onError = () => {
      cleanup();
      reject(fail());
    };

    image.addEventListener('load', onLoad, { once: true });
    image.addEventListener('error', onError, { once: true });
    if (image.complete) onLoad();
  });
}

async function renderOrderDocument(
  root: Root,
  order: Order
): Promise<void> {
  root.render(
    <div style={{ width: '794px', background: '#ffffff' }}>
      <OrderPrintDocument order={order} mode="print" />
    </div>
  );
  await new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await document.fonts.ready;
}

/**
 * Converts a remote or Supabase Storage image URL into a base64 Data URL.
 * This guarantees zero CORS/tainting issues when rendering via html2canvas into jsPDF.
 */
export async function convertImageUrlToDataUrl(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;

  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          resolve(url);
        }
      };
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[pdfService] Fetch conversion fallback to HTMLImageElement canvas:', err);
    try {
      return await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 300;
            canvas.height = img.naturalHeight || img.height || 300;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
              return;
            }
          } catch {
            // ignore canvas taint
          }
          resolve(url);
        };
        img.onerror = () => resolve(url);
        img.src = url;
      });
    } catch {
      return url;
    }
  }
}

export interface PdfGenerationResult {
  success: boolean;
  fileName?: string;
  error?: string;
}

/**
 * Generates an A4 PDF for the given order and triggers a direct browser download.
 * File format: Form-Order-[NOMOR-ORDER].pdf
 */
export async function generateOrderPdf(order: Order): Promise<PdfGenerationResult> {
  const sanitizedOrderNo = (order.orderNumber || order.customer?.orderNumber || 'DRAFT')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Form-Order-${sanitizedOrderNo}.pdf`;

  // 1. Prepare cloned order with converted base64 data URLs for maximum rendering fidelity
  let collarImageUrl = order.collar?.imageUrl;
  if (collarImageUrl && !collarImageUrl.startsWith('data:')) {
    collarImageUrl = await convertImageUrlToDataUrl(collarImageUrl);
  }

  const convertedDesigns = await Promise.all(
    (order.designs || []).map(async (d) => {
      if (d.dataUrl && !d.dataUrl.startsWith('data:')) {
        const converted = await convertImageUrlToDataUrl(d.dataUrl);
        return { ...d, dataUrl: converted || d.dataUrl };
      }
      return d;
    })
  );

  const clonedOrder: Order = {
    ...order,
    players: normalizeRoster(order.players || []),
    collar: {
      ...order.collar,
      imageUrl: collarImageUrl,
    },
    designs: convertedDesigns,
  };

  // 2. Create isolated offscreen container with exact A4 standard layout width (794px at 96 DPI)
  const container = document.createElement('div');
  container.id = `pdf-export-${Date.now()}`;
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-99999';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  let root: Root | null = null;

  try {
    // 3. Render OrderPrintDocument with mode="print" into offscreen container
    const pdfRoot = createRoot(container);
    root = pdfRoot;
    await renderOrderDocument(pdfRoot, clonedOrder);

    // 4. Ensure all images inside container are decoded and loaded
    const imgElements = Array.from(container.querySelectorAll('img'));
    await Promise.all(imgElements.map(waitForImage));

    // Minor pause for final layout calculation
    await new Promise((r) => setTimeout(r, 100));

    // 5. Select all .print-page elements
    const pageElements = Array.from(container.querySelectorAll<HTMLElement>('.print-page'));
    const targetsToCapture = pageElements.length > 0 ? pageElements : [container];
    const maximumPageHeight = 794 * 297 / 210;
    targetsToCapture.forEach((page, index) => {
      if (page.scrollWidth > page.clientWidth + 1) {
        throw new Error(`Konten halaman ${index + 1} melewati lebar A4.`);
      }
      if (page.getBoundingClientRect().height > maximumPageHeight) {
        throw new Error(`Konten halaman ${index + 1} melebihi tinggi halaman A4.`);
      }
    });

    // 6. Initialize jsPDF in A4 Portrait mode (210 x 297 mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < targetsToCapture.length; i++) {
      const pageEl = targetsToCapture[i];

      const canvas = await html2canvas(pageEl, {
        scale: 2, // 2x high-resolution retina output
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794,
        onclone: clonedDocument => normalizeModernColors(clonedDocument, container.id),
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);
      const pageWidth = 210;
      const pageHeight = Math.min(297, canvas.height * pageWidth / canvas.width);
      const top = (297 - pageHeight) / 2;

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, top, pageWidth, pageHeight, undefined, 'FAST');
    }

    // 7. Save and trigger direct file download
    pdf.save(fileName);

    return {
      success: true,
      fileName,
    };
  } catch (err: any) {
    console.error('[pdfService] Error generating PDF:', err);
    return {
      success: false,
      error: err.message || 'Gagal menghasilkan file PDF.',
    };
  } finally {
    // 8. Safely unmount and clean up DOM container
    try {
      if (root) {
        root.unmount();
      }
    } catch {
      // ignore
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
