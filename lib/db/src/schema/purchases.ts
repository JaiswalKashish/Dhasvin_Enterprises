import {
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";
import { productsTable } from "./products";

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "pending",
  "received",
  "cancelled",
]);

export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliersTable.id, {
    onDelete: "set null",
  }),
  productId: integer("product_id").references(() => productsTable.id, {
    onDelete: "set null",
  }),
  quantityPurchased: numeric("quantity_purchased", {
    precision: 12,
    scale: 2,
  }).notNull(),
  purchaseCost: numeric("purchase_cost", { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }),
  date: timestamp("date").defaultNow().notNull(),
  billNumber: text("bill_number"),
  importSource: text("import_source"),
  status: purchaseStatusEnum("status").notNull().default("received"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;
