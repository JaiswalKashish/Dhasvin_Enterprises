import { pgTable, serial, text, timestamp, decimal, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  billNumber: text("bill_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerAddress: text("customer_address"),
  customerPhone: text("customer_phone"),
  customerGst: text("customer_gst"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalDiscount: decimal("total_discount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalGst: decimal("total_gst", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  amountInWords: text("amount_in_words"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const billItemsTable = pgTable("bill_items", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => billsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  productName: text("product_name").notNull(),
  hsnCode: text("hsn_code"),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  gst: decimal("gst", { precision: 5, scale: 2 }).notNull().default("0.00"), // GST percentage
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Line total
});

export const insertBillSchema = createInsertSchema(billsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillItemSchema = createInsertSchema(billItemsTable).omit({
  id: true,
});

export type Bill = typeof billsTable.$inferSelect;
export type BillItem = typeof billItemsTable.$inferSelect;
