/* eslint-disable */
const pg = require("pg");
const bcrypt = require("bcryptjs");

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const hash = await bcrypt.hash("admin123", 10);

  const existing = await pool.query("SELECT id FROM users WHERE email=$1", [
    "admin@dhasvin.com",
  ]);

  if (existing.rows.length > 0) {
    await pool.query("UPDATE users SET password_hash=$1 WHERE email=$2", [
      hash,
      "admin@dhasvin.com",
    ]);
    console.log("Updated existing admin user password.");
  } else {
    await pool.query(
      "INSERT INTO users (email, name, password_hash, role) VALUES ($1,$2,$3,$4)",
      ["admin@dhasvin.com", "Admin", hash, "admin"]
    );
    console.log("Admin user created!");
  }

  console.log("\n  Email:    admin@dhasvin.com");
  console.log("  Password: admin123");
  console.log("  Role:     admin\n");

  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
