const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

// ----------------------------------------------

//ENDPOINT "LISTAR TODO" (GET):
// Sin authMiddleware porque lo usa el Usuario Asistido (sin cuenta)
router.get('/', (req, res) => {
  pool.query('SELECT * FROM categoria', (err, result) => {
    if (err) {
      console.error('❌ Error al obtener categorías:', err);
      res.status(500).json({ error: 'Error al obtener categorías' });
    } else {
      res.json(result.rows);
    }
  });
});

module.exports = router;

// --------------------------------------------

//ENDPOINT "LISTAR SEGUN ID" (GET):

router.get('/:id', (req, res) => {
  const categoriaId = req.params.id;
  if (!Number.isInteger(parseInt(categoriaId)) || parseInt(categoriaId) <= 0) {
    return res.status(400).json({ error: 'El ID debe ser un número entero positivo' });
  }

  pool.query('SELECT * FROM categoria WHERE id = $1', [categoriaId], (err, result) => {
    if (err) {
      console.error('❌ Error al buscar categoría:', err);
      res.status(500).json({ error: 'Error al buscar categoría' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Categoría no encontrada' });
    } else {
      res.json(result.rows[0]); // Devuelve la categoría encontrada
    }
  });
});

// --------------------------------------------

//ENDPOINT PARA "CREAR O AGREGAR" (POST):

router.post('/', (req, res) => {
  const { nombre, imagen } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El campo "nombre" es obligatorio' });
  }

  const query = `
    INSERT INTO categoria (nombre, imagen)
    VALUES ($1, $2)
    RETURNING *`;
  const values = [nombre, imagen || null];

  if (nombre.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre no puede estar vacío' });
  }
  if (nombre.length > 100) {
    return res.status(400).json({ error: 'El nombre no puede exceder 100 caracteres' });
  }

  if (imagen && typeof imagen !== 'string') {
    return res.status(400).json({ error: 'La imagen debe ser una URL válida' });
  }
  if (imagen && imagen.length > 255) {
    return res.status(400).json({ error: 'La URL de la imagen es demasiado larga' });
  }

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al crear categoría:', err);
      res.status(500).json({ error: 'Error al crear la categoría' });
    } else {
      res.status(201).json(result.rows[0]); // Devuelve la categoría creada
    }
  });
});

//-------------------------------------------------

//ENDPOINT PARA MODIFICAR (PUT) UNA CATEGORIA EXISTENTE:

router.put('/:id', (req, res) => {
  const categoriaId = req.params.id;
  const { nombre, imagen } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El campo "nombre" es obligatorio para actualizar' });
  }

  const query = `
    UPDATE categoria
    SET nombre = $1,
        imagen = $2
    WHERE id = $3
    RETURNING *`;
  const values = [nombre, imagen || null, categoriaId];
  if (!Number.isInteger(parseInt(categoriaId)) || parseInt(categoriaId) <= 0) {
    return res.status(400).json({ error: 'El ID debe ser un número entero positivo' });
  }

  if (nombre.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre no puede estar vacío' });
  }

  if (nombre.length > 100) {
    return res.status(400).json({ error: 'El nombre no puede exceder 100 caracteres' });
  }

  if (imagen && typeof imagen !== 'string') {
    return res.status(400).json({ error: 'La imagen debe ser una URL válida' });
  }

  if (imagen && imagen.length > 255) {
    return res.status(400).json({ error: 'La URL de la imagen es demasiado larga' });
  }

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar categoría:', err);
      res.status(500).json({ error: 'Error al actualizar la categoría' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Categoría no encontrada' });
    } else {
      res.json(result.rows[0]); // Devuelve la categoría actualizada
    }
  });
});


//ENDPOINT PARA ELIMINAR (DELETE) UNA CATEGORIA EXISTENTE:
//(se elimina por ID)

router.delete('/:id', (req, res) => {
  const categoriaId = req.params.id;

  const query = 'DELETE FROM categoria WHERE id = $1 RETURNING *';
  const values = [categoriaId];
  if (!Number.isInteger(parseInt(categoriaId)) || parseInt(categoriaId) <= 0) {
    return res.status(400).json({ error: 'El ID debe ser un número entero positivo' });
  }

  pool.query(query, values, (err, result) => {
    if (err) {
      // Error por clave foránea (por ejemplo, si hay pictogramas asociados)
      if (err.code === '23503') {
        return res.status(409).json({
          error: 'No se puede eliminar la categoría porque está asociada a otros datos.'
        });
      }

      console.error('❌ Error al eliminar categoría:', err);
      return res.status(500).json({ error: 'Error al eliminar la categoría' });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({
      mensaje: 'Categoría eliminada correctamente',
      categoria: result.rows[0]
    });
  });
});
