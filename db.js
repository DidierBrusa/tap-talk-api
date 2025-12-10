const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// DEBUG: Imprimir todas las variables de entorno relacionadas con DB
console.log('🔍 DEBUG - Variables de entorno:');
console.log('PGHOST:', process.env.PGHOST || '❌ NO DEFINIDO');
console.log('PGPORT:', process.env.PGPORT || '❌ NO DEFINIDO');
console.log('PGDATABASE:', process.env.PGDATABASE || '❌ NO DEFINIDO');
console.log('PGUSER:', process.env.PGUSER || '❌ NO DEFINIDO');
console.log('PGPASSWORD:', process.env.PGPASSWORD ? '✅ DEFINIDO' : '❌ NO DEFINIDO');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || '❌ NO DEFINIDO');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ DEFINIDO' : '❌ NO DEFINIDO');

// Crear cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_ANON_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración de conexión a Supabase PostgreSQL
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || '5432'),
  ssl: {
    rejectUnauthorized: false // Necesario para Supabase
  }
});

// Verificar conexión
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a Supabase PostgreSQL:', err.message);
  } else {
    console.log('✅ Conexión exitosa a Supabase PostgreSQL');
    release();
  }
})

module.exports = {
  pool,
  supabase,
};
