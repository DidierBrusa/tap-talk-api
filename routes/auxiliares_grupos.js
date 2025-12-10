const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ----------------------------------------------

//ENDPOINT "LISTAR SEGUN ID" (GET) GRUPOS A LOS QUE PERTENECE UN AUXILIAR:
// Acepta tanto el ID entero como el UUID del usuario
// Busca tanto en auxiliar_grupo como en grupos donde es creador

router.get('/:id/grupos', async (req, res) => {
  const auxiliarIdOrUuid = req.params.id;

  try {
    let userUuid;

    // Verificar si es un UUID (contiene guiones)
    if (auxiliarIdOrUuid.includes('-')) {
      // Es un UUID
      userUuid = auxiliarIdOrUuid;
      
      // Verificar que el auxiliar existe
      const auxiliarQuery = 'SELECT user_id FROM auxiliar WHERE user_id = $1';
      const auxiliarResult = await pool.query(auxiliarQuery, [userUuid]);
      
      if (auxiliarResult.rows.length === 0) {
        return res.status(404).json({ error: 'Auxiliar no encontrado' });
      }
    } else {
      // Es un ID entero, obtener el UUID
      if (isNaN(auxiliarIdOrUuid)) {
        return res.status(400).json({ error: 'ID de auxiliar inválido' });
      }
      
      const auxiliarQuery = 'SELECT user_id FROM auxiliar WHERE id = $1';
      const auxiliarResult = await pool.query(auxiliarQuery, [parseInt(auxiliarIdOrUuid)]);
      
      if (auxiliarResult.rows.length === 0) {
        return res.status(404).json({ error: 'Auxiliar no encontrado' });
      }
      
      userUuid = auxiliarResult.rows[0].user_id;
    }

    // Buscar grupos donde el usuario es creador O está en auxiliar_grupo
    const query = `
      SELECT DISTINCT
        g.id,
        g.nombre_paciente,
        g.codigo_vinculacion,
        g.fecha_creacion,
        g.creador_id,
        CASE 
          WHEN g.creador_id = $1 THEN true
          ELSE COALESCE(ag.es_administrador, false)
        END as es_administrador,
        CASE 
          WHEN g.creador_id = $1 THEN true
          ELSE COALESCE(ag.es_creador, false)
        END as es_creador,
        COALESCE(ag.fecha_vinculacion, g.fecha_creacion) as fecha_vinculacion
      FROM grupo g
      LEFT JOIN auxiliar a ON a.user_id = $1
      LEFT JOIN auxiliar_grupo ag ON ag.grupo_id = g.id AND ag.auxiliar_id = a.id
      WHERE g.creador_id = $1 OR ag.auxiliar_id = a.id`;

    const result = await pool.query(query, [userUuid]);
    res.json(result.rows);
    
  } catch (err) {
    console.error('❌ Error al obtener grupos:', err);
    res.status(500).json({ error: 'Error al obtener grupos del auxiliar' });
  }
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
  if (!Number.isInteger(auxiliar_id) || !Number.isInteger(grupo_id) || auxiliar_id <= 0 || grupo_id <= 0) {
    return res.status(400).json({ error: 'Los IDs deben ser números enteros positivos' });
  }

  if (typeof es_administrador !== 'boolean' || typeof es_creador !== 'boolean') {
    return res.status(400).json({ error: 'es_administrador y es_creador deben ser valores booleanos' });
  }

  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(fecha_vinculacion)) {
    return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
  }

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
  if (!Number.isInteger(auxiliar_id) || !Number.isInteger(grupo_id) || auxiliar_id <= 0 || grupo_id <= 0) {
    return res.status(400).json({ error: 'Los IDs deben ser números enteros positivos' });
  }

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

