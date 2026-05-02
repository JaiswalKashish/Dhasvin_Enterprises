import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const categories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        description: categoriesTable.description,
        productCount: sql<number>`count(${productsTable.id})::int`,
        createdAt: categoriesTable.createdAt,
      })
      .from(categoriesTable)
      .leftJoin(productsTable, eq(productsTable.categoryId, categoriesTable.id))
      .groupBy(categoriesTable.id);

    res.json(categories);
  } catch (err) {
    req.log.error({ err }, "Get categories error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireRole("admin", "staff"), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: "Bad Request", message: "Name is required" });
      return;
    }
    const [cat] = await db.insert(categoriesTable).values({ name, description }).returning();
    res.status(201).json({ ...cat, productCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Create category error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireRole("admin", "staff"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    const [cat] = await db.update(categoriesTable).set({ name, description }).where(eq(categoriesTable.id, id)).returning();
    if (!cat) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(cat);
  } catch (err) {
    req.log.error({ err }, "Update category error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
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
