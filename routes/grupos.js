const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ----------------------------------------------

//ENDPOINT "LISTAR TODO" (GET):
router.get('/', function (req, res) {
  // Ejecutamos una consulta SQL que selecciona todos los registros de la tabla "grupo"
  pool.query('SELECT * FROM grupo', (err, result) => {
    // Si hubo un error con la base de datos, lo mostramos y devolvemos un código de error 500
    if (err) {
      console.error('❌ Error al obtener grupos:', err);
      res.status(500).json({ error: 'Error al obtener los grupos' });

    // Si todo salió bien, devolvemos los datos en formato JSON
    } else {
      res.json(result.rows); // .rows contiene un array con todos los registros
    }
  });
});
// Exportamos el router para que pueda ser usado desde index.js
module.exports = router;

// --------------------------------------------

//ENDPOINT "LISTAR SEGUN ID" (GET):
router.get('/:id', function (req, res) {
  const grupoId = req.params.id; // Extrae el id de la URL
  if (!Number.isInteger(parseInt(grupoId)) || grupoId <= 0) {
    return res.status(400).json({ error: 'ID de grupo inválido' });
  }

  const query = `
    SELECT 
      g.*,
      json_agg(json_build_object(
        'id', a.id,
        'nombre', a.nombre,
        'email', a.email,
        'es_administrador', ag.es_administrador,
        'es_creador', ag.es_creador,
        'fecha_vinculacion', ag.fecha_vinculacion
      )) as miembros
    FROM grupo g
    LEFT JOIN auxiliar_grupo ag ON g.id = ag.grupo_id
    LEFT JOIN auxiliar a ON ag.auxiliar_id = a.id
    WHERE g.id = $1
    GROUP BY g.id`;

  pool.query(query, [grupoId], (err, result) => {
    if (err) {
      console.error('❌ Error al consultar el grupo:', err);
      res.status(500).json({ error: 'Error al obtener el grupo' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado' });
    } else {
      // Si no hay miembros, convertir null a array vacío
      const grupo = result.rows[0];
      if (grupo.miembros[0] === null) {
        grupo.miembros = [];
      }
      res.json(grupo); // Devuelve el grupo con sus miembros
    }
  });
});

// --------------------------------------------

//ENDPOINT PARA "CREAR O AGREGAR" (POST):

router.post('/', function (req, res) {
  const { creador_id, nombre_paciente } = req.body;

  // Generar código de 16 caracteres alfanuméricos
  function generarCodigoVinculacion() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let codigo = '';
    for (let i = 0; i < 16; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
  }

  const codigo_vinculacion = generarCodigoVinculacion();

  // creador_id ahora es un UUID (VARCHAR) que referencia auxiliar.user_id
  if (!creador_id || typeof creador_id !== 'string') {
    return res.status(400).json({ error: 'El ID del creador es requerido y debe ser un UUID' });
  }

  if (!nombre_paciente || typeof nombre_paciente !== 'string' || nombre_paciente.trim().length === 0) {
    return res.status(400).json({ error: 'El nombre del paciente es requerido y debe ser texto' });
  }

  const query = `
    INSERT INTO grupo (codigo_vinculacion, creador_id, nombre_paciente)
    VALUES ($1, $2, $3)
    RETURNING *`;
  const values = [codigo_vinculacion, creador_id, nombre_paciente];

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al crear grupo:', err);
      res.status(500).json({ error: 'Error al crear el grupo' });
    } else {
      res.status(201).json(result.rows[0]);
    }
  });
});

//-------------------------------------------------

//ENDPOINT PARA MODIFICAR (PUT) UN GRUPO EXISTENTE:

router.put('/:id', function (req, res) {
  const grupoId = req.params.id;
  const { codigo_vinculacion, creador_id, nombre_paciente } = req.body;

  if (!Number.isInteger(parseInt(grupoId)) || grupoId <= 0) {
    return res.status(400).json({ error: 'ID de grupo inválido' });
  }

  if (!codigo_vinculacion || typeof codigo_vinculacion !== 'string' || codigo_vinculacion.length !== 16 || !/^[A-Za-z0-9]+$/.test(codigo_vinculacion)) {
    return res.status(400).json({ error: 'Código de vinculación debe ser alfanumérico de 16 caracteres' });
  }

  if (!creador_id || typeof creador_id !== 'number' || !Number.isInteger(creador_id) || creador_id <= 0) {
    return res.status(400).json({ error: 'ID del creador debe ser un número entero positivo' });
  }

  if (!nombre_paciente || typeof nombre_paciente !== 'string' || nombre_paciente.trim().length < 2 || nombre_paciente.trim().length > 100) {
    return res.status(400).json({ error: 'Nombre del paciente debe tener entre 2 y 100 caracteres' });
  }

  const query = `
    UPDATE grupo 
    SET codigo_vinculacion = $1,
        creador_id = $2,
        nombre_paciente = $3
    WHERE id = $4
    RETURNING *`;
  const values = [codigo_vinculacion, creador_id, nombre_paciente.trim(), grupoId];

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar el grupo:', err);
      res.status(500).json({ error: 'Error al actualizar el grupo' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado' });
    } else {
      res.json(result.rows[0]);
    }
  });
});

//-----------------------------------------------------

//ENDPOINT PARA ELIMINAR (DELETE) UN GRUPO EXISTENTE:
//(se elimina por ID)

router.delete('/:id', function (req, res) {
  const grupoId = req.params.id;

  const query = 'DELETE FROM grupo WHERE id = $1 RETURNING *';
  const values = [grupoId];
  if (!Number.isInteger(parseInt(grupoId)) || grupoId <= 0) {
    return res.status(400).json({ error: 'ID de grupo inválido' });
  }

  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('❌ Error al eliminar el grupo:', err);
      res.status(500).json({ error: 'Error al eliminar el grupo' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado' });
    } else {
      res.json({ mensaje: 'Grupo eliminado exitosamente', grupo: result.rows[0] });
    }
  });
});

// GET /api/grupos/:id/codigo-vinculacion → Obtener código de vinculacion de un grupo

router.get('/:id/codigo-vinculacion', async (req, res) => {
  const id = req.params.id;

  if (!Number.isInteger(parseInt(id)) || id <= 0) {
    return res.status(400).json({ error: 'ID de grupo inválido' });
  }

  try {
    const result = await pool.query(
      'SELECT codigo_vinculacion FROM grupo WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    if (!result.rows[0].codigo_vinculacion) {
      return res.status(404).json({ error: 'Código de vinculación no encontrado' });
    }

    res.json({ codigo_vinculacion: result.rows[0].codigo_vinculacion });
  } catch (error) {
    console.error('Error al obtener el código de vinculacion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// GET /api/grupos/codigo/:codigo_vinculacion → Obtener grupo por código de vinculación
router.get('/codigo/:codigo_vinculacion', async (req, res) => {
  const { codigo_vinculacion } = req.params;

  if (!codigo_vinculacion || typeof codigo_vinculacion !== 'string' || codigo_vinculacion.length !== 16 || !/^[A-Za-z0-9]+$/.test(codigo_vinculacion)) {
    return res.status(400).json({ error: 'Código de vinculación debe ser alfanumérico de 16 caracteres' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM grupo WHERE codigo_vinculacion = $1',
      [codigo_vinculacion]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado con ese código de vinculación' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener grupo por código de vinculación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// POST /api/grupos/:id/vincular-miembro → Asociar un nuevo miembro a un grupo
router.post('/:id/vincular-auxiliar', async (req, res) => {
  const grupoId = req.params.id;
  const { auxiliar_id } = req.body;

  if (!Number.isInteger(parseInt(grupoId)) || grupoId <= 0) {
    return res.status(400).json({ error: 'ID de grupo inválido' });
  }

  if (!auxiliar_id || !Number.isInteger(parseInt(auxiliar_id)) || auxiliar_id <= 0) {
    return res.status(400).json({ error: 'ID de auxiliar inválido' });
  }

  try {
    const grupoExiste = await pool.query(
      'SELECT id, creador_id FROM grupo WHERE id = $1', 
      [grupoId]
    );
    
    if (grupoExiste.rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    if (grupoExiste.rows[0].creador_id === auxiliar_id) {
      return res.status(400).json({ error: 'El creador del grupo no puede ser vinculado como auxiliar' });
    }

    const auxiliarExiste = await pool.query(
      'SELECT id, rol FROM usuario WHERE id = $1', 
      [auxiliar_id]
    );
    
    if (auxiliarExiste.rows.length === 0) {
      return res.status(404).json({ error: 'Auxiliar no encontrado' });
    }

    if (auxiliarExiste.rows[0].rol !== 'auxiliar') {
      return res.status(400).json({ error: 'El usuario debe tener rol de auxiliar' });
    }

    const vinculacionExistente = await pool.query(
      'SELECT id FROM auxiliar_grupo WHERE grupo_id = $1 AND auxiliar_id = $2',
      [grupoId, auxiliar_id]
    );

    if (vinculacionExistente.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una vinculación entre el auxiliar y el grupo' });
    }

    const fechaVinculacion = new Date(Date.now() - 3 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    const result = await pool.query(
      `INSERT INTO auxiliar_grupo 
        (grupo_id, auxiliar_id, es_administrador, es_creador, fecha_vinculacion) 
       VALUES ($1, $2, false, false, $3) 
       RETURNING *`,
      [grupoId, auxiliar_id, fechaVinculacion]
    );

    res.status(201).json({ mensaje: 'Auxiliar vinculado exitosamente', vinculo: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      // Error de clave duplicada (ya existe la vinculación)
      return res.status(409).json({ error: 'Ya existe una vinculación entre el auxiliar y el grupo' });
    }
    console.error('Error al vincular auxiliar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});