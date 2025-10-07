// Importamos Express, que es el framework para manejar rutas HTTP
const express = require('express');

// Creamos un "router", que es un objeto que nos permite definir endpoints separados
const router = express.Router();

// Importamos la conexión a la base de datos desde el archivo db.js
const pool = require('../db'); // ".." porque subimos un nivel de carpeta

// ----------------------------------------------

//ENDPOINT "LISTAR TODO" (GET):
router.get('/', (req, res) => {
  pool.query('SELECT * FROM auxiliar', (err, result) => {
    if (err) {
      console.error('❌ Error al obtener auxiliares:', err);
      res.status(500).json({ error: 'Error al obtener auxiliares' });
    } else {
      res.json(result.rows);
    }
  });
});

module.exports = router;

// --------------------------------------------

//ENDPOINT "LISTAR SEGUN ID" (GET):
router.get('/:id', (req, res) => {
  const auxiliarId = req.params.id;
  if (!auxiliarId || isNaN(auxiliarId)) {
    return res.status(400).json({ error: 'ID de auxiliar inválido' });
  }

  pool.query('SELECT * FROM auxiliar WHERE id = $1', [auxiliarId], (err, result) => {
    if (err) {
      console.error('❌ Error al buscar auxiliar:', err);
      res.status(500).json({ error: 'Error al buscar auxiliar' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Auxiliar no encontrado' });
    } else {
      res.json(result.rows[0]); // Devuelve solo ese auxiliar
    }
  });
});

// --------------------------------------------

//ENDPOINT PARA "CREAR O AGREGAR" (POST):

router.post('/', (req, res) => {
  //TO DO: LOG PARA CHEQUEAR QUE SE CREA BIEN
console.log('➡️ [API] Llegó petición POST /api/auxiliares con body:', req.body);
//-------------------
  const { activo, auth_provider, fecha_creacion, email, nombre } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'El email es requerido y debe ser válido' });
  }
  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre es requerido y debe tener al menos 2 caracteres' });
  }
  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'El campo activo debe ser un valor booleano' });
  }
  if (!fecha_creacion || isNaN(Date.parse(fecha_creacion))) {
    return res.status(400).json({ error: 'La fecha de creación es requerida y debe ser válida' });
  }
    //TO DO: LOG PARA CHEQUEAR QUE SE CREA BIEN
    console.log('🟢 [API] Todos los campos obligatorios están presentes:')
    //-------------------
    
  const query = `
    INSERT INTO auxiliar (activo, auth_provider, fecha_creacion, email, nombre)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`;
  const values = [activo, auth_provider || null, fecha_creacion, email, nombre];

  //TO DO: LOG PARA CHEQUEAR QUE SE CREA BIEN
  console.log('🟡 [API] Ejecutando INSERT con valores:', values);
  //-------------------

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al crear auxiliar:', err);
      res.status(500).json({ error: 'Error al crear el auxiliar' });
    } else {
      //TO DO: LOG PARA CHEQUEAR QUE SE CREA BIEN
      console.log('✅ [API] Auxiliar creado correctamente:', result.rows[0]);
      //-------------------
      res.status(201).json(result.rows[0]);
    }
  });
});

//-------------------------------------------------

//ENDPOINT PARA MODIFICAR (PUT) UN AUXILIAR EXISTENTE:

router.put('/:id', (req, res) => {
  const auxiliarId = req.params.id;
  const { activo, auth_provider, fecha_creacion, email, nombre } = req.body;

  // Validar campos obligatorios
  if (activo === undefined || !fecha_creacion || !email || !nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para actualizar' });
  }

  const query = `
    UPDATE auxiliar
    SET activo = $1,
        auth_provider = $2,
        fecha_creacion = $3,
        email = $4,
        nombre = $5
    WHERE id = $6
    RETURNING *`;
  const values = [activo, auth_provider || null, fecha_creacion, email, nombre, auxiliarId];
  if (!auxiliarId || isNaN(auxiliarId)) {
    return res.status(400).json({ error: 'ID de auxiliar inválido' });
  }
  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'El campo activo debe ser un valor booleano' });
  }
  if (!fecha_creacion || isNaN(Date.parse(fecha_creacion))) {
    return res.status(400).json({ error: 'La fecha de creación debe ser válida' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'El email debe ser válido' });
  }
  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
  }

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar auxiliar:', err);
      res.status(500).json({ error: 'Error al actualizar el auxiliar' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Auxiliar no encontrado' });
    } else {
      res.json(result.rows[0]); // Devuelve el auxiliar actualizado
    }
  });
});

//-----------------------------------------------------

//ENDPOINT PARA ELIMINAR (DELETE) UN GRUPO EXISTENTE:
//(se elimina por ID)

router.delete('/:id', (req, res) => {
  const auxiliarId = req.params.id;

  const query = 'DELETE FROM auxiliar WHERE id = $1 RETURNING *';
  const values = [auxiliarId];
  if (!auxiliarId || isNaN(auxiliarId)) {
    return res.status(400).json({ error: 'ID de auxiliar inválido' });
  }

 pool.query(query, values, (err, result) => {
    if (err) {
      // Detectamos si el error es por clave foránea (código PostgreSQL 23503)
      if (err.code === '23503') {
        return res.status(409).json({
          error: 'No se puede eliminar el auxiliar porque está vinculado a otros datos (por ejemplo, grupos).'
        });
      }
      // Otro error desconocido
      console.error('❌ Error al eliminar auxiliar:', err);
      return res.status(500).json({ error: 'Error interno al intentar eliminar el auxiliar.' });
    }
    // Si no se encontró el auxiliar
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Auxiliar no encontrado' });
    }
    // Eliminación exitosa
    res.json({ mensaje: 'Auxiliar eliminado correctamente', auxiliar: result.rows[0] });
  });
});
