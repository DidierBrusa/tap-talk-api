const express = require('express');
const router = express.Router();
const { supabase } = require('../db');

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Obtener datos adicionales del usuario
        const { data: userData, error: userError } = await supabase
            .from('auxiliar')
            .select('*')
            .eq('user_id', data.user.id)
            .single();

        if (userError) throw userError;

        res.json({
            success: true,
            user: {
                user_id: data.user.id,
                email: userData.email,
                nombre: userData.nombre,
                activo: userData.activo,
                fechaCreacion: userData.fecha_creacion
            },
            session: data.session
        });
    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Registro
router.post('/register', async (req, res) => {
    try {
        console.log('DEBUG - API: Recibida solicitud de registro');
        console.log('DEBUG - API: Body recibido:', req.body);
        
        const { email, password, nombre } = req.body;
        
        console.log('DEBUG - API: Datos extraídos:', { email, nombre }); // No loggeamos el password por seguridad
        
        // Crear usuario en Supabase Auth
        console.log('DEBUG - API: Intentando crear usuario en Supabase');
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) {
            console.log('DEBUG - API: Error en Supabase Auth:', authError);
            throw authError;
        }
        
        console.log('DEBUG - API: Usuario creado en Supabase Auth:', authData.user.id);

        // Crear registro en la tabla auxiliar
        console.log('DEBUG - API: Intentando crear registro en tabla auxiliar');
        const { data: userData, error: userError } = await supabase
            .from('auxiliar')
            .insert([{
                user_id: authData.user.id,
                email,
                nombre,
                activo: true,
                fecha_creacion: new Date().toISOString()
            }])
            .select()
            .single();

        if (userError) throw userError;

        res.json({
            success: true,
            user: {
                user_id: authData.user.id,
                email,
                nombre,
                activo: true,
                fechaCreacion: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error en registro:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        res.json({
            success: true,
            message: 'Sesión cerrada correctamente'
        });
    } catch (error) {
        console.error('Error en logout:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Verificar sesión actual
router.get('/session', async (req, res) => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (!session) {
            return res.json({
                success: true,
                session: null
            });
        }

        // Obtener datos adicionales del usuario
        const { data: userData, error: userError } = await supabase
            .from('auxiliar')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (userError) throw userError;

        res.json({
            success: true,
            user: {
                user_id: session.user.id,
                email: userData.email,
                nombre: userData.nombre,
                activo: userData.activo,
                fechaCreacion: userData.fecha_creacion
            },
            session
        });
    } catch (error) {
        console.error('Error verificando sesión:', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;