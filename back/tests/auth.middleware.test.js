const request = require('supertest');
const { authMiddleware, Verifica } = require('../middleware/TipoUsuario');
const jwt = require('jsonwebtoken');

describe('🛡️ Middleware de Autenticación', () => {
    let validUserToken;
    let validInvitadoToken;
    let revokedToken;

    beforeAll(async () => {
        // Generar tokens para pruebas sin depender de la DB
        validUserToken = jwt.sign({
            id: 1,
            rol: 'usuario',
            jti: 'test-user-jti-123'
        }, process.env.JWT_SECRET, { expiresIn: '1h' });

        validInvitadoToken = jwt.sign({
            invitadoId: 'test-invitado-uuid',
            rol: 'invitado',
            jti: 'test-invitado-jti-456'
        }, process.env.JWT_SECRET);

        revokedToken = jwt.sign({
            id: 2,
            rol: 'usuario',
            jti: 'revoked-token-jti-789'
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    describe('authMiddleware', () => {
        test('Debe permitir requests sin token (req.user = null)', async () => {
            const req = {
                header: jest.fn().mockReturnValue(null)
            };
            const res = {};
            const next = jest.fn();

            await authMiddleware(req, res, next);

            expect(req.user).toBeNull();
            expect(next).toHaveBeenCalled();
        });

        test('Debe validar token de usuario registrado', async () => {
            // Mock de la consulta de base de datos para simular que el token no está revocado
            const originalPool = require('../config/DB');
            jest.spyOn(originalPool, 'query').mockResolvedValueOnce({ rows: [] });

            const req = {
                header: jest.fn().mockReturnValue(`Bearer ${validUserToken}`)
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            await authMiddleware(req, res, next);

            expect(req.user).toBeDefined();
            expect(req.user.id).toBe(1);
            expect(req.user.rol).toBe('usuario');
            expect(next).toHaveBeenCalled();

            originalPool.query.mockRestore();
        });

        test('Debe validar token de invitado', async () => {
            // Mock de la consulta de base de datos para simular que el token no está revocado
            const originalPool = require('../config/DB');
            jest.spyOn(originalPool, 'query').mockResolvedValueOnce({ rows: [] });

            const req = {
                header: jest.fn().mockReturnValue(`Bearer ${validInvitadoToken}`)
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            await authMiddleware(req, res, next);

            expect(req.user).toBeDefined();
            expect(req.user.invitadoId).toBeDefined();
            expect(req.user.rol).toBe('invitado');
            expect(next).toHaveBeenCalled();

            originalPool.query.mockRestore();
        });

        test('Debe rechazar token revocado', async () => {
            // Mock de la consulta de base de datos para simular token revocado
            const originalPool = require('../config/DB');
            jest.spyOn(originalPool, 'query').mockResolvedValueOnce({
                rows: [{ jti: 'revoked-token-jti-789' }]
            });

            const req = {
                header: jest.fn().mockReturnValue(`Bearer ${revokedToken}`)
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            await authMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token revocado o inválido' });
            expect(next).not.toHaveBeenCalled();

            originalPool.query.mockRestore();
        });

        test('Debe rechazar token inválido', async () => {
            const req = {
                header: jest.fn().mockReturnValue('Bearer token-invalido')
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            await authMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(402);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Verifica middleware', () => {
        test('Debe permitir acceso con rol correcto', () => {
            const verificaUsuario = Verifica('usuario');
            const req = { user: { rol: 'usuario' } };
            const res = {};
            const next = jest.fn();

            verificaUsuario(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test('Debe permitir acceso con múltiples roles', () => {
            const verificaMultiple = Verifica('usuario', 'admin');
            const req = { user: { rol: 'admin' } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            verificaMultiple(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test('Debe denegar acceso con rol incorrecto', () => {
            const verificaAdmin = Verifica('admin');
            const req = { user: { rol: 'usuario' } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            verificaAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado. No tienes permiso suficiente.' });
            expect(next).not.toHaveBeenCalled();
        });

        test('Debe denegar acceso sin usuario autenticado', () => {
            const verificaUsuario = Verifica('usuario');
            const req = {};
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            verificaUsuario(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'No autenticado' });
            expect(next).not.toHaveBeenCalled();
        });
    });
});
