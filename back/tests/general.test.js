const request = require('supertest');
const app = require('../app');

describe('🏠 Endpoints Generales', () => {
    describe('GET /', () => {
        test('Debe retornar información de la API', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.body).toHaveProperty('message', 'API Backend - Sistema de Autenticación');
            expect(response.body).toHaveProperty('documentation', '/api-docs');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body.endpoints).toHaveProperty('usuarios', '/usuarios');
            expect(response.body.endpoints).toHaveProperty('documentacion', '/api-docs');
        });

        test('Debe retornar content-type JSON', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.headers['content-type']).toMatch(/application\/json/);
        });
    });

    describe('Rutas inexistentes', () => {
        test('Debe retornar 404 para rutas que no existen', async () => {
            const response = await request(app)
                .get('/ruta-inexistente')
                .expect(404);
        });

        test('Debe retornar 404 para métodos no permitidos', async () => {
            const response = await request(app)
                .delete('/')
                .expect(404);
        });
    });

    describe('Documentación Swagger', () => {
        test('La ruta de documentación debe existir', async () => {
            const response = await request(app)
                .get('/api-docs')
                .expect(301);

            // Probar la redirección
            const response2 = await request(app)
                .get('/api-docs/')
                .expect(200);

            expect(response2.text).toContain('Swagger UI');
        });
    });
});
