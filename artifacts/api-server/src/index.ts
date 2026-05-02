import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

async function ensureDemoUsers(): Promise<void> {
  const demoUsers = [
    { email: "admin@inventory.com", name: "Admin", role: "admin", password: "Admin@123" },
    { email: "staff@inventory.com", name: "Staff", role: "staff", password: "Staff@123" },
    { email: "user@inventory.com", name: "User", role: "user", password: "User@123" },
  ] as const;

  const userStatuses: Array<{ email: string; role: string; status: "existing" | "created" }> = [];

  for (const u of demoUsers) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, u.email));
    if (existing[0]) {
      userStatuses.push({ email: u.email, role: u.role, status: "existing" });
      continue;
    }

    const passwordHash = await bcrypt.hash(u.password, 10);
    await db.insert(usersTable).values({
      email: u.email,
      name: u.name,
      role: u.role,
      passwordHash,
    });
    userStatuses.push({ email: u.email, role: u.role, status: "created" });
  }

  logger.info({ users: userStatuses }, "Demo users verified");
}

async function main(): Promise<void> {
  const rawPort = process.env["PORT"];

  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  await ensureDemoUsers();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
