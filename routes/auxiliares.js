const express = require('express');
const router = express.Router();
const { pool } = require('../db');

//ENDPOINT "LISTAR TODO" (GET):
// Soporta filtro por user_id via query params
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (user_id) {
      // Buscar por user_id (UUID)
      const result = await pool.query('SELECT * FROM auxiliar WHERE user_id = $1', [user_id]);
      return res.json(result.rows);
    }
    
    // Listar todos
    const result = await pool.query('SELECT * FROM auxiliar');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener auxiliares:', err);
    res.status(500).json({ error: 'Error al obtener auxiliares' });
  }
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
  const { user_id, email, nombre } = req.body;

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'Se requiere user_id válido de Supabase' });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Se requiere email válido' });
  }

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return res.status(400).json({ error: 'Se requiere nombre válido' });
  }

  const query = `
    INSERT INTO auxiliar (user_id, email, nombre)
    VALUES ($1, $2, $3)
    RETURNING *`;

  pool.query(query, [user_id, email, nombre], (err, result) => {
    if (err) {
      console.error('❌ Error al crear auxiliar:', err);
      if (err.code === '23505' && err.constraint === 'auxiliar_user_id_key') {
        res.status(400).json({ error: 'Ya existe un auxiliar con ese user_id' });
      } else if (err.code === '23505' && err.constraint === 'auxiliar_email_key') {
        res.status(400).json({ error: 'Ya existe un auxiliar con ese email' });
      } else {
        res.status(500).json({ error: 'Error al crear el auxiliar' });
      }
    } else {
      res.status(201).json(result.rows[0]);
    }
  });
});

// --------------------------------------------

//ENDPOINT "OBTENER POR USER_ID DE SUPABASE" (GET):
// Verificar si existe un email
router.get('/check-email/:email', async (req, res) => {
  const email = req.params.email;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  try {
    const result = await pool.query('SELECT id FROM auxiliar WHERE email = $1', [email]);
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error('❌ Error al verificar email:', err);
    res.status(500).json({ error: 'Error al verificar email' });
  }
});

// Obtener perfil completo por user_id de Supabase
router.get('/auth/:user_id', (req, res) => {
  const userId = req.params.user_id;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Se requiere user_id válido' });
  }

  const query = `
    SELECT 
      a.*,
      json_build_object(
        'grupos_creados', (
          SELECT COUNT(*) 
          FROM grupo g 
          WHERE g.creador_id = a.id AND g.activo = true
        ),
        'grupos_miembro', (
          SELECT COUNT(*) 
          FROM auxiliar_grupo ag 
          WHERE ag.auxiliar_id = a.id AND ag.activo = true
        ),
        'grupos', (
          SELECT json_agg(json_build_object(
            'id', g.id,
            'nombre_paciente', g.nombre_paciente,
            'es_creador', ag.es_creador,
            'es_administrador', ag.es_administrador,
            'fecha_vinculacion', ag.fecha_vinculacion
          ))
          FROM auxiliar_grupo ag
          JOIN grupo g ON g.id = ag.grupo_id
          WHERE ag.auxiliar_id = a.id 
          AND ag.activo = true 
          AND g.activo = true
        ),
        'notificaciones_pendientes', (
          SELECT COUNT(*) 
          FROM auxiliar_grupo ag
          JOIN grupo g ON g.id = ag.grupo_id
          JOIN notificacion n ON n.grupo_id = g.id
          WHERE ag.auxiliar_id = a.id 
          AND n.estado = 'PENDIENTE' 
          AND n.activo = true
        )
      ) as estadisticas
    FROM auxiliar a
    WHERE a.user_id = $1 AND a.activo = true`;

  pool.query(query, [userId], (err, result) => {
    if (err) {
      console.error('❌ Error al buscar auxiliar por user_id:', err);
      res.status(500).json({ error: 'Error al buscar auxiliar' });
    } else if (result.rows.length === 0) {
      res.status(404).json({ error: 'Auxiliar no encontrado' });
    } else {
      const auxiliar = result.rows[0];
      // Si grupos es null, convertirlo en array vacío
      if (auxiliar.estadisticas.grupos === null) {
        auxiliar.estadisticas.grupos = [];
      }
      res.json(auxiliar);
    }
  });
});

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
