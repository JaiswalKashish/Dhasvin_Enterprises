const { Client } = require('pg');
const c = new Client('postgresql://postgres:postgres@127.0.0.1:5432/postgres');
c.connect()
  .then(()=>c.query('SHOW server_version;'))
  .then(r=>console.log('Postgres Version:', r.rows[0].server_version))
  .catch(e=>console.log('Error:', e.message))
  .finally(()=>c.end());
