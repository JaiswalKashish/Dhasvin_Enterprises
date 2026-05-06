import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { companySettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../lib/auth.js";
import path from "path";
import fs from "fs";

const router = Router();

// Configure storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const [settings] = await db.select().from(companySettingsTable).limit(1);
    res.json(settings || {});
  } catch (err) {
    req.log.error({ err }, "Get company settings error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/", authenticate, requireRole("admin"), async (req: AuthRequest, res) => {
  try {
    const data = req.body;
    const [existing] = await db.select().from(companySettingsTable).limit(1);

    const values = {
      name: data.name,
      gstin: data.gstin || null,
      pan: data.pan || null,
      address: data.address || null,
      phoneNumber: data.phoneNumber || null,
      email: data.email || null,
      bankName: data.bankName || null,
      accountNumber: data.accountNumber || null,
      ifsc: data.ifsc || null,
      upiId: data.upiId || null,
      logoPath: data.logoPath || null,
      qrCodePath: data.qrCodePath || null,
      updatedAt: new Date(),
    };

    let result;
    if (existing) {
      [result] = await db.update(companySettingsTable).set(values).where(eq(companySettingsTable.id, existing.id)).returning();
    } else {
      [result] = await db.insert(companySettingsTable).values(values).returning();
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Update company settings error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/logo", authenticate, requireRole("admin"), upload.single("logo"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const logoPath = `/uploads/${req.file.filename}`;
    res.json({ logoPath, logoUrl: logoPath });
  } catch (err) {
    req.log.error({ err }, "Logo upload error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/qr", authenticate, requireRole("admin"), upload.single("qr"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const qrCodePath = `/uploads/${req.file.filename}`;
    res.json({ qrCodePath, qrCodeUrl: qrCodePath });
  } catch (err) {
    req.log.error({ err }, "QR upload error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
