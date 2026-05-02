import { Router, type IRouter } from "express";
import { db, customersTable } from "@workspace/db";
import { eq, ilike, or, sql } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    let customers = await db.select().from(customersTable).orderBy(sql`${customersTable.createdAt} DESC`);

    if (search) {
      customers = await db
        .select()
        .from(customersTable)
        .where(
          or(
            ilike(customersTable.name, `%${search}%`),
            ilike(customersTable.email, `%${search}%`),
            ilike(customersTable.phoneNumber, `%${search}%`),
          ),
        )
        .orderBy(sql`${customersTable.createdAt} DESC`);
    }

    res.json(customers);
  } catch (err) {
    req.log.error({ err }, "Get customers error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const { name, phoneNumber, email, gstin, address } = req.body;
    if (!name) {
      res.status(400).json({ error: "Bad Request", message: "Customer name is required" });
      return;
    }

    const [customer] = await db.insert(customersTable).values({
      name,
      phoneNumber: phoneNumber || null,
      email: email || null,
      gstin: gstin || null,
      address: address || null,
    }).returning();

    res.status(201).json(customer);
  } catch (err) {
    req.log.error({ err }, "Create customer error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { name, phoneNumber, email, gstin, address } = req.body;

    const [customer] = await db.update(customersTable)
      .set({
        name,
        phoneNumber: phoneNumber || null,
        email: email || null,
        gstin: gstin || null,
        address: address || null,
      })
      .where(eq(customersTable.id, id))
      .returning();

    if (!customer) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json(customer);
  } catch (err) {
    req.log.error({ err }, "Update customer error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete customer error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
