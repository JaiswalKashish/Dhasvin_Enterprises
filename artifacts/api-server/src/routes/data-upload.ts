import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { parsePdfData } from "../utils/data-parser.js";
import {
  db,
  productsTable,
  categoriesTable,
  suppliersTable,
  purchasesTable,
  salesTable,
} from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

type UploadSection = "sales" | "purchases" | "products" | "supplier_details";

const COLUMN_MAPPINGS = {
  product: ["product", "item", "description", "goods", "name", "prod_name"],
  quantity: ["qty", "quantity", "units", "pcs", "nos", "amount", "units_sold"],
  price: ["price", "rate", "amount", "value", "cost", "unit_price", "mrp"],
  gst: ["gst", "tax", "gst_percent", "tax_percent", "tax_amount"],
  hsn: ["hsn", "hsn_code", "hsn_number"],
  supplierName: ["supplier", "supplier_name", "vendor", "vendor_name", "seller"],
  email: ["email", "email_address", "contact_email"],
  phone: ["phone", "mobile", "contact", "phone_number"],
  address: ["address", "billing_address", "shipping_address", "supplier_address"],
  category: ["category", "category_name", "cat", "subcategory", "product_category"],
};

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

function isEmptyRow(row: any) {
  return Object.values(row).every((value) => {
    if (value === null || value === undefined) return true;
    const text = String(value).trim();
    return text.length === 0;
  });
}

function getValue(row: any, mappings: string[]) {
  for (const mapping of mappings) {
    const normalizedMapping = normalizeKey(mapping);
    for (const key of Object.keys(row)) {
      if (normalizeKey(key) === normalizedMapping) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value).trim().length > 0) {
          return value;
        }
      }
    }
  }
  return "";
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

function getString(row: any, mappings: string[]) {
  return String(getValue(row, mappings) ?? "").trim();
}

function parseUploadRow(section: UploadSection, row: any) {
  const supplierName = getString(row, COLUMN_MAPPINGS.supplierName);
  const email = getString(row, COLUMN_MAPPINGS.email);
  const phone = getString(row, COLUMN_MAPPINGS.phone);
  const address = getString(row, COLUMN_MAPPINGS.address);
  const categoryName = getString(row, COLUMN_MAPPINGS.category);
  const product = getString(row, COLUMN_MAPPINGS.product);
  const quantity = Math.round(parseNumber(getValue(row, COLUMN_MAPPINGS.quantity), 0));
  const price = parseNumber(getValue(row, COLUMN_MAPPINGS.price), 0);
  const gst = parseNumber(getValue(row, COLUMN_MAPPINGS.gst), 18);
  const hsn = getString(row, COLUMN_MAPPINGS.hsn);

  const rowErrors: string[] = [];
  if (section === "supplier_details") {
    if (!supplierName) {
      rowErrors.push("Supplier name is required.");
    }
  } else if (section === "products") {
    if (!product) {
      rowErrors.push("Product name is required.");
    }
    if (price <= 0) {
      rowErrors.push("Price must be greater than 0.");
    }
  } else {
    if (!product) {
      rowErrors.push("Product name is required.");
    }
    if (quantity <= 0) {
      rowErrors.push("Quantity must be greater than 0.");
    }
    if (price <= 0) {
      rowErrors.push("Price must be greater than 0.");
    }
  }

  return {
    product,
    quantity,
    price,
    gst,
    hsn,
    supplierName,
    email,
    phone,
    address,
    categoryName,
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

async function upsertProduct(productName: string, price: number, quantity: number | null, categoryId: number | null) {
  const existing = await db.select().from(productsTable).where(ilike(productsTable.name, productName));
  if (existing[0]) {
    await db.update(productsTable).set({
      quantity: quantity === null ? existing[0].quantity : Math.max(0, existing[0].quantity + quantity),
      price: price.toString(),
      categoryId: categoryId ?? existing[0].categoryId,
      updatedAt: new Date(),
    }).where(eq(productsTable.id, existing[0].id));
    return existing[0].id;
  }

  const [newProduct] = await db.insert(productsTable).values({
    name: productName,
    price: price.toString(),
    quantity: quantity ?? 0,
    categoryId,
    minQuantity: 5,
  }).returning();

  return newProduct.id;
}

function toSection(value: unknown): UploadSection {
  const section = String(value || "").toLowerCase().trim();
  if (section === "sales" || section === "purchases" || section === "products" || section === "supplier_details") {
    return section;
  }
  return "purchases";
}

router.post("/upload-pdf", requireRole("admin", "staff"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Bad Request", message: "No file uploaded" });
      return;
    }

    const section = toSection(req.body.section || req.body.type);
    const isPreview = String(req.body.preview || "false").toLowerCase() === "true";

    if (section === "supplier_details") {
      res.status(400).json({
        success: false,
        errors: ["Supplier details upload is only supported for Excel or CSV at this time."],
        message: "PDF supplier details import is not supported.",
      });
      return;
    }

    let parsedRows: Array<ReturnType<typeof parseUploadRow>> = [];
    try {
      const items = await parsePdfData(req.file.buffer);
      parsedRows = items.map((item) => parseUploadRow(section, {
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        gst: item.gst,
        hsn: item.hsn,
      }));
    } catch (pdfError) {
      req.log.error({ pdfError }, "PDF parsing error");
      res.status(400).json({
        success: false,
        errors: ["PDF parsing failed: " + (pdfError instanceof Error ? pdfError.message : String(pdfError))],
        message: "Failed to parse PDF file",
      });
      return;
    }

    if (parsedRows.length === 0) {
      res.status(400).json({
        success: false,
        errors: ["No valid product data found"],
        message: "No data found",
      });
      return;
    }

    if (isPreview) {
      res.json({
        success: true,
        preview: true,
        totalRows: parsedRows.length,
        rows: parsedRows.slice(0, 100),
        message: `Preview parsed ${parsedRows.length} rows`,
      });
      return;
    }

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const rowData of parsedRows) {
      if (rowData.rowErrors.length > 0) {
        errors.push(...rowData.rowErrors.map((msg) => `${rowData.product || "Unknown"}: ${msg}`));
        failed++;
        continue;
      }

      try {
        const categoryId = null;
        const productId = await upsertProduct(rowData.product, rowData.price, section === "purchases" ? rowData.quantity : 0, categoryId);

        if (section === "sales") {
          const product = await db.select().from(productsTable).where(eq(productsTable.id, productId));
          if (product[0] && product[0].quantity < rowData.quantity) {
            errors.push(`Cannot sell ${rowData.quantity} units of "${rowData.product}". Available stock is ${product[0].quantity}.`);
            failed++;
            continue;
          }
          await db.update(productsTable).set({
            quantity: Math.max(0, (product[0]?.quantity ?? 0) - rowData.quantity),
            updatedAt: new Date(),
          }).where(eq(productsTable.id, productId));
          await db.insert(salesTable).values({
            productId,
            quantity: rowData.quantity,
            unitPrice: rowData.price.toString(),
            totalAmount: (rowData.price * rowData.quantity).toFixed(2),
            gst: rowData.gst.toString(),
            notes: "Uploaded via PDF",
          });
        } else {
          await db.update(productsTable).set({
            quantity: Math.max(0, (await db.select().from(productsTable).where(eq(productsTable.id, productId)))[0].quantity + rowData.quantity),
            updatedAt: new Date(),
          }).where(eq(productsTable.id, productId));
          await db.insert(purchasesTable).values({
            productId,
            quantity: rowData.quantity,
            unitPrice: rowData.price.toString(),
            totalAmount: (rowData.price * rowData.quantity).toFixed(2),
            notes: "Uploaded via PDF",
          });
        }

        processed++;
      } catch (err) {
        errors.push(`Error processing ${rowData.product || "Unknown"}: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    }

    res.json({
      success: true,
      processed,
      failed,
      errors,
      message: `Processed ${processed} rows${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  } catch (err) {
    req.log.error({ err }, "PDF upload error");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to process PDF file" });
  }
});

router.post("/upload-excel", requireRole("admin", "staff"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Bad Request", message: "No file uploaded" });
      return;
    }

    const section = toSection(req.body.section || req.body.type);
    const isPreview = String(req.body.preview || "false").toLowerCase() === "true";

    let rows: any[] = [];
    try {
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    } catch (excelError) {
      res.status(400).json({
        success: false,
        errors: ["Excel parsing failed: " + (excelError instanceof Error ? excelError.message : String(excelError))],
        message: "Failed to parse Excel file",
      });
      return;
    }

    rows = rows.map((row) => {
      const normalized: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        const normalizedKey = normalizeKey(key);
        const value = row[key];
        normalized[normalizedKey] =
          value === null || value === undefined ? null : typeof value === "string" ? value.trim() : value;
      }
      return normalized;
    }).filter((row) => !isEmptyRow(row));

    if (rows.length === 0) {
      res.status(400).json({
        success: false,
        errors: ["Empty file: no readable rows found"],
        message: "No data found",
      });
      return;
    }

    const parsedRows = rows.map((row) => parseUploadRow(section, row));

    if (isPreview) {
      res.json({
        success: true,
        preview: true,
        totalRows: parsedRows.length,
        rows: parsedRows.slice(0, 100),
        message: `Preview parsed ${parsedRows.length} rows`,
      });
      return;
    }

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const rowData of parsedRows) {
      if (rowData.rowErrors.length > 0) {
        errors.push(...rowData.rowErrors.map((msg) => {
          return section === "supplier_details"
            ? `${rowData.supplierName || "Unknown supplier"}: ${msg}`
            : `${rowData.product || "Unknown product"}: ${msg}`;
        }));
        failed++;
        continue;
      }

      try {
        if (section === "supplier_details") {
          const supplierId = await findOrCreateSupplier(rowData.supplierName || "");
          if (supplierId) {
            await db.update(suppliersTable).set({
              gst: rowData.gst ? rowData.gst.toString() : undefined,
              email: rowData.email || undefined,
              phone: rowData.phone || undefined,
              address: rowData.address || undefined,
              updatedAt: new Date(),
            }).where(eq(suppliersTable.id, supplierId));
          }
          processed++;
          continue;
        }

        if (section === "products") {
          const categoryId = await findOrCreateCategory(rowData.categoryName || undefined);
          await upsertProduct(rowData.product, rowData.price, rowData.quantity || 0, categoryId);
          processed++;
          continue;
        }

        const productId = await upsertProduct(rowData.product, rowData.price, section === "purchases" ? rowData.quantity : 0, null);

        if (section === "sales") {
          const product = await db.select().from(productsTable).where(eq(productsTable.id, productId));
          if (product[0] && product[0].quantity < rowData.quantity) {
            errors.push(`Cannot sell ${rowData.quantity} units of "${rowData.product}". Available stock is ${product[0].quantity}.`);
            failed++;
            continue;
          }
          await db.update(productsTable).set({
            quantity: Math.max(0, (product[0]?.quantity ?? 0) - rowData.quantity),
            updatedAt: new Date(),
          }).where(eq(productsTable.id, productId));
          await db.insert(salesTable).values({
            productId,
            quantity: rowData.quantity,
            unitPrice: rowData.price.toString(),
            totalAmount: (rowData.price * rowData.quantity).toFixed(2),
            gst: rowData.gst.toString(),
            notes: "Uploaded via Excel",
          });
          processed++;
          continue;
        }

        await db.update(productsTable).set({
          quantity: Math.max(0, (await db.select().from(productsTable).where(eq(productsTable.id, productId)))[0].quantity + rowData.quantity),
          updatedAt: new Date(),
        }).where(eq(productsTable.id, productId));
        await db.insert(purchasesTable).values({
          productId,
          quantity: rowData.quantity,
          unitPrice: rowData.price.toString(),
          totalAmount: (rowData.price * rowData.quantity).toFixed(2),
          notes: "Uploaded via Excel",
        });
        processed++;
      } catch (err) {
        errors.push(`Error processing ${section === "supplier_details" ? rowData.supplierName || "Unknown" : rowData.product || "Unknown"}: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    }

    res.json({
      success: true,
      processed,
      failed,
      errors,
      message: `Processed ${processed} rows${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  } catch (err) {
    req.log.error({ err }, "Excel upload error");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to process Excel file" });
  }
});

export default router;