const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { users } = require('./src/schema/users');
const { eq } = require('drizzle-orm');

async function test() {
  const pool = new Pool({ connectionString: 'postgresql://postgres@127.0.0.1:5432/inventory' });
  const db = drizzle(pool);
  
  try {
    const res = await db.select().from(users).where(eq(users.email, 'admin@dhasvin.com'));
    console.log(res);
  } catch (err) {
    console.error("Caught error:", err);
  }
  await pool.end();
}

test();
