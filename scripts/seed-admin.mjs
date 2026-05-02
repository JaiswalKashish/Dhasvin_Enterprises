import pg from "pg";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function seedUsers() {
  const users = [
    { email: "admin@inventory.com", password: "Admin@123", name: "Admin", role: "admin" },
    { email: "staff@inventory.com", password: "Staff@123", name: "Staff", role: "staff" },
    { email: "user@inventory.com", password: "User@123", name: "User", role: "user" },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    // Check if user already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [user.email]);
    if (existing.rows.length > 0) {
      console.log(`User '${user.email}' already exists. Updating password...`);
      await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [passwordHash, user.email]);
      console.log("Password updated.");
    } else {
      await pool.query(
        "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4)",
        [user.email, user.name, passwordHash, user.role]
      );
      console.log(`${user.role} user created!`);
    }

    console.log(`  Email:    ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log(`  Role:     ${user.role}\n`);
  }

  await pool.end();
}

seedUsers().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
