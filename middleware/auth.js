const { supabase } = require('../db');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        let token = null;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token no proporcionado'
            });
        }

        // Verificar el token con Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: 'Token inválido o expirado'
            });
        }

        // Agregar la información del usuario a la request
        req.user = user;
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