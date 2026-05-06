import { Router } from "express";
import { db } from "@workspace/db";
import { suppliersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
    res.json(suppliers);
  } catch (err) {
    req.log.error({ err }, "Get suppliers error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", authenticate, requireRole("admin", "staff"), async (req: AuthRequest, res) => {
  try {
    const { name, contactPerson, phone, email, address, city, state, notes } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [supplier] = await db
      .insert(suppliersTable)
      .values({ name, contactPerson, phone, email, address, city, state, notes })
      .returning();
    res.status(201).json(supplier);
  } catch (err) {
    req.log.error({ err }, "Create supplier error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", authenticate, requireRole("admin", "staff"), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, contactPerson, phone, email, address, city, state, notes } = req.body;
    const [supplier] = await db
      .update(suppliersTable)
      .set({ name, contactPerson, phone, email, address, city, state, notes, updatedAt: new Date() })
      .where(eq(suppliersTable.id, id))
      .returning();
    if (!supplier) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(supplier);
  } catch (err) {
    req.log.error({ err }, "Update supplier error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
    res.json({ success: true, message: "Supplier deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete supplier error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
