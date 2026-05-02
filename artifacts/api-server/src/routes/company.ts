import { Router, type IRouter } from "express";
import { db, companySettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireRole } from "../middlewares/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads", "company");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `company-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage: storage });

const normalizeUploadFilename = (value?: string | null) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return path.basename(trimmed);
};

const buildCompanySettingResponse = (settings: any) => {
  const companyInfo = { ...settings };
  const logoFile = normalizeUploadFilename(companyInfo.logoPath);
  if (logoFile) {
    companyInfo.logoPath = `/uploads/company/${logoFile}`;
  } else {
    companyInfo.logoPath = null;
  }
  const qrFile = normalizeUploadFilename(companyInfo.qrCodePath);
  if (qrFile) {
    companyInfo.qrCodePath = `/uploads/company/${qrFile}`;
  } else {
    companyInfo.qrCodePath = null;
  }
  return companyInfo;
};

router.use(authenticate);

// Get company settings
router.get("/", async (req, res) => {
  try {
    const settings = await db.select().from(companySettingsTable).limit(1);
    if (!settings || settings.length === 0) {
      res.json({
        id: 0,
        name: "Your Company Name",
        gstin: null,
        pan: null,
        address: null,
        phoneNumber: null,
        email: null,
        bankName: null,
        accountNumber: null,
        ifsc: null,
        upiId: null,
        qrCodePath: null,
        logoPath: null,
      });
      return;
    }

    res.json(buildCompanySettingResponse(settings[0]));
  } catch (err) {
    req.log.error({ err }, "Get company error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update company settings
router.put("/", requireRole("admin"), async (req, res) => {
  try {
    const data = req.body;
    const existing = await db.select().from(companySettingsTable).limit(1);
    let updated;

    const payload = {
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
      logoPath:
        data.logoPath !== undefined
          ? normalizeUploadFilename(data.logoPath)
          : normalizeUploadFilename(existing[0]?.logoPath) || null,
      qrCodePath:
        data.qrCodePath !== undefined
          ? normalizeUploadFilename(data.qrCodePath)
          : normalizeUploadFilename(existing[0]?.qrCodePath) || null,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      [updated] = await db.update(companySettingsTable)
        .set(payload)
        .where(eq(companySettingsTable.id, existing[0].id))
        .returning();
    } else {
      [updated] = await db.insert(companySettingsTable).values(payload).returning();
    }

    res.json(buildCompanySettingResponse(updated));
  } catch (err) {
    req.log.error({ err }, "Update company error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Logo upload endpoint
router.post("/logo", requireRole("admin"), upload.single("logo"), async (req, res) => {
  try {
    // #region agent log
    fetch("http://127.0.0.1:7555/ingest/170bd962-3dc4-4d25-8498-809d86c0a8a1", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "118ffa" },
      body: JSON.stringify({
        sessionId: "118ffa",
        runId: "pre-fix",
        hypothesisId: "H1-H2",
        location: "company.ts:POST /logo:entry",
        message: "Logo upload endpoint hit",
        data: {
          hasFile: Boolean(req.file),
          mimeType: req.file?.mimetype ?? null,
          originalName: req.file?.originalname ?? null,
          fileSize: req.file?.size ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!req.file) {
      // #region agent log
      fetch("http://127.0.0.1:7555/ingest/170bd962-3dc4-4d25-8498-809d86c0a8a1", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "118ffa" },
        body: JSON.stringify({
          sessionId: "118ffa",
          runId: "pre-fix",
          hypothesisId: "H2",
          location: "company.ts:POST /logo:noFile",
          message: "Upload rejected because file missing",
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const existing = await db.select().from(companySettingsTable).limit(1);
    const logoPath = req.file.filename;
    if (existing.length > 0) {
      await db
        .update(companySettingsTable)
        .set({ logoPath, updatedAt: new Date() })
        .where(eq(companySettingsTable.id, existing[0].id));
    } else {
      await db.insert(companySettingsTable).values({
        name: "DHASVIN ENTERPRISES",
        logoPath,
        updatedAt: new Date(),
      });
    }
    // #region agent log
    fetch("http://127.0.0.1:7555/ingest/170bd962-3dc4-4d25-8498-809d86c0a8a1", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "118ffa" },
      body: JSON.stringify({
        sessionId: "118ffa",
        runId: "pre-fix",
        hypothesisId: "H3-H4",
        location: "company.ts:POST /logo:success",
        message: "Upload persisted successfully",
        data: {
          logoPath,
          fileExistsOnDisk: fs.existsSync(path.join(uploadDir, logoPath)),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    res.json({ logoPath, logoUrl: `/uploads/company/${logoPath}` });
  } catch (err) {
    // #region agent log
    fetch("http://127.0.0.1:7555/ingest/170bd962-3dc4-4d25-8498-809d86c0a8a1", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "118ffa" },
      body: JSON.stringify({
        sessionId: "118ffa",
        runId: "pre-fix",
        hypothesisId: "H5",
        location: "company.ts:POST /logo:catch",
        message: "Upload handler threw error",
        data: { errorMessage: err instanceof Error ? err.message : "unknown" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    req.log.error({ err }, "Upload logo error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPI QR upload endpoint
router.post("/qr", requireRole("admin"), upload.single("qr"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No QR image uploaded" });
      return;
    }
    const existing = await db.select().from(companySettingsTable).limit(1);
    const qrCodePath = req.file.filename;
    if (existing.length > 0) {
      await db
        .update(companySettingsTable)
        .set({ qrCodePath, updatedAt: new Date() })
        .where(eq(companySettingsTable.id, existing[0].id));
    } else {
      await db.insert(companySettingsTable).values({
        name: "DHASVIN ENTERPRISES",
        qrCodePath,
        updatedAt: new Date(),
      });
    }
    res.json({ qrCodePath, qrCodeUrl: `/uploads/company/${qrCodePath}` });
  } catch (err) {
    req.log.error({ err }, "Upload QR error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
