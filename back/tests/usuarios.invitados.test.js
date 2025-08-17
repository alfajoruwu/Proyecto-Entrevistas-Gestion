const request = require('supertest');
const app = require('../app');

describe('🔓 Usuarios Invitados', () => {
    let invitadoData;

    describe('POST /usuarios/invitado', () => {
        test('Debe crear un usuario invitado exitosamente', async () => {
            const response = await request(app)
                .post('/usuarios/invitado')
                .expect(200);

            expect(response.body).toHaveProperty('invitadoId');
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body.invitadoId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            expect(typeof response.body.accessToken).toBe('string');

            // Guardar datos para otros tests
            invitadoData = response.body;
        });

        test('Debe generar UUID únicos para cada invitado', async () => {
            const response1 = await request(app)
                .post('/usuarios/invitado')
                .expect(200);

            const response2 = await request(app)
                .post('/usuarios/invitado')
                .expect(200);

            expect(response1.body.invitadoId).not.toBe(response2.body.invitadoId);
            expect(response1.body.accessToken).not.toBe(response2.body.accessToken);
        });
    });

    describe('Validación de token de invitado', () => {
        test('El token de invitado debe contener la información correcta', async () => {
            const jwt = require('jsonwebtoken');

            if (!invitadoData) {
                const response = await request(app).post('/usuarios/invitado');
                invitadoData = response.body;
            }

            const decoded = jwt.verify(invitadoData.accessToken, process.env.JWT_SECRET);

            expect(decoded).toHaveProperty('invitadoId', invitadoData.invitadoId);
            expect(decoded).toHaveProperty('rol', 'invitado');
            expect(decoded).toHaveProperty('tipo', 'guest');
            expect(decoded).toHaveProperty('jti');
        });

        test('El token de invitado no debe tener expiración', async () => {
            const jwt = require('jsonwebtoken');

            if (!invitadoData) {
                const response = await request(app).post('/usuarios/invitado');
                invitadoData = response.body;
            }

            const decoded = jwt.verify(invitadoData.accessToken, process.env.JWT_SECRET);
            expect(decoded).not.toHaveProperty('exp');
        });
    });
});
