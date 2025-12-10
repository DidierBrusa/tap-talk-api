const express = require('express');
const app = express();

// DEBUG - Middleware para loggear todas las peticiones
app.use((req, res, next) => {
  console.log(`DEBUG - API Request: ${req.method} ${req.url}`);
  console.log('DEBUG - API Headers:', req.headers);
  next();
});

// Esto permite que el backend entienda JSON en los pedidos
app.use(express.json());

// Middleware para errores de parsing JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.log('DEBUG - API Error parsing JSON:', err);
    return res.status(400).json({ success: false, error: 'Invalid JSON' });
  }
  next();
});

// Configurar CORS para permitir acceso desde dispositivos en la red local
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Max-Age', '86400'); // 24 horas
    return res.sendStatus(200);
  }
  next();
});

// Rutas de prueba
app.get('/', (req, res) => {
  console.log('DEBUG - API: Ruta base accedida');
  console.log('DEBUG - API: Headers:', req.headers);
  res.send('¡La API de Tap-Talk está funcionando!');
});

app.get('/health', (req, res) => {
  console.log('🏥 Health check endpoint accessed');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Conexión exitosa',
    clientIp: req.ip,
    headers: req.headers
  });
});

// Puerto donde se ejecuta la API
const PORT = process.env.PORT || 3000;
console.log('🔍 DEBUG - process.env.PORT:', process.env.PORT);
console.log('🔍 DEBUG - PORT final:', PORT);

// Conectamos la ruta /api con los archivos correspondientes (grupos, pictogramas, notificaciones, auxiliares)
const gruposRoutes = require('./routes/grupos');
const authRoutes = require('./routes/auth');

app.use('/api/grupos', gruposRoutes);
app.use('/api/auth', authRoutes);

const auxiliaresRoutes = require('./routes/auxiliares');
app.use('/api/auxiliares', auxiliaresRoutes);

const categoriasRoutes = require('./routes/categorias');
app.use('/api/categorias', categoriasRoutes);

const notificacionesRoutes = require('./routes/notificaciones');
app.use('/api/notificaciones', notificacionesRoutes);

const testConnectionRoutes = require('./routes/test-connection');
app.use('/api/test-connection', testConnectionRoutes);

const pictogramasRoutes = require('./routes/pictogramas');
app.use('/api/pictogramas', pictogramasRoutes);

const auxiliarGrupoRoutes = require('./routes/auxiliares_grupos');
app.use('/api/auxiliares-grupos', auxiliarGrupoRoutes);

// Escuchar en todas las interfaces (0.0.0.0)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Servidor iniciado:');
  console.log('------------------------');
  console.log(`Puerto: ${PORT}`);
  console.log('Interfaces: 0.0.0.0 (todas)');
  
  // Mostrar todas las interfaces de red disponibles
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  
  console.log('\n📡 Interfaces de red:');
  console.log('------------------------');
  Object.keys(networkInterfaces).forEach((ifname) => {
    networkInterfaces[ifname].forEach((iface) => {
      if (iface.family === 'IPv4') {
        console.log(`${ifname}: ${iface.address}`);
      }
    });
  });
  
  console.log('\n🌐 URLs de acceso:');
  console.log('------------------------');
  console.log('1. Local/iOS:');
  console.log(`   http://localhost:${PORT}`);
  console.log('2. Android Emulator:');
  console.log(`   http://10.0.2.2:${PORT}`);
  console.log('------------------------\n');
});
