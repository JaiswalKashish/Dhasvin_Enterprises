import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import productsRouter from "./products.js";
import categoriesRouter from "./categories.js";
import suppliersRouter from "./suppliers.js";
import purchasesRouter from "./purchases.js";
import salesRouter from "./sales.js";
import analyticsRouter from "./analytics.js";
import usersRouter from "./users.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/categories", categoriesRouter);
router.use("/suppliers", suppliersRouter);
router.use("/purchases", purchasesRouter);
router.use("/sales", salesRouter);
router.use("/analytics", analyticsRouter);
router.use("/users", usersRouter);

export default router;
