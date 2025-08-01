// Importamos el pool de conexión a la base de datos
const pool = require('./db');

// Ejecutamos una consulta para traer todos los registros de la tabla "grupo"
pool.query('SELECT * FROM grupo', (err, result) => {
  if (err) {
    console.error('❌ Error al consultar la tabla grupo:', err);
  } else {
    console.log('✅ Datos obtenidos de la tabla grupo:');
    console.table(result.rows); // Muestra los resultados como tabla en consola
  }

  pool.end(); // Cerramos la conexión
});


