// Importamos la configuración del archivo db.js
const pool = require('./db');

// Ejecutamos una consulta SQL para obtener la fecha y hora actual del servidor
pool.query('SELECT NOW()', (err, result) => {

  // Si ocurre un error durante la conexión o la consulta, lo mostramos en consola
  if (err) {
    console.error('❌ Error al conectar con la base de datos:', err);
  } else {
    // Si todo salió bien, mostramos la respuesta: la hora actual del servidor
    console.log('✅ Conexión exitosa. Fecha y hora del servidor:', result.rows[0]);
  }

  // Cerramos la conexión a la base de datos al finalizar (solo en pruebas)
  pool.end();
});
