const request = require('supertest');
const app = require('../app');

describe('👤 Usuarios Registrados', () => {
    let userData;
    let loginData;

    describe('POST /usuarios/register', () => {
        test('Debe registrar un usuario exitosamente', async () => {
            const response = await request(app)
                .post('/usuarios/register')
                .send(global.testUser)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Usuario creado correctamente');
        });

        test('No debe permitir registrar el mismo email dos veces', async () => {
            await request(app)
                .post('/usuarios/register')
                .send({
                    nombre: 'Usuario Duplicado',
                    email: 'duplicado@ejemplo.com',
                    password: 'password123',
                    confirmPass: 'password123'
                })
                .expect(201);

            const response = await request(app)
                .post('/usuarios/register')
                .send({
                    nombre: 'Otro Usuario',
                    email: 'duplicado@ejemplo.com',
                    password: 'password456',
                    confirmPass: 'password456'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'El email ya está registrado');
        });

        test('Debe validar que las contraseñas coincidan', async () => {
            const response = await request(app)
                .post('/usuarios/register')
                .send({
                    nombre: 'Test User',
                    email: 'test2@ejemplo.com',
                    password: 'password123',
                    confirmPass: 'password456'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Las contraseñas no coinciden');
        });

        test('Debe validar formato de email', async () => {
            const response = await request(app)
                .post('/usuarios/register')
                .send({
                    nombre: 'Test User',
                    email: 'email-invalido',
                    password: 'password123',
                    confirmPass: 'password123'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'El email no es válido');
        });

        test('Debe requerir campos obligatorios', async () => {
            const response = await request(app)
                .post('/usuarios/register')
                .send({
                    email: 'test3@ejemplo.com',
                    password: 'password123'
                    // Falta nombre y confirmPass
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Email y contraseña son requeridos');
        });
    });

    describe('POST /usuarios/register con migración de invitado', () => {
        test('Debe migrar un invitado a usuario registrado', async () => {
            // Crear invitado
            const invitadoResponse = await request(app)
                .post('/usuarios/invitado')
                .expect(200);

            const { invitadoId } = invitadoResponse.body;

            // Registrar usuario con invitadoId
            const response = await request(app)
                .post('/usuarios/register')
                .send({
                    nombre: 'Usuario Migrado',
                    email: 'migrado@ejemplo.com',
                    password: 'password123',
                    confirmPass: 'password123',
                    invitadoId: invitadoId
                })
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Usuario creado correctamente');
        });
    });

    describe('POST /usuarios/login', () => {
        beforeAll(async () => {
            // Asegurar que el usuario de prueba existe
            await request(app)
                .post('/usuarios/register')
                .send({
                    nombre: 'Login Test User',
                    email: 'login@ejemplo.com',
                    password: 'password123',
                    confirmPass: 'password123'
                });
        });

        test('Debe hacer login exitosamente', async () => {
            const response = await request(app)
                .post('/usuarios/login')
                .send({
                    email: 'login@ejemplo.com',
                    password: 'password123'
                })
                .expect(200);

            expect(response.body).toHaveProperty('Usuario');
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body.Usuario).toHaveProperty('ID');
            expect(response.body.Usuario).toHaveProperty('nombre', 'Login Test User');

            // Guardar para otros tests
            loginData = response.body;
        });

        test('No debe hacer login con email inexistente', async () => {
            const response = await request(app)
                .post('/usuarios/login')
                .send({
                    email: 'noexiste@ejemplo.com',
                    password: 'password123'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Correo no registrado');
        });

        test('No debe hacer login con contraseña incorrecta', async () => {
            const response = await request(app)
                .post('/usuarios/login')
                .send({
                    email: 'login@ejemplo.com',
                    password: 'contraseña-incorrecta'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Contraseña incorrecta');
        });

        test('Debe requerir email y password', async () => {
            const response = await request(app)
                .post('/usuarios/login')
                .send({
                    email: 'login@ejemplo.com'
                    // Falta password
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Email y contraseña son requeridos');
        });
    });

    describe('Validación de tokens de login', () => {
        test('Los tokens deben contener información correcta', async () => {
            if (!loginData) {
                const response = await request(app)
                    .post('/usuarios/login')
                    .send({ email: 'login@ejemplo.com', password: 'password123' });
                loginData = response.body;
            }

            const jwt = require('jsonwebtoken');

            const accessDecoded = jwt.verify(loginData.accessToken, process.env.JWT_SECRET);
            const refreshDecoded = jwt.verify(loginData.refreshToken, process.env.JWT_SECRET);

            expect(accessDecoded).toHaveProperty('id', loginData.Usuario.ID);
            expect(accessDecoded).toHaveProperty('rol', 'usuario');
            expect(accessDecoded).toHaveProperty('jti');
            expect(accessDecoded).toHaveProperty('exp');

            expect(refreshDecoded).toHaveProperty('id', loginData.Usuario.ID);
            expect(refreshDecoded).toHaveProperty('rol', 'usuario');
            expect(refreshDecoded).toHaveProperty('jti');
            expect(refreshDecoded).toHaveProperty('exp');
        });
    });
});
