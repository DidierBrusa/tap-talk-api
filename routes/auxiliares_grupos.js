// Importamos Express, que es el framework para manejar rutas HTTP
const express = require('express');

// Creamos un "router", que es un objeto que nos permite definir endpoints separados
const router = express.Router();

// Importamos la conexión a la base de datos desde el archivo db.js
const pool = require('../db'); // ".." porque subimos un nivel de carpeta

// ----------------------------------------------

//ENDPOINT "LISTAR SEGUN ID" (GET) GRUPOS A LOS QUE PERTENECE UN AUXILIAR:

router.get('/auxiliares/:id/grupos', (req, res) => {
  const auxiliarId = req.params.id;

  const query = `
    SELECT
      grupo.id AS grupo_id,
      grupo.nombre_paciente,
      ag.es_administrador,
      ag.es_creador,
      ag.fecha_vinculacion
    FROM auxiliar_grupo ag
    JOIN grupo ON ag.grupo_id = grupo.id
    WHERE ag.auxiliar_id = $1`;

  pool.query(query, [auxiliarId], (err, result) => {
    if (err) {
      console.error('❌ Error al obtener grupos:', err);
      return res.status(500).json({ error: 'Error al obtener grupos del auxiliar' });
    }

    res.json(result.rows);
  });
});

module.exports = router;

// --------------------------------------------

//ENDPOINT PARA "CREAR O AGREGAR" (POST), VINCULAR AUXILIAR CON GRUPO:

router.post('/', (req, res) => {
  const { auxiliar_id, grupo_id, es_administrador, es_creador, fecha_vinculacion } = req.body;

  if (
    auxiliar_id === undefined ||
    grupo_id === undefined ||
    es_administrador === undefined ||
    es_creador === undefined ||
    !fecha_vinculacion
  ) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const query = `
    INSERT INTO auxiliar_grupo (
      auxiliar_id, grupo_id, es_administrador, es_creador, fecha_vinculacion
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`;

  const values = [auxiliar_id, grupo_id, es_administrador, es_creador, fecha_vinculacion];

  pool.query(query, values, (err, result) => {
    if (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'La relación ya existe.' });
      }

      console.error('❌ Error al crear relación:', err);
      return res.status(500).json({ error: 'Error al crear la relación auxiliar-grupo' });
    }

    res.status(201).json(result.rows[0]);
  });
});

// --------------------------------------------

//ELIMINAR VINCULO ENTRE AUXILIAR Y GRUPO

router.delete('/', (req, res) => {
  const { auxiliar_id, grupo_id } = req.body;

  if (!auxiliar_id || !grupo_id) {
    return res.status(400).json({ error: 'Se requiere auxiliar_id y grupo_id' });
  }

  const query = `
    DELETE FROM auxiliar_grupo
    WHERE auxiliar_id = $1 AND grupo_id = $2
    RETURNING *`;

  pool.query(query, [auxiliar_id, grupo_id], (err, result) => {
    if (err) {
      console.error('❌ Error al eliminar relación:', err);
      return res.status(500).json({ error: 'Error al eliminar la relación auxiliar-grupo' });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relación no encontrada' });
    }

    res.json({
      mensaje: 'Relación eliminada correctamente',
      relacion_eliminada: result.rows[0]
    });
  });
});

// --------------------------------------------

//ENDPOINT PARA VER QUE AUXILIARES QUE PERTENECEN A UN GRUPO (GET):

router.get('/grupos/:id/auxiliares', (req, res) => {
  const grupoId = req.params.id;

  const query = `
    SELECT
      a.id AS auxiliar_id,
      a.nombre,
      a.email,
      ag.es_administrador,
      ag.es_creador,
      ag.fecha_vinculacion
    FROM auxiliar_grupo ag
    JOIN auxiliar a ON ag.auxiliar_id = a.id
    WHERE ag.grupo_id = $1
  `;

  pool.query(query, [grupoId], (err, result) => {
    if (err) {
      console.error('❌ Error al obtener auxiliares del grupo:', err);
      return res.status(500).json({ error: 'Error al obtener auxiliares del grupo' });
    }

    res.json(result.rows);
  });
});

