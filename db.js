const { Pool } = require('pg');

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  user: 'postgres',         // Usuario de PostgreSQL
  host: 'localhost',        // Siempre es localhost si estás en tu propia máquina
  database: 'tap_talk',     // Base de datos
  password: '123456',       // Contraseña
  port: 5432,               // Puerto por defecto de PostgreSQL
});

module.exports = pool;




