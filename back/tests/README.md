# Tests del Backend

## Estructura de Tests

### 📁 tests/
- `setup.js` - Configuración global de tests
- `general.test.js` - Tests de endpoints generales
- `usuarios.invitados.test.js` - Tests de usuarios invitados
- `usuarios.registrados.test.js` - Tests de registro y login
- `tokens.test.js` - Tests de gestión de tokens
- `auth.middleware.test.js` - Tests del middleware de autenticación

## Comandos de Test

### Ejecutar todos los tests
```bash
npm test
```

### Ejecutar tests en modo watch
```bash
npm run test:watch
```

### Ejecutar tests con coverage
```bash
npm run test:coverage
```

### Ejecutar tests por categoría
```bash
# Solo tests de usuarios
npm run test:usuarios

# Solo tests de autenticación
npm run test:auth

# Solo tests de tokens
npm run test:tokens
```

## Categorías de Tests

### 🔓 Usuarios Invitados
- ✅ Creación de invitados
- ✅ Validación de UUID únicos
- ✅ Estructura del token
- ✅ Token sin expiración

### 👤 Usuarios Registrados
- ✅ Registro exitoso
- ✅ Validaciones (email, passwords, campos requeridos)
- ✅ Prevención de duplicados
- ✅ Migración de invitado a registrado
- ✅ Login exitoso y fallido
- ✅ Estructura de tokens con expiración

### 🔄 Gestión de Tokens
- ✅ Refresh de tokens (usuarios e invitados)
- ✅ Logout individual
- ✅ Logout global
- ✅ Validación de blacklist
- ✅ Revocación de tokens

### 🛡️ Middleware de Autenticación
- ✅ Validación de tokens válidos/inválidos
- ✅ Manejo de tokens revocados
- ✅ Verificación de roles
- ✅ Requests sin autenticación

### 🏠 Endpoints Generales
- ✅ Endpoint raíz
- ✅ Documentación Swagger
- ✅ Manejo de rutas inexistentes

## Configuración

### Variables de Entorno para Tests
```bash
NODE_ENV=test
POSTGRES_TEST_DB=test_database
JWT_SECRET=test_secret_key
```

### Base de Datos de Test
Se recomienda usar una base de datos separada para tests:
1. Crear DB de test: `createdb test_database`
2. Ejecutar init.sql en DB de test
3. Configurar variable `POSTGRES_TEST_DB`

## Helpers Globales

### Datos de Prueba
```javascript
global.testUser = {
  nombre: 'Test User',
  email: 'test@ejemplo.com',
  password: 'password123',
  confirmPass: 'password123'
};
```

### Funciones Helper
```javascript
// Generar token de prueba
global.generateTestToken(payload)

// Headers de autorización
global.authHeaders(token)
```

## Cobertura de Tests

Los tests cubren:
- ✅ Todos los endpoints de usuarios
- ✅ Validaciones de entrada
- ✅ Casos de error
- ✅ Middleware de autenticación
- ✅ Gestión de tokens
- ✅ Sistema de blacklist

## Ejecución en CI/CD

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    npm test
    npm run test:coverage
```

## Debugging Tests

Para debuggear tests específicos:
```bash
# Ejecutar un solo archivo
npx jest tests/usuarios.invitados.test.js

# Ejecutar con verbose
npx jest --verbose

# Ejecutar test específico
npx jest -t "Debe crear un usuario invitado"
```
