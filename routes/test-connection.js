const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
    try {
        // Intenta una consulta simple
        const result = await pool.query('SELECT NOW()');
        res.json({
            success: true,
            message: 'Conexión exitosa a Supabase',
            timestamp: result.rows[0].now,
            database: {
                host: process.env.PGHOST,
                database: process.env.PGDATABASE,
                user: process.env.PGUSER
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error conectando a Supabase',
            error: error.message,
            database: {
                host: process.env.PGHOST,
                database: process.env.PGDATABASE,
                user: process.env.PGUSER
            }
        });
    }
});

module.exports = router;