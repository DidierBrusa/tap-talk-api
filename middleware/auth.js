const { supabase } = require('../db');

const authMiddleware = async (req, res, next) => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            throw error;
        }

        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Usuario no autenticado API'
            });
        }

        // Agregar la información del usuario a la request
        req.user = session.user;
        next();
    } catch (error) {
        console.error('Error de autenticación:', error.message);
        res.status(401).json({
            success: false,
            error: 'Error de autenticación'
        });
    }
};

module.exports = authMiddleware;