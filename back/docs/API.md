# API Backend - Sistema de Autenticación

## Descripción
API REST para manejo de usuarios, invitados y tokens con sistema de blacklist.

## Base URL
```
http://localhost:3000
```

## Autenticación
La API utiliza JWT Bearer tokens:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 🔓 Usuarios Invitados

#### Crear Invitado
```http
POST /usuarios/invitado
```

**Respuesta exitosa (200):**
```json
{
  "invitadoId": "123e4567-e89b-12d3-a456-426614174000",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 👤 Usuarios Registrados

#### Registrar Usuario
```http
POST /usuarios/register
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "password": "password123",
  "confirmPass": "password123",
  "invitadoId": "123e4567-e89b-12d3-a456-426614174000" // opcional
}
```

**Respuesta exitosa (201):**
```json
{
  "message": "Usuario creado correctamente"
}
```

#### Iniciar Sesión
```http
POST /usuarios/login
Content-Type: application/json
```

**Body:**
```json
{
  "email": "juan@ejemplo.com",
  "password": "password123"
}
```

**Respuesta exitosa (200):**
```json
{
  "Usuario": {
    "ID": 1,
    "nombre": "Juan Pérez"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Refrescar Token
```http
POST /usuarios/refresh-token
Content-Type: application/json
```

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta exitosa (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 🚪 Gestión de Sesiones

#### Cerrar Sesión
```http
POST /usuarios/logout
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "message": "Logout exitoso"
}
```

#### Cerrar Todas las Sesiones
```http
POST /usuarios/logout-all
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "message": "Logout global exitoso"
}
```

---

## Códigos de Estado

| Código | Descripción |
|--------|-------------|
| 200 | Éxito |
| 201 | Creado |
| 400 | Error de validación |
| 401 | No autenticado |
| 403 | Token revocado/sin permisos |
| 500 | Error interno |

---

## Estructura de Errores

```json
{
  "error": "Descripción del error"
}
```

---

## Características del Sistema

### Tokens
- **Invitados**: Token sin expiración, identificado por UUID
- **Usuarios**: Access token (3h) + Refresh token (7d)
- **Blacklist**: Control de revocación en base de datos

### Seguridad
- Passwords hasheados con bcrypt
- Tokens JWT con identificador único (jti)
- Sistema de revocación inmediata
- Limpieza automática diaria (2:00 AM)

### Migración
- Los invitados pueden registrarse manteniendo sus datos
- Al registrarse, el invitado se marca como "upgraded"
