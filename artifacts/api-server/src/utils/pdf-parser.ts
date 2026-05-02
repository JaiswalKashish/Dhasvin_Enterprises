let getDocument: any;

async function initPdfJs() {
  if (!getDocument) {
    try {
      // For Node.js - use the built-in distribution
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      getDocument = pdfjs.getDocument;
    } catch (e) {
      // Fallback to main export
      const pdfjs = await import("pdfjs-dist");
      getDocument = (pdfjs as any).getDocument;
    }
  }
  return getDocument;
}

export interface ExtractedItem {
  name: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  gstPercent: number;
  taxAmount: number;
  totalAmount: number;
}

export interface ExtractedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  customerName: string;
  items: ExtractedItem[];
  grandTotal: number;
  rawText: string;
  parseWarnings: string[];
}

export async function parsePdfInvoice(buffer: Buffer): Promise<ExtractedInvoice> {
  const pdfjsGetDocument = await initPdfJs();
  const rawText = await extractPdfText(buffer, pdfjsGetDocument);
  const result = parseInvoiceText(rawText);
  
  if (result.items.length === 0) {
    const aiResult = await parseWithAI(rawText);
    if (aiResult) {
      return aiResult;
    }
  }
  
  return result;
}

async function extractPdfText(buffer: Buffer, pdfjsGetDocument: any): Promise<string> {
  try {
    // Validate PDF buffer
    if (!buffer || buffer.length === 0) {
      throw new Error("PDF file is empty");
    }

    // Check for PDF magic number
    const isPdfFile = buffer.length >= 4 && 
      buffer[0] === 0x25 && // %
      buffer[1] === 0x50 && // P
      buffer[2] === 0x44 && // D
      buffer[3] === 0x46;   // F

    if (!isPdfFile) {
      throw new Error("File is not a valid PDF (invalid header/signature)");
    }

    const dataArray = new Uint8Array(buffer);
    const loadingTask = pdfjsGetDocument({ data: dataArray, verbosity: 0 });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      try {
        const page = await pdf.getPage(pageNo);
        const content = await page.getTextContent();
        const lines = groupPageTextItems(content.items as any[]);
        if (lines.length > 0) {
          pages.push(lines.join("\n"));
        }
      } catch (pageError) {
        console.error(`Error extracting page ${pageNo}:`, pageError);
        // Continue with other pages instead of stopping
        pages.push("[Page could not be extracted]");
      }
    }

    await pdf.destroy();
    const result = pages.filter(line => line && line.trim() && !line.includes("[Page could not be extracted]")).join("\n\n");
    
    if (!result || result.trim().length === 0) {
      throw new Error("PDF file has no readable text content. Try uploading a PDF with selectable text or an image-based PDF.");
    }
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`PDF extraction failed: ${errorMsg}`);
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

function parseInvoiceText(text: string): ExtractedInvoice {
  const warnings: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[\s\-=_]{3,}$/.test(line));

  const invoiceNumber = findInvoiceNumber(lines);
  const invoiceDate = findInvoiceDate(lines);
  const supplierName = findSupplierName(lines);
  const customerName = findCustomerName(lines);
  const items = extractItems(lines, warnings);

  if (items.length === 0) {
    warnings.push("No valid product data found.");
  }

  const grandTotal = findGrandTotal(lines);

  return {
    invoiceNumber,
    invoiceDate,
    supplierName,
    customerName,
    items,
    grandTotal,
    rawText: text,
    parseWarnings: warnings,
  };
}

function findInvoiceNumber(lines: string[]): string {
  const patterns = [
    /invoice\s*(number|no|#)[:\s]*([\w\/-]+)/i,
    /bill\s*(number|no|#)[:\s]*([\w\/-]+)/i,
    /inv\.?\s*(no|#)[:\s]*([\w\/-]+)/i,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match?.[2]) return match[2].trim();
    }
  }

  return "";
}

function findInvoiceDate(lines: string[]): string {
  const datePattern = /\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b/;
  for (const line of lines) {
    const match = line.match(/(?:invoice\s*date|date)[:\s]*([^\n]+)/i);
    if (match?.[1]) {
      const dateMatch = match[1].match(datePattern);
      if (dateMatch) return dateMatch[1].trim();
    }
  }

  for (const line of lines) {
    const match = line.match(datePattern);
    if (match) return match[1].trim();
  }

  return "";
}

function findSupplierName(lines: string[]): string {
  const lower = lines.map((line) => line.toLowerCase());
  const gstIndex = lower.findIndex((line) => /gstin/.test(line));
  if (gstIndex > 0) {
    for (let i = gstIndex - 1; i >= 0; i--) {
      const candidate = lines[i];
      if (candidate.length > 3 && !/^(tax\s*invoice|original|duplicate|triplicate)/i.test(candidate)) {
        return candidate;
      }
    }
  }

  const vendorIndex = lower.findIndex((line) => /(bill to|sold to|ship to|customer)/.test(line));
  if (vendorIndex > 0) {
    for (let i = vendorIndex - 1; i >= 0; i--) {
      const candidate = lines[i];
      if (candidate.length > 3 && !/^(gstin|address|phone|email)/i.test(candidate)) {
        return candidate;
      }
    }
  }

  return "";
}

function findCustomerName(lines: string[]): string {
  const index = lines.findIndex((line) => /(bill to|ship to|customer|sold to)/i.test(line));
  if (index >= 0) {
    for (let i = index + 1; i < Math.min(lines.length, index + 6); i++) {
      const candidate = lines[i];
      if (candidate.length > 3 && !/^(gstin|address|phone|email)/i.test(candidate)) {
        return candidate;
      }
    }
  }

  return "";
}

function findGrandTotal(lines: string[]): number {
  for (const line of lines) {
    const match = line.match(/\b(grand total|net total|invoice total|total amount|amount due|balance due|total)\b[:\s]*([₹Rs\s]*[\d,]+\.?\d*)/i);
    if (match?.[2]) return parseNum(match[2]);
  }

  for (const line of [...lines].reverse()) {
    const match = line.match(/([₹Rs\s]*[\d,]+\.?\d*)$/);
    if (match) {
      const value = parseNum(match[1]);
      if (value > 0) return value;
    }
  }

  return 0;
}

function extractItems(lines: string[], warnings: string[]): ExtractedItem[] {
  const headerIndex = findTableHeader(lines);
  if (headerIndex >= 0) {
    const headerSchema = buildHeaderSchema(splitLine(lines[headerIndex]));
    const rows = extractRowsAfterHeader(lines.slice(headerIndex + 1), headerSchema);
    if (rows.length > 0) return rows;
  }

  const fallback = extractFallback(lines);
  if (fallback.length > 0) return fallback;

  warnings.push("Unsupported PDF format or no recognizable invoice table found.");
  return [];
}

function findTableHeader(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].toLowerCase();
    const hasName = /(item|product|description|particulars|service)/.test(header);
    const hasQty = /(qty|quantity|units|nos|pcs|pack)/.test(header);
    const hasPrice = /(price|rate|amount|unit price|mrp|value)/.test(header);
    if (hasName && (hasQty || hasPrice)) {
      return i;
    }
  }
  return -1;
}

function extractRowsAfterHeader(lines: string[], schema: string[]): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  for (const line of lines) {
    if (/^(subtotal|tax|grand total|total amount|billing amount|amount payable|balance due|gst total|cgst|sgst|igst)/i.test(line)) {
      break;
    }
    if (/^(item|product|description|qty|quantity|rate|price|amount)/i.test(line) && splitLine(line).length > 3 && /\b(item|qty|amount|price)\b/i.test(line)) {
      continue;
    }

    const parts = splitLine(line);
    if (parts.length < 2) continue;

    const item = parseRowFromTokens(parts, schema);
    if (item.name && (item.quantity > 0 || item.unitPrice > 0 || item.totalAmount > 0)) {
      items.push(item);
    }
  }
  return items;
}

function extractFallback(lines: string[]): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  for (const line of lines) {
    if (/^(subtotal|tax|grand total|total amount|amount due|balance due|invoice|bill|gstin)/i.test(line)) continue;
    const parts = splitLine(line);
    if (parts.length < 3) continue;

    const numericCount = parts.filter((part) => /[\d₹%]/.test(part)).length;
    if (numericCount < 2) continue;

    const item = parseRowFromTokens(parts, []);
    if (item.name && (item.quantity > 0 || item.unitPrice > 0 || item.totalAmount > 0)) {
      items.push(item);
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
    if (/(product|item|description|particulars|service)/.test(normalized)) return "name";
    if (/(quantity|qty|units|nos|pcs|pack)/.test(normalized)) return "quantity";
    if (/(price|rate|amount|unit price|mrp|value)/.test(normalized)) return "price";
    if (/(hsn)/.test(normalized)) return "hsn";
    if (/(gst|tax)/.test(normalized)) return "gst";
    if (/(total|net amount|gross amount)/.test(normalized)) return "total";
    return "";
  });
}

function normalizeHeaderToken(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, " ").trim();
}

function parseRowFromTokens(tokens: string[], schema: string[]): ExtractedItem {
  const row: ExtractedItem = {
    name: "",
    hsnCode: "",
    quantity: 0,
    unitPrice: 0,
    gstPercent: 0,
    taxAmount: 0,
    totalAmount: 0,
  };

  const normalizedTokens = tokens.map((token) => token.replace(/\u00A0/g, " ").trim());

  for (let i = 0; i < normalizedTokens.length; i++) {
    const token = normalizedTokens[i];
    if (!token) continue;
    const header = schema[i] || "";

    if (header === "name") {
      row.name = [row.name, token].filter(Boolean).join(" ").trim();
      continue;
    }

    if (header === "quantity") {
      row.quantity = Math.round(parseNum(token));
      continue;
    }

    if (header === "price") {
      row.unitPrice = parseNum(token);
      continue;
    }

    if (header === "total") {
      row.totalAmount = parseNum(token);
      continue;
    }

    if (header === "gst") {
      if (/%$/.test(token)) {
        row.gstPercent = parseNum(token);
      } else {
        row.taxAmount = parseNum(token);
      }
      continue;
    }

    if (header === "hsn") {
      row.hsnCode = token;
      continue;
    }

    if (!/[₹\d%]/.test(token)) {
      row.name = [row.name, token].filter(Boolean).join(" ").trim();
    }
  }

  const numericTokens = normalizedTokens
    .map((token) => ({ token, numeric: cleanNumber(token), isPercent: /%$/.test(token) }))
    .filter(({ numeric, isPercent }) => numeric.length > 0 || isPercent);

  if (!row.totalAmount && numericTokens.length > 0) {
    row.totalAmount = parseNum(numericTokens[numericTokens.length - 1].token);
  }

  if (!row.unitPrice && numericTokens.length > 1) {
    const candidate = numericTokens[numericTokens.length - 2];
    if (!candidate.isPercent) {
      row.unitPrice = parseNum(candidate.token);
    }
  }

  if (!row.quantity && numericTokens.length > 2) {
    row.quantity = Math.round(parseNum(numericTokens[0].token));
  }

  if (!row.quantity && row.totalAmount && row.unitPrice) {
    row.quantity = Math.round(row.totalAmount / row.unitPrice);
  }

  if (!row.unitPrice && row.quantity && row.totalAmount) {
    row.unitPrice = row.totalAmount / row.quantity;
  }

  if (!row.name) {
    const firstTextIndex = normalizedTokens.findIndex((token) => !/[₹\d%]/.test(token));
    if (firstTextIndex >= 0) {
      row.name = normalizedTokens.slice(0, firstTextIndex + 1).join(" ").trim();
    }
  }

  for (const token of normalizedTokens) {
    const hsnMatch = token.match(/hsn[:\s]*(\w+)/i);
    if (hsnMatch) {
      row.hsnCode = hsnMatch[1];
      break;
    }
  }

  if (!row.name) {
    row.name = normalizedTokens.filter((token) => !/[₹\d%]/.test(token)).join(" ").trim();
  }

  if (!row.name) {
    row.name = "Item";
  }

  return row;
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

async function parseWithAI(text: string): Promise<ExtractedInvoice | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `Convert this invoice text into structured JSON with product_name, quantity, price, total, supplier, date. Extract a list of items. Respond ONLY with valid JSON.
Format:
{
  "supplierName": "...",
  "invoiceDate": "...",
  "items": [
    {
      "name": "...",
      "quantity": 0,
      "unitPrice": 0,
      "totalAmount": 0
    }
  ],
  "grandTotal": 0
}

Invoice Text:
${text}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      console.error("OpenAI API error", await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsedJson = JSON.parse(content);
    
    // Map the returned JSON to our ExtractedInvoice structure
    const items: ExtractedItem[] = (parsedJson.items || []).map((item: any) => ({
      name: String(item.name || item.product_name || "Unknown Item").trim(),
      hsnCode: "",
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice || item.price) || 0,
      gstPercent: 0,
      taxAmount: 0,
      totalAmount: Number(item.totalAmount || item.total) || 0
    }));

    if (items.length === 0) return null;

    return {
      invoiceNumber: "",
      invoiceDate: String(parsedJson.invoiceDate || parsedJson.date || "").trim(),
      supplierName: String(parsedJson.supplierName || parsedJson.supplier || "").trim(),
      customerName: "",
      items,
      grandTotal: Number(parsedJson.grandTotal || parsedJson.total) || 0,
      rawText: text,
      parseWarnings: ["Successfully parsed using AI fallback."]
    };
  } catch (error) {
    console.error("AI Parsing Error:", error);
    return null;
  }
}
