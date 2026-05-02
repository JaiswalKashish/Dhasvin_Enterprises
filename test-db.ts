import { db } from "./lib/db/src/index.ts";
import { usersTable } from "./lib/db/src/schema/users.ts";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const res = await db.select().from(usersTable).where(eq(usersTable.email, "admin@dhasvin.com"));
    console.log("Success:", res);
  } catch(e) {
    console.error("DB Error:", e);
  }
}
run();
