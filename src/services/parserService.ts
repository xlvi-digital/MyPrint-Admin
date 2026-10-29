import { WhatsAppParseResult, COMMON_MATERIALS, STANDARD_SIZES } from '../types/order';

const KNOWN_SIZES = ['4XL', '3XL', '2XL', 'XXL', 'XL', 'XS', 'S', 'M', 'L', 'ALL SIZE'];

/**
 * Intelligent WhatsApp message parser for sublimation & jersey orders
 */
export function parseWhatsAppOrder(text: string): WhatsAppParseResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  let customerName: string | undefined = undefined;
  let phone: string | undefined = undefined;
  let teamName: string | undefined = undefined;
  let productType: string | undefined = undefined;
  let material: string | undefined = undefined;
  let quantity: number | undefined = undefined;
  let rib: string | undefined = undefined;
  let collar: string | undefined = undefined;

  const players: { name: string; number: string; size: string; quantity: number }[] = [];
  const notes: string[] = [];

  // Check Phone number in entire text
  const phoneMatch = text.match(/(\+?62|08)[0-9\s-]{8,15}/);
  if (phoneMatch) {
    phone = phoneMatch[0].replace(/\s+/g, '');
  }

  // Check Total Quantity (e.g., "20 pcs", "20pcs", "total 20", "order 76 pcs", "order 20")
  const qtyMatch = text.match(/(\b\d{1,4})\s*(pcs|potong|biji|stel|pasang|lembar)\b/i) ||
                   text.match(/\btotal\s*:\s*(\d{1,4})\b/i) ||
                   text.match(/\border\s+(?:jersey\s+)?(\d{1,4})\b/i);
  if (qtyMatch) {
    const parsedQty = parseInt(qtyMatch[1], 10);
    if (!isNaN(parsedQty) && parsedQty > 0) {
      quantity = parsedQty;
    }
  }

  // Check Material (Milano, Drifit Benzema, etc.)
  for (const mat of COMMON_MATERIALS) {
    if (mat === 'Custom') continue;
    const regex = new RegExp(`\\b${mat.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      material = mat;
      break;
    }
  }
  // Secondary material checks
  if (!material) {
    if (/milano/i.test(text)) material = 'Milano';
    else if (/benzema/i.test(text)) material = 'Drifit Benzema';
    else if (/bintik/i.test(text)) material = 'Drifit Bintik / Nike';
    else if (/jarum/i.test(text)) material = 'Drifit Jarum';
    else if (/lotto/i.test(text)) material = 'Lotto';
    else if (/serena/i.test(text)) material = 'Serena';
    else if (/paragon/i.test(text)) material = 'Paragon';
    else if (/brazil/i.test(text)) material = 'Dryfit Brazil';
  }

  // Check Product Type
  if (/setelan|celana\s*lotto/i.test(text)) {
    productType = 'Jersey Sublime Setelan';
  } else if (/jersey|sublim/i.test(text)) {
    productType = 'Jersey Sublime';
  } else if (/running|singlet/i.test(text)) {
    productType = 'Jersey Running / Singlet';
  } else if (/jaket|hoodie/i.test(text)) {
    productType = 'Jaket / Hoodie Sublime';
  } else if (/kaos/i.test(text)) {
    productType = 'Kaos Event Sublime';
  }

  // Check Rib
  if (/tidak\s*pakai\s*rib|tanpa\s*rib/i.test(text)) {
    rib = 'Tidak Pakai Rib';
  } else if (/rib\s*leher\s*\+\s*tangan/i.test(text)) {
    rib = 'Rib Leher + Tangan';
  } else if (/rib\s*leher/i.test(text)) {
    rib = 'Rib Leher Saja';
  }

  // Check Collar
  if (/polo\s*kancing\s*2/i.test(text)) {
    collar = 'POLO KANCING 2';
  } else if (/polo\s*kancing\s*3/i.test(text)) {
    collar = 'POLO KANCING 3';
  } else if (/v-?neck/i.test(text)) {
    collar = 'V-NECK STANDAR';
  } else if (/o-?neck/i.test(text)) {
    collar = 'O-NECK STANDAR';
  } else if (/shanghai|mandarin/i.test(text)) {
    collar = 'SHANGHAI / MANDARIN';
  }

  // Process line by line for Customer Name, Player roster, and Notes
  let inPlayerSection = false;

  for (const line of lines) {
    // Explicit customer name marker
    const nameMatch = line.match(/^(?:nama\s*pemesan|pemesan|atas\s*nama|nama|an|a\/n)\s*[:=]\s*(.+)$/i);
    if (nameMatch && !customerName) {
      customerName = nameMatch[1].trim();
      continue;
    }

    // Team name marker
    const teamMatch = line.match(/^(?:nama\s*tim|tim|klub|club|instansi)\s*[:=]\s*(.+)$/i);
    if (teamMatch) {
      teamName = teamMatch[1].trim();
      continue;
    }

    // Header trigger for player section
    if (/^(?:nama|data\s*pemain|daftar\s*nama|roster|list\s*nama|size)\s*[:=]?$/i.test(line)) {
      inPlayerSection = true;
      continue;
    }

    // Check if line is a player row: e.g. "Budi 10 M", "1. Andi 7 L", "Rizky - 9 - XL", "Fahmi 12 XXL"
    const parsedPlayer = parsePlayerLine(line);
    if (parsedPlayer) {
      players.push(parsedPlayer);
      continue;
    }

    // If it's not a greeting or player header, collect as meaningful notes
    const lowerLine = line.toLowerCase();
    const isGreeting = /^(halo|permisi|pagi|siang|malam|bang|mas|min|bos|assalamu|mau\s*tanya|mau\s*order|order)/i.test(line) && line.length < 50;
    
    if (!isGreeting && !nameMatch && !teamMatch) {
      // Check if it's production note (e.g. "Tidak pakai rib", "Atasan Milano", "Celana Lotto saku 1")
      if (
        /rib|atasan|celana|saku|kancing|lengan|kerah|motif|logo|desain|sponsor|tulisan|warna|polyflex|sablon/i.test(line) ||
        line.startsWith('-') ||
        line.startsWith('*')
      ) {
        notes.push(line.replace(/^[-*•]\s*/, '').trim());
      }
    }
  }

  // If players found, update quantity if quantity was not explicitly stated
  if (players.length > 0 && (!quantity || quantity === 0)) {
    quantity = players.reduce((sum, p) => sum + p.quantity, 0);
  }

  return {
    customerName,
    phone,
    teamName,
    productType,
    material,
    quantity,
    rib,
    collar,
    players,
    notes,
    rawText: text,
    detectedFields: {
      customerName: Boolean(customerName),
      phone: Boolean(phone),
      productType: Boolean(productType),
      material: Boolean(material),
      quantity: Boolean(quantity && quantity > 0),
      players: players.length > 0,
      notes: notes.length > 0,
    },
  };
}

/**
 * Parses a single line representing a player name, jersey number, and size
 * Examples:
 * "Budi 10 M"
 * "1. ANDI 7 L"
 * "Rizky #9 XL"
 * "Fahmi 12 XXL"
 * "Official - XL x2"
 */
export function parsePlayerLine(line: string): { name: string; number: string; size: string; quantity: number } | null {
  // Strip leading numbering e.g. "1.", "1)", "[1]"
  let cleanLine = line.replace(/^\s*\d+[\.\)\-]\s*/, '').trim();

  // Strip punctuation like dashes between items: "BUDI - 10 - M" -> "BUDI 10 M"
  cleanLine = cleanLine.replace(/\s*[-–—]\s*/g, ' ');

  // Extract quantity suffix e.g. "x2", "2pcs", "(2)"
  let qty = 1;
  const qtySuffix = cleanLine.match(/(?:x|\*|\()\s*(\d+)\s*(?:pcs|\))?$/i);
  if (qtySuffix) {
    qty = parseInt(qtySuffix[1], 10) || 1;
    cleanLine = cleanLine.replace(/(?:x|\*|\()\s*(\d+)\s*(?:pcs|\))?$/i, '').trim();
  }

  const tokens = cleanLine.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  // Find token that matches known size (usually last or second to last token)
  let sizeIndex = -1;
  let foundSize = '';

  for (let i = tokens.length - 1; i >= 0; i--) {
    const upper = tokens[i].toUpperCase();
    if (KNOWN_SIZES.includes(upper)) {
      sizeIndex = i;
      foundSize = upper === '2XL' ? 'XXL' : upper;
      break;
    }
  }

  if (sizeIndex === -1) return null;

  // Remaining tokens are name and number
  const beforeTokens = tokens.slice(0, sizeIndex);
  const afterTokens = tokens.slice(sizeIndex + 1);

  let number = '-';
  const nameParts: string[] = [];

  for (const t of [...beforeTokens, ...afterTokens]) {
    // Check if token is a jersey number (e.g. "10", "#10", "07", "00")
    if (/^#?\d{1,3}$/.test(t) && number === '-') {
      number = t.replace('#', '');
    } else {
      nameParts.push(t);
    }
  }

  const name = nameParts.join(' ').trim().toUpperCase();
  if (!name) return null;

  return {
    name,
    number,
    size: foundSize,
    quantity: qty,
  };
}

/**
 * Parses pasted raw text into structured PlayerDetail roster
 * Supports multiple lines pasted directly from WhatsApp or Excel
 */
export interface ParsedPastedPlayer {
  name: string;
  number: string;
  size: string;
  quantity: number;
  sleeve?: 'Pendek' | 'Panjang';
  notes: string;
}

export interface PastedRosterIssue {
  lineNumber: number;
  line: string;
  reason: string;
}

export interface ParsedPastedRosterRow {
  lineNumber: number;
  line: string;
  player: ParsedPastedPlayer;
  status: 'valid' | 'review';
  reason?: string;
}

export interface PastedRosterParseResult {
  players: ParsedPastedPlayer[];
  issues: PastedRosterIssue[];
  rows: ParsedPastedRosterRow[];
}

const PASTED_SIZE_PATTERN = /^(CUSTOM|XXXL|3XL|4XL|XXL|2XL|XL|XS|S|M|L)$/i;

function canonicalizeSize(size: string): string {
  const upper = size.toUpperCase();
  if (upper === 'CUSTOM') return 'Custom';
  if (upper === '2XL') return 'XXL';
  if (upper === 'XXXL') return '3XL';
  return upper;
}

const cleanRosterText = (value: string) => value
  .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function extractRosterAnnotations(line: string): { content: string; annotations: string[] } {
  const annotations: string[] = [];
  const content = line.replace(/\(([^()]*)\)/g, (_group, value: string) => {
    annotations.push(value.trim());
    return ' ';
  });
  return { content: cleanRosterText(content), annotations };
}

function parsePastedTextLine(line: string): { player: ParsedPastedPlayer; uncertain: boolean } {
  const cleanLine = line
    .replace(/^\s*\[\d+\]\s*/, '')
    .replace(/^\s*\d+\s*[.)-]\s*/, '')
    .replace(/^\s*\d+\s+(?=[\p{L}@])/u, '')
    .trim();
  const { content: unannotated, annotations } = extractRosterAnnotations(cleanLine);
  let quantity = 1;
  let content = unannotated;
  const quantityMatch = content.match(/(?:\bx|\*)\s*(\d+)\s*$|\b(\d+)\s*(?:pcs?|potong)\s*$/i);
  const quantityValue = quantityMatch?.slice(1).find(Boolean);
  if (quantityMatch && quantityValue) {
    quantity = Math.max(1, parseInt(quantityValue, 10) || 1);
    content = content.slice(0, quantityMatch.index).trim();
  }

  const annotationsContainSize = annotations.find(annotation => {
    const match = annotation.match(/^(?:ukuran\s+)?(CUSTOM|XXXL|3XL|4XL|XXL|2XL|XL|XS|S|M|L)$/i);
    return Boolean(match);
  });
  const slashParts = content.includes('/') ? content.split('/').map(part => part.trim()) : [];
  let name = '';
  let number = '-';
  let size = annotationsContainSize
    ? canonicalizeSize(annotationsContainSize.replace(/^ukuran\s+/i, ''))
    : '';
  const noteParts: string[] = annotations.filter(annotation => !/^(?:ukuran\s+)?(CUSTOM|XXXL|3XL|4XL|XXL|2XL|XL|XS|S|M|L)$/i.test(annotation));
  let uncertain = false;

  const assignSizeAndNumber = (parts: string[]) => {
    for (const part of parts) {
      const sizeValue = part.replace(/^ukuran\s+/i, '').trim();
      if (!size && PASTED_SIZE_PATTERN.test(sizeValue)) {
        size = canonicalizeSize(sizeValue);
        continue;
      }
      const numberMatch = part.match(/^(?:no\.?\s*(?:punggung)?\s*[:#-]?\s*)?#?(\d{1,3})$/i);
      if (number === '-' && numberMatch) {
        number = numberMatch[1];
        continue;
      }
      if (part && part !== name) noteParts.push(part);
    }
  };

  if (slashParts.length > 1) {
    name = slashParts.shift() || '';
    assignSizeAndNumber(slashParts);
  } else {
    const explicitSize = /\bukuran\s+(CUSTOM|XXXL|3XL|4XL|XXL|2XL|XL|XS|S|M|L)\b/i.exec(content);
    const sizeCandidates = [...content.matchAll(/\b(CUSTOM|XXXL|3XL|4XL|XXL|2XL|XL|XS|S|M|L)\b/gi)];
    const sizeMatch = explicitSize || sizeCandidates[sizeCandidates.length - 1];
    if (sizeMatch) {
      size = size || canonicalizeSize(sizeMatch[1]);
      const before = content.slice(0, sizeMatch.index).trim();
      const prefixMatch = before.match(/^(.*?)\s*(?:no\.?\s*(?:punggung)?\s*)?[-–—]?\s*#?(\d{1,3})\s*$/i);
      if (prefixMatch?.[1]?.trim()) {
        name = prefixMatch[1].replace(/[\s\-–—]+$/, '').trim();
        number = prefixMatch[2];
      } else {
        name = before;
      }
      noteParts.push(content.slice((sizeMatch.index || 0) + sizeMatch[0].length));
    } else {
      const prefixMatch = content.match(/^(.*?)\s*(?:no\.?\s*(?:punggung)?\s*)?[-–—]?\s*#?(\d{1,3})\s*$/i);
      if (prefixMatch?.[1]?.trim()) {
        name = prefixMatch[1].replace(/[\s\-–—]+$/, '').trim();
        number = prefixMatch[2];
      } else {
        name = content;
      }
    }
  }

  const noName = /^(?:tanpa nama|nama kosong|-)$/i.test(name);
  if (noName) name = '-';
  if (/\btanpa nomor\b|\btanpa nomor punggung\b|\btanpa nama\s*(?:dan|&)\s*nomor\b/i.test(`${name} ${noteParts.join(' ')}`)) {
    if (/tanpa nama\s*(?:dan|&)\s*nomor/i.test(`${name} ${noteParts.join(' ')}`)) name = '-';
    number = '-';
  }

  let sleeve: 'Pendek' | 'Panjang' | undefined;
  const normalizedNotes = noteParts.map(note => note.replace(/\blengan\s+(panjang|pendek)\b/gi, (_match, value: string) => {
    sleeve = value.toLowerCase() === 'panjang' ? 'Panjang' : 'Pendek';
    return '';
  }).replace(/\b(panjang|pendek)\b/gi, (_match, value: string) => {
    sleeve = value.toLowerCase() === 'panjang' ? 'Panjang' : 'Pendek';
    return '';
  }));
  const notes = cleanRosterText(normalizedNotes.join('; '));

  const unresolvedSizeToken = slashParts.some(part =>
    /^[A-Za-z0-9-]{1,5}$/.test(part)
    && !PASTED_SIZE_PATTERN.test(part)
    && !/^(?:no\.?\s*(?:punggung)?\s*[:#-]?\s*)?#?\d{1,3}$/i.test(part),
  );
  if (!name) {
    name = '-';
    uncertain = true;
  }
  if (unresolvedSizeToken) uncertain = true;

  return {
    player: {
      name,
      number,
      size: size || '-',
      quantity,
      sleeve,
      notes,
    },
    uncertain,
  };
}

export function parsePastedRosterDetailed(rawText: string): PastedRosterParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(entry => entry.line);
  const rows = lines.map(({ line, lineNumber }) => {
    const parsed = parsePastedTextLine(line);
    return {
      lineNumber,
      line,
      player: parsed.player,
      status: parsed.uncertain ? 'review' as const : 'valid' as const,
      reason: parsed.uncertain ? 'Periksa kembali nama atau token ukuran yang belum dikenali.' : undefined,
    };
  });
  const players = rows.filter(row => row.status === 'valid').map(row => row.player);
  const issues = rows
    .filter(row => row.status === 'review')
    .map(row => ({
      lineNumber: row.lineNumber,
      line: row.line,
      reason: row.reason || 'Periksa kembali data roster ini.',
    }));
  return { players, issues, rows };
}

export function parsePastedRoster(rawText: string): ParsedPastedPlayer[] {
  return parsePastedRosterDetailed(rawText).players;
}
