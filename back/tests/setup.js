// Cargar variables de entorno para tests (usando el .env principal)
require('dotenv').config();

// Configuración global para los tests
const { Pool } = require('pg');

// Variables globales para tests
global.testUser = {
    nombre: 'Test User',
    email: 'test@ejemplo.com',
    password: 'password123',
    confirmPass: 'password123'
};

global.testUserLogin = {
    email: 'test@ejemplo.com',
    password: 'password123'
};

// Mock de console para evitar logs en tests (opcional)
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Configuración de timeout para tests
jest.setTimeout(15000);

// Helper para generar tokens de prueba
global.generateTestToken = (payload) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(payload, process.env.JWT_SECRET || 'test_secret');
};

// Helper para crear headers con autorización
global.authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
});

// Cleanup function para cerrar conexiones
afterAll(async () => {
    // Cerrar conexiones de base de datos si están abiertas
    try {
        const pool = require('../config/DB');
        if (pool && pool.end) {
            await pool.end();
        }
    } catch (error) {
        console.log('Error cerrando pool de DB:', error.message);
    }
});

console.log('🧪 Tests setup configurado con variables de entorno:', {
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET ? '✓ Configurado' : '✗ Faltante',
    POSTGRES_DB: process.env.POSTGRES_DB
});
