import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { parsePdfInvoice } from "../utils/pdf-parser.js";
import {
  db,
  productsTable,
  categoriesTable,
  suppliersTable,
  purchasesTable,
  salesTable,
  companySettingsTable,
} from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const REQUIRED_FIELDS_BY_SECTION: Record<string, Array<"productName" | "quantity" | "price" | "supplierName">> = {
  purchases: ["productName", "quantity", "price"],
  sales: ["productName", "quantity", "price"],
  products: ["productName", "price"],
  supplier_details: ["supplierName"],
};
const DHASVIN_COMPANY = {
  name: "DHASVIN ENTERPRISES",
};

router.use(authenticate);

function normalizeKey(key: string) {
  return String(key ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[-\/]+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeRow(row: any) {
  const normalized: Record<string, any> = {};

  for (const key of Object.keys(row)) {
    const normalizedKey = normalizeKey(key);
    const value = row[key];
    normalized[normalizedKey] =
      value === null || value === undefined ? null : typeof value === "string" ? value.trim() : value;
  }

  return normalized;
}

function isEmptyRow(row: any) {
  return Object.values(row).every((value) => {
    if (value === null || value === undefined) return true;
    const text = String(value).trim();
    return text.length === 0;
  });
}

function getValue(row: any, keys: string[]) {
  for (const key of keys) {
    const normalizedKey = normalizeKey(key);
    const value = row[normalizedKey];
    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      return value;
    }
  }
  return "";
}

function getBestHeaderValue(row: any, patterns: string[]) {
  const rowKeys = Object.keys(row);

  for (const pattern of patterns) {
    const normalizedPattern = normalizeKey(pattern);
    for (const key of rowKeys) {
      if (key.includes(normalizedPattern)) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value).trim().length > 0) {
          return value;
        }
      }
    }
  }

  return "";
}

function getString(row: any, keys: string[], fallbackPatterns: string[] = []) {
  let value = getValue(row, keys);
  if (!value && fallbackPatterns.length > 0) {
    value = getBestHeaderValue(row, fallbackPatterns);
  }
  return String(value ?? "").trim();
}

function parseNumber(value: any, fallback = 0) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return fallback;
  }

  const cleaned = String(value)
    .trim()
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/[^0-9.\-]/g, "");

  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSection(value: unknown) {
  const section = String(value || "").toLowerCase().trim();
  if (["purchases", "sales", "supplier_details", "products"].includes(section)) {
    return section;
  }
  return "";
}

function detectSectionFromData(section: string, rows: any[], filename: string) {
  if (section) return section;

  if (/(purchase|vendor|supplier|stock[_ -]?in)/i.test(filename)) return "purchases";
  if (/(sale|invoice|retail|bill|stock[_ -]?out)/i.test(filename)) return "sales";
  if (/(supplier)/i.test(filename)) return "supplier_details";
  if (/(product|catalog|inventory)/i.test(filename)) return "products";

  const sample = rows.slice(0, 15);
  let saleScore = 0;
  let purchaseScore = 0;
  let supplierScore = 0;
  for (const row of sample) {
    const rowText = Object.values(row).map((v) => String(v ?? "")).join(" ").toLowerCase();
    if (/(customer|sold|sale|retail|invoice to|bill to)/i.test(rowText)) saleScore++;
    if (/(purchase|vendor|supplier|bought|stock in)/i.test(rowText)) purchaseScore++;
    if (/(gstin|address|phone|email)/i.test(rowText) && /(supplier|vendor)/i.test(rowText)) supplierScore++;
  }

  if (supplierScore >= 2) return "supplier_details";
  if (purchaseScore > saleScore) return "purchases";
  if (saleScore > purchaseScore) return "sales";
  return "purchases";
}

function validateRequiredColumns(parsedRows: ReturnType<typeof parseUploadRow>[], section: string) {
  const required = REQUIRED_FIELDS_BY_SECTION[section] || [];
  const missing = new Set<string>();
  for (const field of required) {
    const hasAny = parsedRows.some((row) => {
      const value = row[field];
      if (typeof value === "number") return Number.isFinite(value) && value > 0;
      return String(value ?? "").trim().length > 0;
    });
    if (!hasAny) missing.add(field);
  }
  return missing;
}

function createRowFingerprint(row: ReturnType<typeof parseUploadRow>, section: string) {
  return [
    section,
    row.productName.toLowerCase(),
    row.quantity,
    row.price.toFixed(2),
    row.supplierName.toLowerCase(),
    row.customerName.toLowerCase(),
  ].join("|");
}

function parseUploadRow(row: any, rowNum: number, section: string) {
  const productName = getString(
    row,
    [
      "product_name",
      "product",
      "item",
      "description",
      "item_description",
      "product_title",
      "item_name",
      "product_details",
      "product_description",
      "prod_name",
    ],
    ["product", "item", "description"]
  );
  const supplierName = getString(
    row,
    ["supplier", "supplier_name", "vendor", "vendor_name", "seller"],
    ["supplier", "vendor", "seller"]
  );
  const categoryName = getString(
    row,
    ["category", "category_name", "cat", "subcategory", "product_category"],
    ["category", "cat", "subcategory"]
  );
  const price = parseNumber(
    getValue(row, ["price", "rate", "amount", "unit_price", "mrp", "unit_price_incl_tax"]) ||
      getBestHeaderValue(row, ["price", "rate", "amount", "unit_price", "mrp"]),
    0
  );
  const quantity = Math.round(
    parseNumber(
      getValue(row, ["quantity", "qty", "units", "no_of_units", "pcs", "nos"]) ||
        getBestHeaderValue(row, ["quantity", "qty", "units", "no_of_units", "pcs", "nos"]),
      0
    )
  );
  const hsnCode = getString(row, ["hsn_code", "hsn", "hsn_code"]);
  let gstVal = parseNumber(
    getValue(row, ["gst", "gst_percent", "gst%", "gst_amount", "tax", "tax_percent"]) ||
      getBestHeaderValue(row, ["gst", "gst_percent", "gst_amount", "tax", "tax_percent"]),
    18
  );
  if (gstVal > 100) gstVal = 18;
  const discount = parseNumber(
    getValue(row, ["discount", "discount_amount", "disc", "discount_percent"]) ||
      getBestHeaderValue(row, ["discount", "discount_amount", "disc", "discount_percent"]),
    0
  );
  const customerName = getString(row, ["customer_name", "customer", "bill_to", "ship_to"]);
  const notes = getString(row, ["notes", "remarks", "description"]);

  const rowErrors: string[] = [];
  if (section === "supplier_details") {
    if (!supplierName) {
      rowErrors.push(`Row ${rowNum}: Supplier name is required for supplier details import.`);
    }
  } else {
    if (!productName) {
      rowErrors.push(`Row ${rowNum}: Product Name is required.`);
    }
    if (isNaN(price) || price <= 0) {
      rowErrors.push(`Row ${rowNum}: Invalid price for "${productName || "Unknown Product"}".`);
    }
    if (section !== "products" && quantity <= 0) {
      rowErrors.push(`Row ${rowNum}: Invalid quantity for "${productName || "Unknown Product"}".`);
    }
  }

  return {
    rowNum,
    productName,
    supplierName,
    categoryName,
    price,
    quantity,
    hsnCode,
    gstVal,
    discount,
    customerName,
    notes,
    rowErrors,
    raw: row,
  };
}

async function findOrCreateCategory(name?: string) {
  if (!name) return null;
  const cats = await db.select().from(categoriesTable).where(ilike(categoriesTable.name, name));
  if (cats[0]) return cats[0].id;
  const [newCat] = await db.insert(categoriesTable).values({ name }).returning();
  return newCat.id;
}

async function findOrCreateSupplier(name?: string) {
  if (!name) return null;
  const sups = await db.select().from(suppliersTable).where(ilike(suppliersTable.name, name));
  if (sups[0]) return sups[0].id;
  const [newSup] = await db.insert(suppliersTable).values({ name }).returning();
  return newSup.id;
}

async function upsertProduct(productName: string, price: number, quantity: number | null, categoryId: number | null, supplierId: number | null, hsnCode: string, gstVal: number) {
  const existing = await db.select().from(productsTable).where(ilike(productsTable.name, productName));
  if (existing[0]) {
    const newQuantity = quantity === null ? existing[0].quantity : Math.max(0, existing[0].quantity + quantity);
    await db.update(productsTable).set({
      quantity: newQuantity,
      price: price.toString(),
      categoryId: categoryId ?? existing[0].categoryId,
      supplierId: supplierId ?? existing[0].supplierId,
      hsnCode: hsnCode || existing[0].hsnCode,
      gst: gstVal.toString(),
      updatedAt: new Date(),
    }).where(eq(productsTable.id, existing[0].id));
    return existing[0].id;
  }

  const [newProduct] = await db.insert(productsTable).values({
    name: productName,
    price: price.toString(),
    quantity: quantity ?? 0,
    categoryId,
    supplierId,
    hsnCode: hsnCode || null,
    gst: gstVal.toString(),
    minQuantity: 5,
  }).returning();

  return newProduct.id;
}

async function getCompanyContextWarnings(rawText?: string) {
  const warnings: string[] = [];
  const settings = await db.select().from(companySettingsTable).limit(1);
  const company = settings[0];
  const expectedName = (company?.name || DHASVIN_COMPANY.name).trim();

  if (!company) {
    warnings.push("Company profile not configured; using default DHASVIN ENTERPRISES context.");
  }

  if (!rawText) return warnings;
  const text = rawText.toLowerCase();
  if (expectedName && !text.includes(expectedName.toLowerCase())) {
    warnings.push(`Document text does not clearly contain company name "${expectedName}". Please verify bill ownership.`);
  }
  if (company?.gstin && !text.includes(company.gstin.toLowerCase())) {
    warnings.push(`Document text does not clearly contain configured GSTIN (${company.gstin}).`);
  }

  return warnings;
}

router.post("/upload", requireRole("admin", "staff"), upload.single("file"), async (req, res) => {
  try {
    // Log incoming request
    req.log.info({
      hasFile: !!req.file,
      fileSize: req.file?.size,
      originalName: req.file?.originalname,
      mimeType: req.file?.mimetype,
      section: req.body.section,
      isPreview: req.body.preview,
    }, "Upload request received");

    if (!req.file) {
      res.status(400).json({ error: "Bad Request", message: "No file uploaded" });
      return;
    }

    let section = toSection(req.body.section || req.body.type);
    const filename = String(req.file.originalname || "").toLowerCase();
    const mimetype = String(req.file.mimetype || "").toLowerCase();
    const buffer = req.file.buffer;
    
    req.log.info({ filename, mimetype, bufferSize: buffer.length }, "Processing file");
    
    // Enhanced file type detection - check extension first, then mimetype
    const hasPdfExtension = filename.endsWith(".pdf");
    const isPdfMimetype = mimetype === "application/pdf";
    const hasExcelExtension = filename.endsWith(".xlsx") || filename.endsWith(".xls") || filename.endsWith(".csv");
    const isExcelMimetype =
      mimetype.includes("sheet") ||
      mimetype.includes("excel") ||
      mimetype.includes("csv") ||
      mimetype.includes("spreadsheet") ||
      mimetype === "text/plain";

    const isPdf = hasPdfExtension || isPdfMimetype;
    const isExcel = hasExcelExtension || isExcelMimetype;

    req.log.info({ hasPdfExtension, isPdfMimetype, hasExcelExtension, isExcelMimetype, isPdf, isExcel }, "File type detection");

    if (!isPdf && !isExcel) {
      res.status(400).json({
        error: "Bad Request",
        message: "Unsupported format. Please upload .xlsx, .xls, .csv, or .pdf files only.",
      });
      return;
    }

    let rows: any[] = [];
    const warnings: string[] = [];
    let pdfRawText = "";
    let detectedFormat = "Unknown";

    // Try primary format based on extension/mimetype
    const tryPdfFirst = hasPdfExtension || (isPdfMimetype && !hasExcelExtension && !isExcelMimetype);

    if (tryPdfFirst) {
      // Try PDF parsing first
      try {
        req.log.info({}, "Attempting PDF parsing");
        const parsed = await parsePdfInvoice(buffer);
        warnings.push(...parsed.parseWarnings);
        pdfRawText = parsed.rawText;
        rows = parsed.items.map((item) => ({
          ["Product Name"]: item.name,
          ["Price"]: item.unitPrice,
          ["Quantity"]: item.quantity,
          ["HSN Code"]: item.hsnCode,
          ["GST (%)"]: item.gstPercent,
          ["Supplier"]: parsed.supplierName || req.body.supplierName || undefined,
        }));
        detectedFormat = "PDF";
        req.log.info({ itemsCount: rows.length }, "PDF parsed successfully");
      } catch (pdfError) {
        req.log.error({ pdfError }, "PDF parsing error");
        const errorMsg = pdfError instanceof Error ? pdfError.message : String(pdfError);
        warnings.push(`PDF extraction warning: ${errorMsg}`);
        
        // Fallback: Try to parse as Excel in case PDF parsing fails completely
        try {
          req.log.info({}, "Attempting Excel fallback");
          const workbook = XLSX.read(buffer, { type: "buffer" });
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error("Spreadsheet has no sheets");
          }
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(sheet, { defval: null }) as any[];
          detectedFormat = "Excel/CSV (fallback from failed PDF)";
          warnings.push("PDF parsing failed, parsed as spreadsheet instead.");
          req.log.info({ rowsCount: rows.length }, "Excel fallback successful");
        } catch (excelFallbackError) {
          req.log.error({ excelFallbackError }, "PDF and Excel fallback error");
          res.status(400).json({
            success: false,
            processed: 0,
            failed: 0,
            errors: [
              `Unable to parse file: ${errorMsg}. Ensure file is a valid PDF with readable text or a spreadsheet (.xlsx, .xls, .csv).`,
            ],
            warnings,
            message: "Failed to parse file - unsupported format or corrupted file",
          });
          return;
        }
      }
    } else {
      // Try Excel parsing for non-PDF files
      try {
        req.log.info({}, "Attempting Excel parsing");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("Spreadsheet has no sheets");
        }
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: null }) as any[];
        detectedFormat = "Excel/CSV";
        req.log.info({ rowsCount: rows.length }, "Excel parsed successfully");
      } catch (excelError) {
        req.log.error({ excelError }, "Excel parsing error");
        const errorMsg = excelError instanceof Error ? excelError.message : String(excelError);
        
        // Fallback: Try PDF parsing if Excel fails
        try {
          req.log.info({}, "Attempting PDF fallback");
          const parsed = await parsePdfInvoice(buffer);
          warnings.push(...parsed.parseWarnings);
          pdfRawText = parsed.rawText;
          rows = parsed.items.map((item) => ({
            ["Product Name"]: item.name,
            ["Price"]: item.unitPrice,
            ["Quantity"]: item.quantity,
            ["HSN Code"]: item.hsnCode,
            ["GST (%)"]: item.gstPercent,
            ["Supplier"]: parsed.supplierName || req.body.supplierName || undefined,
          }));
          detectedFormat = "PDF (fallback from failed Excel)";
          warnings.push("Spreadsheet parsing failed, parsed as PDF instead.");
          req.log.info({ itemsCount: rows.length }, "PDF fallback successful");
        } catch (pdfFallbackError) {
          req.log.error({ pdfFallbackError }, "Excel and PDF fallback error");
          res.status(400).json({
            success: false,
            processed: 0,
            failed: 0,
            errors: [
              `Unable to parse spreadsheet: ${errorMsg}. Ensure file is a valid .xlsx, .xls, or .csv file.`,
            ],
            warnings,
            message: "Failed to parse file - unsupported format or corrupted file",
          });
          return;
        }
      }
    }

    const isPreview = String(req.body.preview || "false").toLowerCase() === "true";
    rows = rows.map(normalizeRow).filter((row) => !isEmptyRow(row));
    section = detectSectionFromData(section, rows, filename);

    if (isPdf) {
      warnings.push(...(await getCompanyContextWarnings(pdfRawText)));
    }

    if (rows.length === 0) {
      res.status(400).json({
        success: false,
        processed: 0,
        failed: 0,
        errors: ["Empty file: no readable rows found."],
        warnings,
        message: "No data found",
      });
      return;
    }

    const parsedRows = rows.map((row, index) => parseUploadRow(row, index + 2, section));
    const missingColumns = validateRequiredColumns(parsedRows, section);
    
    // For preview, show warnings but don't fail
    if (isPreview) {
      const previewErrors = parsedRows.flatMap((row) => row.rowErrors);
      const missingColumnWarnings = [...missingColumns].map((m) => {
        const labelMap: Record<string, string> = {
          productName: "Product column not found",
          quantity: "Quantity column not found",
          price: "Price/Amount column not found",
          supplierName: "Supplier column not found",
        };
        return labelMap[m] || `${m} column not found`;
      });
      
      res.json({
        success: true,
        preview: true,
        detectedType: section,
        detectedFormat: detectedFormat,
        totalRows: parsedRows.length,
        rows: parsedRows,
        errors: previewErrors,
        warnings: [...warnings, ...missingColumnWarnings],
        message: `Preview parsed ${parsedRows.length} rows from ${detectedFormat}${previewErrors.length ? `, ${previewErrors.length} issues found` : ""}`,
      });
      return;
    }

    // For final import, check required columns
    if (missingColumns.size > 0) {
      const labelMap: Record<string, string> = {
        productName: "Product column not found",
        quantity: "Quantity column not found",
        price: "Price/Amount column not found",
        supplierName: "Supplier column not found",
      };
      const missingErrors = [...missingColumns].map((m) => labelMap[m] || `${m} column not found`);
      res.status(400).json({
        success: false,
        processed: 0,
        failed: parsedRows.length,
        warnings,
        errors: missingErrors,
        message: "Required columns are missing",
      });
      return;
    }

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];
    const seenFingerprints = new Set<string>();

    for (let i = 0; i < parsedRows.length; i++) {
      const rowData = parsedRows[i];
      const rowNum = rowData.rowNum;
      
      // Check if row has validation errors from parsing
      if (rowData.rowErrors && rowData.rowErrors.length > 0) {
        errors.push(...rowData.rowErrors);
        failed++;
        continue;
      }

      const {
        productName,
        supplierName,
        categoryName,
        price,
        quantity,
        hsnCode,
        gstVal,
        discount,
        customerName,
        notes,
      } = rowData;
      const rowFingerprint = createRowFingerprint(rowData, section);
      if (seenFingerprints.has(rowFingerprint)) {
        warnings.push(`Row ${rowNum}: Duplicate row skipped within this upload.`);
        continue;
      }
      seenFingerprints.add(rowFingerprint);

      if (section === "supplier_details") {
        if (!supplierName) {
          errors.push(`Row ${rowNum}: Supplier name is required for supplier details import.`);
          failed++;
          continue;
        }

        const supplierData: any = { name: supplierName };
        const gstin = getString(rowData.raw, ["gstin", "gst", "gst_number", "gst_no"]);
        if (gstin) supplierData.gst = gstin;
        const email = getString(rowData.raw, ["email", "email_address"]);
        if (email) supplierData.email = email;
        const phone = getString(rowData.raw, ["phone", "phone_number", "contact", "mobile"]);
        if (phone) supplierData.phone = phone;
        const address = getString(rowData.raw, ["address", "billing_address", "shipping_address"]);
        if (address) supplierData.address = address;

        const existingSupplier = await db.select().from(suppliersTable).where(ilike(suppliersTable.name, supplierName));
        if (existingSupplier[0]) {
          await db.update(suppliersTable).set(supplierData).where(eq(suppliersTable.id, existingSupplier[0].id));
        } else {
          await db.insert(suppliersTable).values(supplierData);
        }

        processed++;
        continue;
      }

      if (!productName) {
        errors.push(`Row ${rowNum}: Product Name is required.`);
        failed++;
        continue;
      }

      if (isNaN(price) || price <= 0) {
        errors.push(`Row ${rowNum}: Invalid price for "${productName}".`);
        failed++;
        continue;
      }
      if (section !== "products" && (isNaN(quantity) || quantity <= 0)) {
        errors.push(`Row ${rowNum}: Invalid quantity format for "${productName}".`);
        failed++;
        continue;
      }

      const supplierId = await findOrCreateSupplier(supplierName || undefined);
      const categoryId = await findOrCreateCategory(categoryName || undefined);
      let productId = 0;

      if (section === "sales") {
        const existingProducts = await db.select().from(productsTable).where(ilike(productsTable.name, productName));
        if (!existingProducts[0]) {
          errors.push(`Row ${rowNum}: Product "${productName}" not found in inventory for sales import.`);
          failed++;
          continue;
        }
        productId = existingProducts[0].id;
      } else {
        productId = await upsertProduct(productName, price, quantity, categoryId, supplierId, hsnCode, gstVal);
      }

      if (section === "products") {
        processed++;
        continue;
      }

      if (section === "purchases") {
        await db.insert(purchasesTable).values({
          productId,
          supplierId,
          quantity,
          unitPrice: price.toString(),
          totalAmount: (price * quantity).toFixed(2),
          notes: "Imported via Purchase Upload",
        });
      }

      if (section === "sales") {
        const product = await db.select().from(productsTable).where(eq(productsTable.id, productId));
        if (product[0]) {
          if (product[0].quantity < quantity) {
            errors.push(
              `Row ${rowNum}: Cannot sell ${quantity} units of "${productName}". Available stock is ${product[0].quantity}.`
            );
            failed++;
            continue;
          }
          await db
            .update(productsTable)
            .set({ quantity: Math.max(0, product[0].quantity - quantity), updatedAt: new Date() })
            .where(eq(productsTable.id, productId));
        }

        await db.insert(salesTable).values({
          productId,
          quantity,
          unitPrice: price.toString(),
          totalAmount: (price * quantity).toFixed(2),
          discount: discount.toString(),
          gst: gstVal.toString(),
          customerName: customerName || null,
          notes: notes || "Imported via Sales Upload",
        });
      }

      processed++;
    }

    res.json({
      success: true,
      processed,
      failed,
      warnings,
      errors,
      message: `Processed ${processed} rows${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  } catch (err) {
    req.log.error({ err }, "Upload invoice error");
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: `Failed to process file: ${errorMsg}. It might be corrupted, in an unsupported format, or too large.`,
      errors: [errorMsg]
    });
  }
});

router.post("/import-json", requireRole("admin", "staff"), async (req, res) => {
  try {
    const { section, rows } = req.body;
    if (!section || !Array.isArray(rows)) {
      res.status(400).json({ error: "Bad Request", message: "Missing section or rows array" });
      return;
    }

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const seenFingerprints = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i];
      const rowNum = rowData.rowNum || i + 1;
      
      const productName = String(rowData.productName || "").trim();
      const supplierName = String(rowData.supplierName || "").trim();
      const categoryName = String(rowData.categoryName || "").trim();
      const price = parseNumber(rowData.price, 0);
      const quantity = Math.round(parseNumber(rowData.quantity, 0));
      const hsnCode = String(rowData.hsnCode || "").trim();
      const gstVal = parseNumber(rowData.gstVal, 18);
      const discount = parseNumber(rowData.discount, 0);
      const customerName = String(rowData.customerName || "").trim();
      const notes = String(rowData.notes || "").trim();

      const normalizedRow = {
        rowNum, productName, supplierName, categoryName, price, quantity, hsnCode, gstVal, discount, customerName, notes, raw: rowData.raw || {}
      };

      const rowFingerprint = createRowFingerprint(normalizedRow as any, section);
      if (seenFingerprints.has(rowFingerprint)) {
        warnings.push(`Row ${rowNum}: Duplicate row skipped within this import.`);
        continue;
      }
      seenFingerprints.add(rowFingerprint);

      if (section === "supplier_details") {
        if (!supplierName) {
          errors.push(`Row ${rowNum}: Supplier name is required for supplier details import.`);
          failed++;
          continue;
        }

        const supplierData: any = { name: supplierName };
        const gstin = getString(rowData.raw, ["gstin", "gst", "gst_number", "gst_no"]);
        if (gstin) supplierData.gst = gstin;
        const email = getString(rowData.raw, ["email", "email_address"]);
        if (email) supplierData.email = email;
        const phone = getString(rowData.raw, ["phone", "phone_number", "contact", "mobile"]);
        if (phone) supplierData.phone = phone;
        const address = getString(rowData.raw, ["address", "billing_address", "shipping_address"]);
        if (address) supplierData.address = address;

        const existingSupplier = await db.select().from(suppliersTable).where(ilike(suppliersTable.name, supplierName));
        if (existingSupplier[0]) {
          await db.update(suppliersTable).set(supplierData).where(eq(suppliersTable.id, existingSupplier[0].id));
        } else {
          await db.insert(suppliersTable).values(supplierData);
        }

        processed++;
        continue;
      }

      if (!productName) {
        errors.push(`Row ${rowNum}: Product Name is required.`);
        failed++;
        continue;
      }

      if (isNaN(price) || price <= 0) {
        errors.push(`Row ${rowNum}: Invalid price for "${productName}".`);
        failed++;
        continue;
      }
      if (section !== "products" && (isNaN(quantity) || quantity <= 0)) {
        errors.push(`Row ${rowNum}: Invalid quantity format for "${productName}".`);
        failed++;
        continue;
      }

      const supplierId = await findOrCreateSupplier(supplierName || undefined);
      const categoryId = await findOrCreateCategory(categoryName || undefined);
      let productId = 0;

      if (section === "sales") {
        const existingProducts = await db.select().from(productsTable).where(ilike(productsTable.name, productName));
        if (!existingProducts[0]) {
          errors.push(`Row ${rowNum}: Product "${productName}" not found in inventory for sales import.`);
          failed++;
          continue;
        }
        productId = existingProducts[0].id;
      } else {
        productId = await upsertProduct(productName, price, quantity, categoryId, supplierId, hsnCode, gstVal);
      }

      if (section === "products") {
        processed++;
        continue;
      }

      if (section === "purchases") {
        await db.insert(purchasesTable).values({
          productId,
          supplierId,
          quantity,
          unitPrice: price.toString(),
          totalAmount: (price * quantity).toFixed(2),
          notes: "Imported via Purchase Upload",
        });
      }

      if (section === "sales") {
        const product = await db.select().from(productsTable).where(eq(productsTable.id, productId));
        if (product[0]) {
          if (product[0].quantity < quantity) {
            errors.push(
              `Row ${rowNum}: Cannot sell ${quantity} units of "${productName}". Available stock is ${product[0].quantity}.`
            );
            failed++;
            continue;
          }
          await db
            .update(productsTable)
            .set({ quantity: Math.max(0, product[0].quantity - quantity), updatedAt: new Date() })
            .where(eq(productsTable.id, productId));
        }

        await db.insert(salesTable).values({
          productId,
          quantity,
          unitPrice: price.toString(),
          totalAmount: (price * quantity).toFixed(2),
          discount: discount.toString(),
          gst: gstVal.toString(),
          customerName: customerName || null,
          notes: notes || "Imported via Sales Upload",
        });
      }

      processed++;
    }

    res.json({
      success: true,
      processed,
      failed,
      warnings,
      errors,
      message: `Processed ${processed} rows${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  } catch (err) {
    req.log.error({ err }, "Import JSON error");
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: `Failed to import data: ${errorMsg}`,
      errors: [errorMsg]
    });
  }
});

export default router;
