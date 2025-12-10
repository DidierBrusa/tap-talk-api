const express = require('express');
const app = express();

// Puerto donde se ejecuta la API (definir temprano)
const PORT = process.env.PORT || 3000;
console.log('🔍 DEBUG - process.env.PORT:', process.env.PORT);
console.log('🔍 DEBUG - PORT final:', PORT);

// DEBUG - Middleware para loggear todas las peticiones
app.use((req, res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
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
  console.log('✅ Ruta base accedida');
  res.send('¡La API de Tap-Talk está funcionando!');
});

app.get('/health', (req, res) => {
  console.log('🏥 Health check endpoint accessed at /health');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  console.log('🏥 Health check endpoint accessed at /api/health');
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

// Catch-all para rutas no encontradas (debe ir al final, antes de listen)
app.use('*', (req, res) => {
  console.log(`⚠️ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

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
  console.log('✅ Servidor listo para recibir peticiones');
  
  // Self-ping para confirmar que el servidor responde
  setTimeout(() => {
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/health',
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      console.log('✅ Self-check exitoso - servidor respondiendo correctamente');
    });
    
    req.on('error', (e) => {
      console.error('❌ Self-check falló:', e.message);
    });
    
    req.end();
  }, 1000);
});

// Configurar timeouts y keepalive
server.keepAliveTimeout = 65000; // 65 segundos
server.headersTimeout = 66000; // 66 segundos

// Log cuando el servidor cierra
server.on('close', () => {
  console.log('❌ Servidor cerrado');
});

// Manejar errores del servidor
server.on('error', (err) => {
  console.error('❌ Error en el servidor:', err);
});
