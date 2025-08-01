// Importamos Express, que es el framework para manejar rutas HTTP
const express = require('express');

// Creamos un "router", que es un objeto que nos permite definir endpoints separados
const router = express.Router();

// Importamos la conexión a la base de datos desde el archivo db.js
const pool = require('../db'); // ".." porque subimos un nivel de carpeta

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

  pool.query('SELECT * FROM grupo WHERE id = $1', [grupoId], (err, result) => {
    if (err) {
      console.error('❌ Error al consultar el grupo:', err);
      res.status(500).json({ error: 'Error al obtener el grupo' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Grupo no encontrado' });
    } else {
      res.json(result.rows[0]); // Devuelve el grupo encontrado
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

  if (!creador_id || !nombre_paciente) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
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

  if (!codigo_vinculacion || !creador_id || !nombre_paciente) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para actualizar el grupo' });
  }

  const query = `
    UPDATE grupo
    SET codigo_vinculacion = $1,
        creador_id = $2,
        nombre_paciente = $3
    WHERE id = $4
    RETURNING *`;
  const values = [codigo_vinculacion, creador_id, nombre_paciente, grupoId];

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
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT codigo_vinculacion FROM grupo WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Grupo no encontrado' });
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

  if (!auxiliar_id) {
    return res.status(400).json({ error: 'Falta el id del auxiliar a vincular' });
  }

  try {
    // Obtener la fecha actual en UTC-3 (Argentina)
    const fechaVinculacion = new Date(Date.now() - 3 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    // Insertar en auxiliar_grupo con los valores adicionales
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