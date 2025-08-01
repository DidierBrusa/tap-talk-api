// Importamos Express, que es el framework para manejar rutas HTTP
const express = require('express');

// Creamos un "router", que es un objeto que nos permite definir endpoints separados
const router = express.Router();

// Importamos la conexión a la base de datos desde el archivo db.js
const pool = require('../db'); // ".." porque subimos un nivel de carpeta

// ----------------------------------------------

//ENDPOINT "LISTAR TODO" (GET):

router.get('/', (req, res) => {
  pool.query('SELECT * FROM pictograma', (err, result) => {
    if (err) {
      console.error('❌ Error al obtener pictogramas:', err);
      res.status(500).json({ error: 'Error al obtener pictogramas' });
    } else {
      res.json(result.rows);
    }
  });
});

module.exports = router;

// --------------------------------------------

//ENDPOINT "LISTAR SEGUN ID" (GET):

router.get('/:id', (req, res) => {
  const pictogramaId = req.params.id;

  pool.query('SELECT * FROM pictograma WHERE id = $1', [pictogramaId], (err, result) => {
    if (err) {
      console.error('❌ Error al buscar pictograma:', err);
      res.status(500).json({ error: 'Error al buscar pictograma' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Pictograma no encontrado' });
    } else {
      res.json(result.rows[0]);
    }
  });
});

// --------------------------------------------

//ENDPOINT PARA "CREAR O AGREGAR" (POST):

router.post('/', (req, res) => {
  const { nombre, imagen, categoria_id } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El campo "nombre" es obligatorio' });
  }

  const query = `
    INSERT INTO pictograma (nombre, imagen, categoria_id)
    VALUES ($1, $2, $3)
    RETURNING *`;
  const values = [nombre, imagen || null, categoria_id || null];

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al crear pictograma:', err);
      res.status(500).json({ error: 'Error al crear el pictograma' });
    } else {
      res.status(201).json(result.rows[0]);
    }
  });
});

//-------------------------------------------------

//ENDPOINT PARA MODIFICAR (PUT) UN PICTOGRAMA EXISTENTE:

router.put('/:id', (req, res) => {
  const pictogramaId = req.params.id;
  const { nombre, imagen, categoria_id } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El campo "nombre" es obligatorio para actualizar' });
  }

  const query = `
    UPDATE pictograma
    SET nombre = $1,
        imagen = $2,
        categoria_id = $3
    WHERE id = $4
    RETURNING *`;
  const values = [nombre, imagen || null, categoria_id || null, pictogramaId];

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar pictograma:', err);
      res.status(500).json({ error: 'Error al actualizar el pictograma' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Pictograma no encontrado' });
    } else {
      res.json(result.rows[0]);
    }
  });
});

//ENDPOINT PARA ELIMINAR (DELETE) UN PICTOGRAMA EXISTENTE:
//(se elimina por ID)

router.delete('/:id', (req, res) => {
  const pictogramaId = req.params.id;

  const query = 'DELETE FROM pictograma WHERE id = $1 RETURNING *';
  const values = [pictogramaId];

  pool.query(query, values, (err, result) => {
    if (err) {
      // Error por clave foránea (por ejemplo, si está en una notificación)
      if (err.code === '23503') {
        return res.status(409).json({
          error: 'No se puede eliminar el pictograma porque está vinculado a otros datos.'
        });
      }

      console.error('❌ Error al eliminar pictograma:', err);
      return res.status(500).json({ error: 'Error al eliminar el pictograma' });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pictograma no encontrado' });
    }

    res.json({
      mensaje: 'Pictograma eliminado correctamente',
      pictograma: result.rows[0]
    });
  });
});

