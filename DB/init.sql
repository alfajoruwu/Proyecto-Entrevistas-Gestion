CREATE TABLE Usuarios (
    ID SERIAL PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol VARCHAR(50) DEFAULT 'usuario',
    Fecha_Registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE BaseDatos (
    ID SERIAL PRIMARY KEY,
    Nombre TEXT,
    ID_DB VARCHAR(100),
    SQL_init TEXT,
    Descripcion TEXT,
    Resumen TEXT,
    ID_Usuario int,
    Fecha_Creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ID_Usuario)
        REFERENCES Usuarios(ID)
        ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS Invitados (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upgraded BOOLEAN DEFAULT FALSE
);

-- Tabla para control de tokens activos y blacklist
CREATE TABLE IF NOT EXISTS Tokens (
    jti UUID PRIMARY KEY,
    user_id INTEGER NULL,
    invitado_id UUID NULL,
    token_type VARCHAR(20) DEFAULT 'access', -- 'access' o 'refresh'
    revoked BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NULL, -- NULL para tokens sin expiración
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES Usuarios(ID) ON DELETE CASCADE,
    FOREIGN KEY (invitado_id) REFERENCES Invitados(id) ON DELETE CASCADE
);

-- Habilitar extensión pg_cron (requiere permisos de superusuario)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar limpieza automática de tokens (cada día a las 2:00 AM)
-- SELECT cron.schedule('token-cleanup', '0 2 * * *', $$
--     DELETE FROM Tokens 
--     WHERE (expires_at IS NOT NULL AND expires_at < NOW()) 
--     OR (revoked = TRUE AND revoked_at < NOW() - INTERVAL '7 days')
--     OR (created_at < NOW() - INTERVAL '90 days');
-- $$);

-- Función de limpieza manual (alternativa si no tienes pg_cron)
CREATE OR REPLACE FUNCTION cleanup_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM Tokens 
    WHERE (expires_at IS NOT NULL AND expires_at < NOW()) 
    OR (revoked = TRUE AND revoked_at < NOW() - INTERVAL '7 days')
    OR (created_at < NOW() - INTERVAL '90 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log simple en lugar de tabla (evita dependencias)
    RAISE NOTICE 'Token cleanup: deleted % tokens at %', deleted_count, NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

