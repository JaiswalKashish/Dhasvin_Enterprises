let getDocument: any;

async function initPdfJs() {
  if (!getDocument) {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      getDocument = pdfjs.getDocument;
    } catch (e) {
      const pdfjs = await import("pdfjs-dist");
      getDocument = (pdfjs as any).getDocument;
    }
  }
  return getDocument;
}

export interface ParsedDataItem {
  product: string;
  quantity: number;
  price: number;
  gst?: number;
  hsn?: string;
}

export async function parsePdfData(buffer: Buffer): Promise<ParsedDataItem[]> {
  const pdfjsGetDocument = await initPdfJs();
  const rawText = await extractPdfText(buffer, pdfjsGetDocument);
  return parseTextData(rawText);
}

async function extractPdfText(buffer: Buffer, pdfjsGetDocument: any): Promise<string> {
  try {
    const loadingTask = pdfjsGetDocument({ data: buffer, verbosity: 0 });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      try {
        const page = await pdf.getPage(pageNo);
        const content = await page.getTextContent();
        const lines = groupPageTextItems(content.items as any[]);
        pages.push(lines.join("\n"));
      } catch (pageError) {
        console.error(`Error extracting page ${pageNo}:`, pageError);
        pages.push(`[Error extracting page ${pageNo}]`);
      }
    }

    await pdf.destroy();
    const result = pages.filter(Boolean).join("\n\n");
    if (!result || result.trim().length === 0) {
      throw new Error("No text content found in PDF");
    }
    return result;
  } catch (error) {
    throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function groupPageTextItems(items: any[]): string[] {
  const rows: Array<{ y: number; x: number; str: string }> = [];

  for (const item of items) {
    const transform = item.transform ?? item.transformMatrix ?? [];
    const y = typeof transform[5] === "number" ? Math.round(transform[5] * 10) : 0;
    const x = typeof transform[4] === "number" ? transform[4] : 0;
    rows.push({ y, x, str: String(item.str ?? "") });
  }

  rows.sort((a, b) => b.y - a.y || a.x - b.x);

  const grouped: string[][] = [];
  let currentY: number | null = null;
  for (const row of rows) {
    if (currentY === null || Math.abs(row.y - currentY) > 2) {
      grouped.push([row.str]);
      currentY = row.y;
    } else {
      grouped[grouped.length - 1].push(row.str);
    }
  }

  return grouped
    .map((parts) => parts.join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseTextData(text: string): ParsedDataItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[\s\-=_]{3,}$/.test(line));

  // Try to detect table structure first
  const tableData = extractTableData(lines);
  if (tableData.length > 0) {
    return tableData;
  }

  // Fallback to regex parsing
  return extractFallbackData(lines);
}

function extractTableData(lines: string[]): ParsedDataItem[] {
  // Look for header row
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (/(product|item|description|qty|quantity|price|rate|amount)/.test(line) &&
        splitLine(lines[i]).length >= 3) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return [];

  const headerParts = splitLine(lines[headerIndex]);
  const schema = buildHeaderSchema(headerParts);

  const items: ParsedDataItem[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^(subtotal|tax|total|grand total|amount due)/i.test(line)) break;

    const parts = splitLine(line);
    if (parts.length < 2) continue;

    const item = parseRowFromTokens(parts, schema);
    if (item.product && (item.quantity > 0 || item.price > 0)) {
      items.push(item);
    }
  }

  return items;
}

function extractFallbackData(lines: string[]): ParsedDataItem[] {
  const items: ParsedDataItem[] = [];

  // Regex pattern for product, quantity, price
  const pattern = /(.+?)\s+(\d+)\s+(\d+(?:\.\d+)?)/g;

  for (const line of lines) {
    if (/^(subtotal|tax|total|grand total|amount due|invoice|bill)/i.test(line)) continue;

    const matches = [...line.matchAll(pattern)];
    for (const match of matches) {
      const product = match[1].trim();
      const quantity = parseInt(match[2], 10);
      const price = parseFloat(match[3]);

      if (product && quantity > 0 && price > 0) {
        items.push({
          product,
          quantity,
          price,
        });
      }
    }
  }

  return items;
}

function splitLine(line: string): string[] {
  const columns = line.split(/\t| {2,}/).map((part) => part.trim()).filter(Boolean);
  if (columns.length >= 2) return columns;
  return line.split(/\s+/).map((part) => part.trim()).filter(Boolean);
}

function buildHeaderSchema(headers: string[]): string[] {
  return headers.map((header) => {
    const normalized = normalizeHeaderToken(header);
    if (/(product|item|description|particulars|service|goods)/.test(normalized)) return "product";
    if (/(quantity|qty|units|nos|pcs|pack)/.test(normalized)) return "quantity";
    if (/(price|rate|amount|unit price|mrp|value|cost)/.test(normalized)) return "price";
    if (/(gst|tax)/.test(normalized)) return "gst";
    if (/(hsn)/.test(normalized)) return "hsn";
    return "";
  });
}

function normalizeHeaderToken(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, " ").trim();
}

function parseRowFromTokens(tokens: string[], schema: string[]): ParsedDataItem {
  const item: ParsedDataItem = {
    product: "",
    quantity: 0,
    price: 0,
  };

  const normalizedTokens = tokens.map((token) => token.replace(/\u00A0/g, " ").trim());

  for (let i = 0; i < normalizedTokens.length; i++) {
    const token = normalizedTokens[i];
    if (!token) continue;
    const header = schema[i] || "";

    if (header === "product") {
      item.product = [item.product, token].filter(Boolean).join(" ").trim();
    } else if (header === "quantity") {
      item.quantity = Math.round(parseNum(token));
    } else if (header === "price") {
      item.price = parseNum(token);
    } else if (header === "gst") {
      item.gst = parseNum(token);
    } else if (header === "hsn") {
      item.hsn = token;
    } else if (!/[₹\d%]/.test(token)) {
      item.product = [item.product, token].filter(Boolean).join(" ").trim();
    }
  }

  // Fallback parsing for unstructured data
  const numericTokens = normalizedTokens
    .map((token) => ({ token, numeric: cleanNumber(token), isPercent: /%$/.test(token) }))
    .filter(({ numeric }) => numeric.length > 0);

  if (!item.price && numericTokens.length > 0) {
    item.price = parseNum(numericTokens[numericTokens.length - 1].token);
  }

  if (!item.quantity && numericTokens.length > 1) {
    item.quantity = Math.round(parseNum(numericTokens[numericTokens.length - 2].token));
  }

  if (!item.product) {
    const firstTextIndex = normalizedTokens.findIndex((token) => !/[₹\d%]/.test(token));
    if (firstTextIndex >= 0) {
      item.product = normalizedTokens.slice(0, firstTextIndex + 1).join(" ").trim();
    }
  }

  if (!item.product) {
    item.product = normalizedTokens.filter((token) => !/[₹\d%]/.test(token)).join(" ").trim();
  }

  if (!item.product) {
    item.product = "Unknown Product";
  }

  return item;
}

function cleanNumber(value: string): string {
  return String(value || "")
    .replace(/[,₹]/g, "")
    .replace(/%/g, "")
    .replace(/[^0-9.\-]/g, "")
    .trim();
}

function parseNum(s: string): number {
  const cleaned = cleanNumber(s);
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}