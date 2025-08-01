const express = require('express');
const app = express();

// Esto permite que el backend entienda JSON en los pedidos
app.use(express.json());

// Ruta base para probar que funciona
app.get('/', (req, res) => {
  res.send('¡La API de Tap-Talk está funcionando!');
});

// Puerto donde se ejecuta la API
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

// Conectamos la ruta /api con los archivos correspondientes (grupos, pictogramas, notificaciones, auxiliares)
const gruposRoutes = require('./routes/grupos');
app.use('/api/grupos', gruposRoutes);

const auxiliaresRoutes = require('./routes/auxiliares');
app.use('/api/auxiliares', auxiliaresRoutes);

const categoriasRoutes = require('./routes/categorias');
app.use('/api/categorias', categoriasRoutes);

const notificacionesRoutes = require('./routes/notificaciones');
app.use('/api/notificaciones', notificacionesRoutes);

const pictogramasRoutes = require('./routes/pictogramas');
app.use('/api/pictogramas', pictogramasRoutes);

const auxiliarGrupoRoutes = require('./routes/auxiliares_grupos');
app.use('/api/auxiliares-grupos', auxiliarGrupoRoutes);
