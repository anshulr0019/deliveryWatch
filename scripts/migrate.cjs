const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local', quiet: true });
require('dotenv').config({ quiet: true });
(async () => {
 if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
 const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
 await client.connect();
 try {
  await client.query("SELECT pg_advisory_lock(823417)");
  await client.query('CREATE TABLE IF NOT EXISTS deliverywatch_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for(const name of fs.readdirSync(path.join(__dirname,'../migrations')).filter(n=>n.endsWith('.sql')).sort()) {
   if((await client.query('SELECT name FROM deliverywatch_migrations WHERE name=$1',[name])).rows.length)continue;
   await client.query(fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8'));
   await client.query('INSERT INTO deliverywatch_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING',[name]);
   console.log(`Applied ${name}`);
  }
 } finally { await client.end(); }
})().catch(error=>{console.error('Migration failed:',error.message);process.exitCode=1;});
