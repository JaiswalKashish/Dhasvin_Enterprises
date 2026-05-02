import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, productsTable, salesTable, purchasesTable, billsTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    }).from(usersTable);
    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Get users error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password || !role) {
      res.status(400).json({ error: "Bad Request", message: "All fields required" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({ email, name, passwordHash, role }).returning({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    });
    res.status(201).json(user);
  } catch (err) {
    req.log.error({ err }, "Create user error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, role, password } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (role) updates.role = role;
    if (password) updates.passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    });
    if (!user) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Update user error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user!.userId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete user error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/admin/clear-all-data", requireRole("admin"), async (req, res) => {
  try {
    await db.delete(billsTable);
    await db.delete(salesTable);
    await db.delete(purchasesTable);
    await db.delete(productsTable);
    res.json({ success: true, message: "All inventory data has been cleared" });
  } catch (err) {
    req.log.error({ err }, "Clear data error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
