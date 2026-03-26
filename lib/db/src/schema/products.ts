import {
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { suppliersTable } from "./suppliers";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => categoriesTable.id, {
    onDelete: "set null",
  }),
  hsnCode: text("hsn_code"),
  barcode: text("barcode"),
  type: text("type").default("Product"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).default("0"),
  priceWithTax: numeric("price_with_tax", { precision: 12, scale: 2 }).default("0"),
  tax: numeric("tax", { precision: 5, scale: 2 }).default("0"),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).default("0"),
  units: text("units").default("NOS"),
  discount: numeric("discount", { precision: 5, scale: 2 }).default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
  purchaseUnitPrice: numeric("purchase_unit_price", { precision: 12, scale: 2 }).default("0"),
  purchasePriceWithTax: numeric("purchase_price_with_tax", { precision: 12, scale: 2 }).default("0"),
  description: text("description"),
  showOnline: boolean("show_online").default(true),
  notForSale: boolean("not_for_sale").default(false),
  reorderLevel: numeric("reorder_level", { precision: 12, scale: 2 }).default("10"),
  supplierId: integer("supplier_id").references(() => suppliersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
