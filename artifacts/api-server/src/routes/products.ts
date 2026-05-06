import { Router } from "express";
import multer from "multer";
import XLSX from "xlsx";
import { db } from "@workspace/db";
import {
  productsTable,
  categoriesTable,
  suppliersTable,
} from "@workspace/db/schema";
import { eq, like, and, sql, or, desc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../lib/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function mapProduct(p: any, catMap: Map<number, string>, supMap: Map<number, string>) {
  return {
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    categoryName: p.categoryId ? catMap.get(p.categoryId) || null : null,
    hsnCode: p.hsnCode,
    barcode: p.barcode,
    type: p.type,
    unitPrice: p.unitPrice ? parseFloat(p.unitPrice) : 0,
    priceWithTax: p.priceWithTax ? parseFloat(p.priceWithTax) : 0,
    tax: p.tax ? parseFloat(p.tax) : 0,
    quantity: p.quantity ? parseFloat(p.quantity) : 0,
    units: p.units,
    discount: p.discount ? parseFloat(p.discount) : 0,
    discountAmount: p.discountAmount ? parseFloat(p.discountAmount) : 0,
    purchaseUnitPrice: p.purchaseUnitPrice ? parseFloat(p.purchaseUnitPrice) : 0,
    purchasePriceWithTax: p.purchasePriceWithTax ? parseFloat(p.purchasePriceWithTax) : 0,
    description: p.description,
    showOnline: p.showOnline,
    notForSale: p.notForSale,
    reorderLevel: p.reorderLevel ? parseFloat(p.reorderLevel) : 10,
    supplierId: p.supplierId,
    supplierName: p.supplierId ? supMap.get(p.supplierId) || null : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function getCategoryMap(): Promise<Map<number, string>> {
  const cats = await db.select({ id: categoriesTable.id, name: categoriesTable.name }).from(categoriesTable);
  return new Map(cats.map((c) => [c.id, c.name]));
}

async function getSupplierMap(): Promise<Map<number, string>> {
  const sups = await db.select({ id: suppliersTable.id, name: suppliersTable.name }).from(suppliersTable);
  return new Map(sups.map((s) => [s.id, s.name]));
}

function getCell(row: any, ...keys: string[]): string | null {
  for (const key of keys) {
    if (row[key] != null && row[key] !== "") return String(row[key]);
  }
  return null;
}

function parseRows(buffer: Buffer, mimetype: string): any[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null }) as any[];
}

function extractFromRow(row: any) {
  const name = getCell(row, "Product", "Product Name", "Name", "name", "product", "PRODUCT NAME", "PRODUCT");
  const category = getCell(row, "Category", "category", "Category Name", "CATEGORY", "Cat");
  const supplier = getCell(row, "Supplier", "Supplier Name", "supplier", "Vendor", "SUPPLIER", "Vendor Name");
  const hsnCode = getCell(row, "HSN/SAC Code", "HSN", "SAC Code", "HSN Code", "HSN/SAC");
  const barcode = getCell(row, "Barcode", "barcode", "SKU", "Bar Code");
  const type = getCell(row, "Type", "type", "Product Type") || "Product";
  const unitPrice = parseFloat(getCell(row, "Unit Price", "Price", "unit price", "Selling Price") || "0") || 0;
  const priceWithTax = parseFloat(getCell(row, "Price with Tax", "Price With Tax", "MRP") || "0") || 0;
  const tax = parseFloat(getCell(row, "Tax", "Tax %", "GST", "GST %") || "0") || 0;
  const rawQty = getCell(row, "Qty", "Quantity", "qty", "quantity", "Stock", "QUANTITY", "QTY");
  const quantity = Math.max(0, parseFloat(rawQty || "0") || 0);
  const units = getCell(row, "Units", "Unit", "UOM", "UNITS") || "NOS";
  const discount = parseFloat(getCell(row, "Discount", "Disc", "Discount %") || "0") || 0;
  const discountAmount = parseFloat(getCell(row, "Discount Amount", "Disc Amount") || "0") || 0;
  const purchaseUnitPrice = parseFloat(getCell(row, "Purchase Unit Price", "Purchase Price", "Cost Price", "Buy Price") || "0") || 0;
  const purchasePriceWithTax = parseFloat(getCell(row, "Purchase Price With Tax", "Purchase Price w/Tax") || "0") || 0;
  const description = getCell(row, "Description", "Desc", "description");
  const showOnline = row["Show Online"] != null ? Boolean(row["Show Online"]) : true;
  const notForSale = row["Not For Sale"] != null ? Boolean(row["Not For Sale"]) : false;
  const reorderLevel = parseFloat(getCell(row, "Reorder Level", "Min Stock", "Minimum Stock", "Reorder") || "10") || 10;

  return {
    name, category, supplier, hsnCode, barcode, type,
    unitPrice, priceWithTax, tax, quantity, units,
    discount, discountAmount, purchaseUnitPrice, purchasePriceWithTax,
    description, showOnline, notForSale, reorderLevel,
  };
}

function getStockStatus(quantity: number, reorderLevel: number, notForSale: boolean): string {
  if (notForSale) return "not_for_sale";
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= reorderLevel) return "low_stock";
  return "in_stock";
}

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { search, category, status, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          like(productsTable.name, `%${search}%`),
          like(productsTable.hsnCode, `%${search}%`),
          like(productsTable.barcode, `%${search}%`)
        )
      );
    }

    if (category) {
      const catId = parseInt(category);
      if (!isNaN(catId)) {
        conditions.push(eq(productsTable.categoryId, catId));
      }
    }

    if (status === "low_stock") {
      conditions.push(sql`${productsTable.quantity} > 0 AND ${productsTable.quantity} <= ${productsTable.reorderLevel}`);
    } else if (status === "out_of_stock") {
      conditions.push(sql`${productsTable.quantity} <= 0`);
    } else if (status === "in_stock") {
      conditions.push(sql`${productsTable.quantity} > ${productsTable.reorderLevel}`);
    } else if (status === "not_for_sale") {
      conditions.push(eq(productsTable.notForSale, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [products, countResult] = await Promise.all([
      db.select().from(productsTable).where(whereClause).orderBy(desc(productsTable.updatedAt)).limit(limitNum).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(productsTable).where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const [catMap, supMap] = await Promise.all([getCategoryMap(), getSupplierMap()]);

    res.json({
      products: products.map((p) => mapProduct(p, catMap, supMap)),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    req.log.error({ err }, "Get products error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!product) { res.status(404).json({ error: "Not Found" }); return; }
    const [catMap, supMap] = await Promise.all([getCategoryMap(), getSupplierMap()]);
    res.json(mapProduct(product, catMap, supMap));
  } catch (err) {
    req.log.error({ err }, "Get product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", authenticate, requireRole("admin", "staff"), async (req: AuthRequest, res) => {
  try {
    const data = req.body;
    const [product] = await db.insert(productsTable).values({
      name: data.name,
      categoryId: data.categoryId || null,
      hsnCode: data.hsnCode || null,
      barcode: data.barcode || null,
      type: data.type || "Product",
      unitPrice: (data.unitPrice ?? data.price ?? "0").toString(),
      priceWithTax: data.priceWithTax?.toString() || "0",
      tax: (data.tax ?? data.gst ?? "0").toString(),
      quantity: (data.quantity ?? "0").toString(),
      units: data.units || "NOS",
      discount: data.discount?.toString() || "0",
      discountAmount: data.discountAmount?.toString() || "0",
      purchaseUnitPrice: data.purchaseUnitPrice?.toString() || "0",
      purchasePriceWithTax: data.purchasePriceWithTax?.toString() || "0",
      description: data.description || null,
      showOnline: data.showOnline ?? true,
      notForSale: data.notForSale ?? false,
      reorderLevel: (data.reorderLevel ?? data.minQuantity ?? "10").toString(),
      supplierId: data.supplierId || null,
    }).returning();
    const [catMap, supMap] = await Promise.all([getCategoryMap(), getSupplierMap()]);
    res.status(201).json(mapProduct(product, catMap, supMap));
  } catch (err) {
    req.log.error({ err }, "Create product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", authenticate, requireRole("admin", "staff"), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const [product] = await db.update(productsTable).set({
      name: data.name,
      categoryId: data.categoryId || null,
      hsnCode: data.hsnCode || null,
      barcode: data.barcode || null,
      type: data.type || "Product",
      unitPrice: (data.unitPrice ?? data.price ?? "0").toString(),
      priceWithTax: data.priceWithTax?.toString() || "0",
      tax: (data.tax ?? data.gst ?? "0").toString(),
      quantity: (data.quantity ?? "0").toString(),
      units: data.units || "NOS",
      discount: data.discount?.toString() || "0",
      discountAmount: data.discountAmount?.toString() || "0",
      purchaseUnitPrice: data.purchaseUnitPrice?.toString() || "0",
      purchasePriceWithTax: data.purchasePriceWithTax?.toString() || "0",
      description: data.description || null,
      showOnline: data.showOnline ?? true,
      notForSale: data.notForSale ?? false,
      reorderLevel: (data.reorderLevel ?? data.minQuantity ?? "10").toString(),
      supplierId: data.supplierId || null,
      updatedAt: new Date(),
    }).where(eq(productsTable.id, id)).returning();

    if (!product) { res.status(404).json({ error: "Not Found" }); return; }
    const [catMap, supMap] = await Promise.all([getCategoryMap(), getSupplierMap()]);
    res.json(mapProduct(product, catMap, supMap));
  } catch (err) {
    req.log.error({ err }, "Update product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete product error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post(
  "/import/preview",
  authenticate,
  requireRole("admin", "staff"),
  upload.single("file"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

      const rawRows = parseRows(req.file.buffer, req.file.mimetype);
      const existingProducts = await db.select({ id: productsTable.id, name: productsTable.name, barcode: productsTable.barcode }).from(productsTable);
      const existingByName = new Map(existingProducts.map(p => [p.name.toLowerCase().trim(), p]));
      const existingByBarcode = new Map(existingProducts.filter(p => p.barcode).map(p => [String(p.barcode).toLowerCase(), p]));

      const existingCategories = await db.select({ id: categoriesTable.id, name: categoriesTable.name }).from(categoriesTable);
      const catByName = new Map(existingCategories.map(c => [c.name.toLowerCase().trim(), c]));

      const existingSuppliers = await db.select({ id: suppliersTable.id, name: suppliersTable.name }).from(suppliersTable);
      const supByName = new Map(existingSuppliers.map(s => [s.name.toLowerCase().trim(), s]));

      const previewRows: any[] = [];
      let valid = 0, invalid = 0, newCount = 0, updateCount = 0;
      const newCategories = new Set<string>();
      const newSuppliers = new Set<string>();
      const seenNames = new Set<string>();

      for (const row of rawRows) {
        const extracted = extractFromRow(row);
        if (!extracted.name) { invalid++; continue; }

        const nameLower = String(extracted.name).toLowerCase().trim();
        const isDuplicate = seenNames.has(nameLower);
        seenNames.add(nameLower);

        const barcodeLower = extracted.barcode ? String(extracted.barcode).toLowerCase() : null;
        const existing = existingByName.get(nameLower) || (barcodeLower ? existingByBarcode.get(barcodeLower) : undefined);
        const action = existing ? "update" : "create";
        if (action === "update") updateCount++;
        else if (!isDuplicate) newCount++;

        if (extracted.category) {
          const catLower = extracted.category.toLowerCase().trim();
          if (!catByName.has(catLower)) newCategories.add(extracted.category);
        }
        if (extracted.supplier) {
          const supLower = extracted.supplier.toLowerCase().trim();
          if (!supByName.has(supLower)) newSuppliers.add(extracted.supplier);
        }

        const stockStatus = getStockStatus(extracted.quantity, extracted.reorderLevel, extracted.notForSale);
        valid++;
        previewRows.push({
          rowIndex: previewRows.length,
          ...extracted,
          action,
          isDuplicate,
          stockStatus,
          existingId: existing?.id || null,
        });
      }

      res.json({
        rows: previewRows,
        summary: {
          total: rawRows.length,
          valid,
          invalid: rawRows.length - valid,
          newProducts: newCount,
          existingProducts: updateCount,
          newCategories: newCategories.size,
          newSuppliers: newSuppliers.size,
        },
      });
    } catch (err) {
      req.log.error({ err }, "Import preview error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.post(
  "/import/confirm",
  authenticate,
  requireRole("admin", "staff"),
  async (req: AuthRequest, res) => {
    try {
      const { rows } = req.body as { rows: any[] };
      if (!rows || !Array.isArray(rows)) { res.status(400).json({ error: "No rows provided" }); return; }

      const existingCats = await db.select().from(categoriesTable);
      const catByName = new Map(existingCats.map(c => [c.name.toLowerCase().trim(), c]));

      const existingSuppliers = await db.select().from(suppliersTable);
      const supByName = new Map(existingSuppliers.map(s => [s.name.toLowerCase().trim(), s]));

      let imported = 0, updated = 0, categoriesCreated = 0, suppliersCreated = 0;

      for (const row of rows) {
        if (!row.name) continue;

        let categoryId: number | null = null;
        if (row.category) {
          const catKey = String(row.category).toLowerCase().trim();
          if (catByName.has(catKey)) {
            categoryId = catByName.get(catKey)!.id;
          } else {
            const [newCat] = await db.insert(categoriesTable).values({ name: String(row.category) }).returning();
            categoryId = newCat.id;
            catByName.set(catKey, newCat);
            categoriesCreated++;
          }
        }

        let supplierId: number | null = null;
        if (row.supplier) {
          const supKey = String(row.supplier).toLowerCase().trim();
          if (supByName.has(supKey)) {
            supplierId = supByName.get(supKey)!.id;
          } else {
            const [newSup] = await db.insert(suppliersTable).values({ name: String(row.supplier) }).returning();
            supplierId = newSup.id;
            supByName.set(supKey, newSup);
            suppliersCreated++;
          }
        }

        const productData = {
          categoryId,
          supplierId,
          hsnCode: row.hsnCode || null,
          barcode: row.barcode || null,
          type: row.type || "Product",
          unitPrice: String(row.unitPrice || "0"),
          priceWithTax: String(row.priceWithTax || "0"),
          tax: String(row.tax || "0"),
          quantity: String(row.quantity || "0"),
          units: row.units || "NOS",
          discount: String(row.discount || "0"),
          discountAmount: String(row.discountAmount || "0"),
          purchaseUnitPrice: String(row.purchaseUnitPrice || "0"),
          purchasePriceWithTax: String(row.purchasePriceWithTax || "0"),
          description: row.description || null,
          showOnline: row.showOnline !== false,
          notForSale: row.notForSale === true,
          reorderLevel: String(row.reorderLevel || "10"),
          updatedAt: new Date(),
        };

        if (row.existingId) {
          await db.update(productsTable).set(productData).where(eq(productsTable.id, row.existingId));
          updated++;
        } else {
          try {
            await db.insert(productsTable).values({ name: String(row.name), ...productData });
            imported++;
          } catch {
            await db.update(productsTable).set(productData).where(eq(productsTable.name, String(row.name)));
            updated++;
          }
        }
      }

      res.json({ imported, updated, categoriesCreated, suppliersCreated, total: imported + updated });
    } catch (err) {
      req.log.error({ err }, "Import confirm error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.post(
  "/import",
  authenticate,
  requireRole("admin", "staff"),
  upload.single("file"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

      const rawRows = parseRows(req.file.buffer, req.file.mimetype);
      const existingCats = await db.select().from(categoriesTable);
      const catByName = new Map(existingCats.map(c => [c.name.toLowerCase().trim(), c]));

      const existingSuppliers = await db.select().from(suppliersTable);
      const supByName = new Map(existingSuppliers.map(s => [s.name.toLowerCase().trim(), s]));

      let imported = 0, updated = 0, skipped = 0, categoriesCreated = 0, suppliersCreated = 0;

      for (const row of rawRows) {
        const extracted = extractFromRow(row);
        if (!extracted.name) { skipped++; continue; }

        let categoryId: number | null = null;
        if (extracted.category) {
          const catKey = extracted.category.toLowerCase().trim();
          if (catByName.has(catKey)) {
            categoryId = catByName.get(catKey)!.id;
          } else {
            const [newCat] = await db.insert(categoriesTable).values({ name: extracted.category }).returning();
            categoryId = newCat.id;
            catByName.set(catKey, newCat);
            categoriesCreated++;
          }
        }

        let supplierId: number | null = null;
        if (extracted.supplier) {
          const supKey = extracted.supplier.toLowerCase().trim();
          if (supByName.has(supKey)) {
            supplierId = supByName.get(supKey)!.id;
          } else {
            const [newSup] = await db.insert(suppliersTable).values({ name: extracted.supplier }).returning();
            supplierId = newSup.id;
            supByName.set(supKey, newSup);
            suppliersCreated++;
          }
        }

        const productData = {
          categoryId, supplierId,
          hsnCode: extracted.hsnCode || null,
          barcode: extracted.barcode || null,
          type: extracted.type || "Product",
          unitPrice: String(extracted.unitPrice),
          priceWithTax: String(extracted.priceWithTax),
          tax: String(extracted.tax),
          quantity: String(extracted.quantity),
          units: extracted.units || "NOS",
          discount: String(extracted.discount),
          discountAmount: String(extracted.discountAmount),
          purchaseUnitPrice: String(extracted.purchaseUnitPrice),
          purchasePriceWithTax: String(extracted.purchasePriceWithTax),
          description: extracted.description || null,
          showOnline: extracted.showOnline,
          notForSale: extracted.notForSale,
          reorderLevel: String(extracted.reorderLevel),
          updatedAt: new Date(),
        };

        const [existing] = await db.select().from(productsTable).where(eq(productsTable.name, extracted.name)).limit(1);
        if (existing) {
          await db.update(productsTable).set(productData).where(eq(productsTable.id, existing.id));
          updated++;
        } else {
          await db.insert(productsTable).values({ name: extracted.name, ...productData });
          imported++;
        }
      }

      res.json({ imported, updated, skipped, categoriesCreated, suppliersCreated });
    } catch (err) {
      req.log.error({ err }, "Import products error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
