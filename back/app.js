require('dotenv').config();

const express = require('express')
const cors = require('cors');
const cron = require('node-cron');
const pool = require('./config/DB');
const { specs, swaggerUi } = require('./docs/swagger');

const app = express()
const port = process.env.PORTBACK
app.use(express.json());

app.use(cors(
  {
    origin: ['https://ejemplo.cl', 'http://ejemplo.cl', 'http://localhost', 'http://localhost:5173', 'http://www.ejemplo.cl', 'https://www.ejemplo.cl', 'http://localhost:3000'],
    credentials: true
  }));

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true, // Mantiene el token entre requests
    tryItOutEnabled: true       // Habilita "Try it out"
  },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "API Documentation"
}));


// Rutas
const ejemplos = require('./rutas/Ejemplos/Ejemplos');
const ejemploProtegida = require('./rutas/Ejemplos/EjemploProtegida');

//Usuarios
const usuarios = require('./rutas/Usuario/Login');


app.use('/usuarios', usuarios);



// -------------------- SETUP INICIAL ----------------------

// Función para crear usuario por defecto de forma segura
async function createDefaultUser() {
  try {
    const bcrypt = require('bcrypt');

    // Obtener datos del usuario por defecto desde variables de entorno
    const defaultUser = {
      nombre: process.env.DEFAULT_USER_NAME || 'admin',
      email: process.env.DEFAULT_USER_EMAIL || 'admin@empresa.com',
      password: process.env.DEFAULT_USER_PASSWORD || 'admin123', // Contraseña sin hashear
      rol: process.env.DEFAULT_USER_ROLE || 'admin'
    };

    // Verificar si el usuario ya existe
    const existingUser = await pool.query(
      'SELECT id FROM Usuarios WHERE nombre = $1 OR email = $2',
      [defaultUser.nombre, defaultUser.email]
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ Usuario administrador ya existe');
      return;
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(defaultUser.password, saltRounds);

    // Insertar usuario por defecto
    await pool.query(
      'INSERT INTO Usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4)',
      [defaultUser.nombre, defaultUser.email, hashedPassword, defaultUser.rol]
    );

    console.log('🔐 Usuario administrador creado exitosamente');
    console.log(`   Usuario: ${defaultUser.nombre}`);
    console.log(`   Email: ${defaultUser.email}`);
    console.log(`   Rol: ${defaultUser.rol}`);

  } catch (error) {
    console.error('❌ Error creando usuario por defecto:', error.message);
  }
}

//app.use('/ejemplos', ejemplos);
//app.use('/ejemplos-protegida', ejemploProtegida);

// Función de limpieza de tokens
async function cleanupTokens() {
  try {
    // Usar la función SQL creada en init.sql
    const result = await pool.query('SELECT cleanup_tokens()');
    const deletedCount = result.rows[0].cleanup_tokens;
    console.log(`🧹 Limpieza automática: ${deletedCount} tokens eliminados - ${new Date().toISOString()}`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Error en limpieza automática de tokens:', error.message);
    return 0;
  }
}

// Programar limpieza automática cada día a las 2:00 AM
cron.schedule('0 2 * * *', () => {
  console.log('🕐 Iniciando limpieza programada de tokens...');
  cleanupTokens();
}, {
  timezone: "America/Santiago" // Cambia por tu zona horaria
});

// Limpieza inicial al arrancar el servidor (opcional)
setTimeout(async () => {
  console.log('🚀 Iniciando configuración inicial...');
  await createDefaultUser(); // Crear usuario por defecto
  await cleanupTokens();      // Limpiar tokens
}, 5000); // Espera 5 segundos para que la DB esté lista

app.get('/', (req, res) => {
  res.json({
    message: 'API Backend - Sistema de Autenticación',
    documentation: '/api-docs',
    endpoints: {
      usuarios: '/usuarios',
      documentacion: '/api-docs'
    }
  })
})

app.listen(port, () => {
  console.log(`Ejemplo de Express ${port}`)
  console.log(`🕐 Limpieza automática de tokens programada para las 2:00 AM diariamente`)
})

// Exportar app para tests
module.exports = app;

