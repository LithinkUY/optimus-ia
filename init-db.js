const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Admin123123%40123123@db.pczfvhoqmwsvfhxzzmjn.supabase.co:5432/postgres' });
async function init() {
  await client.connect();
  console.log('Connected to DB');
  await client.query(
    'CREATE TABLE IF NOT EXISTS public.profiles (' +
    '  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,' +
    '  email TEXT,' +
    '  credits INTEGER DEFAULT 50,' +
    '  role TEXT DEFAULT ''user'',' +
    '  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(''utc''::text, now())' +
    ');'
  );
  console.log('Table profiles created');
  process.exit();
}
init().catch(e => { console.error(e); process.exit(1); });
