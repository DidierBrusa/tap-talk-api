// Importamos Express, que es el framework para manejar rutas HTTP
const express = require('express');

// Creamos un "router", que es un objeto que nos permite definir endpoints separados
const router = express.Router();

// Importamos la conexión a la base de datos desde el archivo db.js
const pool = require('../db'); // ".." porque subimos un nivel de carpeta

// ----------------------------------------------

//ENDPOINT "LISTAR TODO" (GET):

router.get('/', (req, res) => {
  pool.query('SELECT * FROM notificacion', (err, result) => {
    if (err) {
      console.error('❌ Error al obtener notificaciones:', err);
      res.status(500).json({ error: 'Error al obtener notificaciones' });
    } else {
      res.json(result.rows);
    }
  });
});

module.exports = router;

// --------------------------------------------

//ENDPOINT "LISTAR SEGUN ID" (GET):

router.get('/:id', (req, res) => {
  const notificacionId = req.params.id;

  pool.query('SELECT * FROM notificacion WHERE id = $1', [notificacionId], (err, result) => {
    if (err) {
      console.error('❌ Error al buscar notificación:', err);
      res.status(500).json({ error: 'Error al buscar notificación' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Notificación no encontrada' });
    } else {
      res.json(result.rows[0]); // Devuelve la notificación encontrada
    }
  });
});

// --------------------------------------------

//ENDPOINT PARA "CREAR O AGREGAR" (POST):

router.post('/', (req, res) => {
  const {
    pictograma_id,
    titulo,
    fecha_creacion,
    categoria,
    grupo_id,
    fecha_resuelta,
    miembro_resolutor
  } = req.body;
  console.log(req.body)
  const missingFields = [];
  if (!pictograma_id) missingFields.push('pictograma_id');
  if (!titulo) missingFields.push('titulo');
  if (!fecha_creacion) missingFields.push('fecha_creacion');
  if (!categoria) missingFields.push('categoria');
  if (!grupo_id) missingFields.push('grupo_id');

  if (missingFields.length > 0) {
    return res.status(400).json({ 
      error: `Faltan los siguientes campos obligatorios: ${missingFields.join(', ')}` 
    });
  }

  const query = `
    INSERT INTO notificacion (pictograma_id, titulo, fecha_creacion, categoria, grupo_id, fecha_resuelta, miembro_resolutor)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`;
  const values = [
    pictograma_id,
    titulo,
    fecha_creacion,
    categoria,
    grupo_id,
    fecha_resuelta || null,
    miembro_resolutor || null
  ];

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al crear notificación:', err);
      res.status(500).json({ error: 'Error al crear la notificación' });
    } else {
      res.status(201).json(result.rows[0]); // Devuelve la notificación creada
    }
  });
});

//-------------------------------------------------

//ENDPOINT PARA MODIFICAR (PUT) UNA NOTIFICACION EXISTENTE:

router.put('/:id', (req, res) => {
  const notificacionId = req.params.id;
  const { pictograma_id, contenido, estado, fecha_hora, tipo, grupo_id } = req.body;

  if (!contenido || !estado || !fecha_hora || !tipo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para actualizar' });
  }

  const query = `
    UPDATE notificacion
    SET pictograma_id = $1,
        contenido = $2,
        estado = $3,
        fecha_hora = $4,
        tipo = $5,
        grupo_id = $6
    WHERE id = $7
    RETURNING *`;
  const values = [
    pictograma_id || null,
    contenido,
    estado,
    fecha_hora,
    tipo,
    grupo_id || null,
    notificacionId
  ];

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar notificación:', err);
      res.status(500).json({ error: 'Error al actualizar la notificación' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Notificación no encontrada' });
    } else {
      res.json(result.rows[0]);
    }
  });
});

//ENDPOINT PARA ELIMINAR (DELETE) UNA NOTIFICACION EXISTENTE:
//(se elimina por ID)

router.delete('/:id', (req, res) => {
  const notificacionId = req.params.id;

  const query = 'DELETE FROM notificacion WHERE id = $1 RETURNING *';
  const values = [notificacionId];

  pool.query(query, values, (err, result) => {
    if (err) {
      // Si está relacionada con otra tabla por FK
      if (err.code === '23503') {
        return res.status(409).json({
          error: 'No se puede eliminar la notificación porque está asociada a otros datos.'
        });
      }

      console.error('❌ Error al eliminar notificación:', err);
      return res.status(500).json({ error: 'Error al eliminar la notificación' });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json({
      mensaje: 'Notificación eliminada correctamente',
      notificacion: result.rows[0]
    });
  });
});


