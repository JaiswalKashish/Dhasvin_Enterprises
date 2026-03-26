import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const cats = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
    const counts = await db
      .select({
        categoryId: productsTable.categoryId,
        count: sql<number>`count(*)`,
      })
      .from(productsTable)
      .groupBy(productsTable.categoryId);

    const countMap = new Map(counts.map((c) => [c.categoryId, Number(c.count)]));

    res.json(
      cats.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        productCount: countMap.get(c.id) || 0,
        createdAt: c.createdAt,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Get categories error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", authenticate, requireRole("admin", "staff"), async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [cat] = await db
      .insert(categoriesTable)
      .values({ name, description: description || null })
      .returning();
    res.status(201).json({ ...cat, productCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Create category error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", authenticate, requireRole("admin", "staff"), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    const [cat] = await db
      .update(categoriesTable)
      .set({ name, description: description || null, updatedAt: new Date() })
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!cat) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json({ ...cat, productCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Update category error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", authenticate, requireRole("admin"), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete category error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
