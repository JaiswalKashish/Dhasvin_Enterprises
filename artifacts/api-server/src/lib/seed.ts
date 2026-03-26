import { db } from "@workspace/db";
import { usersTable, categoriesTable, suppliersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  try {
    // Seed users
    const users = [
      { email: "admin@inventory.com", name: "Admin User", password: "Admin@123", role: "admin" as const },
      { email: "staff@inventory.com", name: "Staff User", password: "Staff@123", role: "staff" as const },
      { email: "user@inventory.com", name: "View User", password: "User@123", role: "user" as const },
    ];

    for (const u of users) {
      const [existing] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, u.email))
        .limit(1);

      if (!existing) {
        const passwordHash = await bcrypt.hash(u.password, 10);
        await db.insert(usersTable).values({
          email: u.email,
          name: u.name,
          passwordHash,
          role: u.role,
        });
        console.log(`Created user: ${u.email}`);
      }
    }

    // Seed categories
    const categories = [
      { name: "Cutting Tools", description: "Drills, inserts, and milling tools" },
      { name: "Measuring Tools", description: "Micrometers, calipers, gauges" },
      { name: "Fasteners", description: "Bolts, nuts, screws" },
      { name: "Abrasives", description: "Grinding wheels, sandpaper" },
      { name: "General", description: "General items" },
    ];

    for (const cat of categories) {
      const [existing] = await db
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.name, cat.name))
        .limit(1);

      if (!existing) {
        await db.insert(categoriesTable).values(cat);
        console.log(`Created category: ${cat.name}`);
      }
    }

    // Seed suppliers
    const suppliers = [
      {
        name: "Dhasvin Enterprises",
        contactPerson: "Manager",
        phone: "+91-9876543210",
        email: "info@dhasvin.com",
        city: "Chennai",
        state: "Tamil Nadu",
      },
      {
        name: "Industrial Supplies Co",
        contactPerson: "Sales Team",
        phone: "+91-9876543211",
        email: "sales@industrialsupplies.com",
        city: "Mumbai",
        state: "Maharashtra",
      },
    ];

    for (const sup of suppliers) {
      const [existing] = await db
        .select()
        .from(suppliersTable)
        .where(eq(suppliersTable.name, sup.name))
        .limit(1);

      if (!existing) {
        await db.insert(suppliersTable).values(sup);
        console.log(`Created supplier: ${sup.name}`);
      }
    }

    console.log("Database seeded successfully");
  } catch (err) {
    console.error("Seed error:", err);
  }
}
