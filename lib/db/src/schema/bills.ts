import { pgTable, serial, varchar, text, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const billsTable = pgTable("bills", {
  id: serial("id").primaryKey(),
  billNumber: varchar("bill_number", { length: 50 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerAddress: text("customer_address"),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerGst: varchar("customer_gst", { length: 50 }),
  items: jsonb("items").notNull(),
  companySnapshot: jsonb("company_snapshot").notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  totalDiscount: numeric("total_discount", { precision: 12, scale: 2 }).default("0"),
  totalGst: numeric("total_gst", { precision: 12, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  amountInWords: text("amount_in_words"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBillSchema = createInsertSchema(billsTable).omit({ id: true, createdAt: true });
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof billsTable.$inferSelect;
