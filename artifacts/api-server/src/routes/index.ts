import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import productsRouter from "./products.js";
import categoriesRouter from "./categories.js";
import suppliersRouter from "./suppliers.js";
import salesRouter from "./sales.js";
import purchasesRouter from "./purchases.js";
import invoicesRouter from "./invoices.js";
import billsRouter from "./bills.js";
import analyticsRouter from "./analytics.js";
import usersRouter from "./users.js";
import companyRouter from "./company.js";
import customersRouter from "./customers.js";
import dataUploadRouter from "./data-upload.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { db, productsTable, salesTable, purchasesTable, billsTable, suppliersTable, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/categories", categoriesRouter);
router.use("/suppliers", suppliersRouter);
router.use("/sales", salesRouter);
router.use("/purchases", purchasesRouter);
router.use("/invoices", invoicesRouter);
router.use("/bills", billsRouter);
router.use("/analytics", analyticsRouter);
router.use("/users", usersRouter);
router.use("/company", companyRouter);
router.use("/customers", customersRouter);
router.use("/data-upload", dataUploadRouter);

// Admin clear all data
router.delete("/admin/clear-data", authenticate, requireRole("admin"), async (req, res) => {
  try {
    await db.delete(billsTable);
    await db.delete(salesTable);
    await db.delete(purchasesTable);
    await db.delete(productsTable);
    await db.delete(suppliersTable);
    await db.delete(categoriesTable);
    res.json({ success: true, message: "All inventory data has been cleared" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
