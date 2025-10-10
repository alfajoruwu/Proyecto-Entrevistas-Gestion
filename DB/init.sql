-- Tabla de usuarios administradores
CREATE TABLE Usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol VARCHAR(50) DEFAULT 'administrador',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de casos de convivencia
CREATE TABLE Casos (
    id_caso SERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fuente TEXT, -- texto libre para describir cómo llegó el caso
    tipo_fuente VARCHAR(50), -- 'derivacion', 'denuncia_presencial', 'denuncia_online', 'entrevista_preliminar'
    estado VARCHAR(50) DEFAULT 'Recepcionado', -- 'Recepcionado', 'En Proceso', 'Finalizado', 'Resolucion'
    forma_finalizacion VARCHAR(50), -- 'Acuerdo', 'Derivacion', 'Frustrado'
    comentarios_finalizacion TEXT, -- Comentarios adicionales al finalizar
    resolucion TEXT, -- Descripción de la resolución del caso
    comentarios_resolucion TEXT, -- Comentarios adicionales para la resolución
    fecha_resolucion TIMESTAMP, -- Fecha cuando se resolvió el caso
    id_entrevista_preliminar INTEGER, -- referencia a entrevista preliminar de origen
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_finalizacion TIMESTAMP
);

-- Tabla de afectados (docentes, estudiantes, colaboradores, funcionarios, administrativos)
CREATE TABLE Afectados (
    id_afectado SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL, -- 'Docente', 'Estudiante', 'Colaborador', 'Funcionario', 'Administrativo'
    nombre TEXT NOT NULL,
    correo VARCHAR(100),
    telefono VARCHAR(20),
    carrera TEXT, -- para estudiantes y docentes
    estamento TEXT, -- reemplaza cargo - para docentes, funcionarios, administrativos
    empresa_servicio TEXT, -- para colaboradores
    unidad TEXT, -- para colaboradores, funcionarios, administrativos
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relación entre casos y afectados con su rol
CREATE TABLE RolAfectadoCaso (
    id SERIAL PRIMARY KEY,
    id_caso INTEGER REFERENCES Casos(id_caso) ON DELETE CASCADE,
    id_afectado INTEGER REFERENCES Afectados(id_afectado) ON DELETE CASCADE,
    rol VARCHAR(20) NOT NULL, -- 'Denunciante', 'Denunciado', 'Testigo', 'Informante'
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de entrevistas realizadas
CREATE TABLE Entrevistas (
    id_entrevista SERIAL PRIMARY KEY,
    id_caso INTEGER REFERENCES Casos(id_caso) ON DELETE CASCADE,
    fecha_hora TIMESTAMP,
    lugar TEXT,
    resumen TEXT, -- bitácora libre de lo realizado en la entrevista
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relación entre entrevistas y afectados presentes
CREATE TABLE EntrevistaAfectado (
    id SERIAL PRIMARY KEY,
    id_entrevista INTEGER REFERENCES Entrevistas(id_entrevista) ON DELETE CASCADE,
    id_afectado INTEGER REFERENCES Afectados(id_afectado) ON DELETE CASCADE
);

-- Bitácora de acciones realizadas en cada caso
CREATE TABLE AccionesBitacora (
    id_accion SERIAL PRIMARY KEY,
    id_caso INTEGER REFERENCES Casos(id_caso) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    color VARCHAR(50) DEFAULT 'bg-primary', -- color para categorización visual
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES Usuarios(id_usuario)
);

-- Tabla de entrevistas preliminares (antes de crear casos formales)
CREATE TABLE EntrevistasPreliminar (
    id_entrevista_preliminar SERIAL PRIMARY KEY,
    persona_entrevistada TEXT NOT NULL, -- nombre de la persona entrevistada
    tipo_persona VARCHAR(20), -- 'Docente', 'Estudiante', 'Colaborador', 'Funcionario', 'Administrativo'
    contacto TEXT, -- correo o teléfono de contacto (opcional)
    resumen_conversacion TEXT NOT NULL, -- resumen de lo conversado
    evolucionado_a_caso BOOLEAN DEFAULT FALSE, -- si se convirtió en caso formal
    id_caso_relacionado INTEGER REFERENCES Casos(id_caso) ON DELETE SET NULL, -- caso al que evolucionó
    id_afectado_creado INTEGER REFERENCES Afectados(id_afectado) ON DELETE SET NULL, -- afectado creado automáticamente
    fecha_entrevista TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES Usuarios(id_usuario),
    notas_adicionales TEXT -- campo adicional para observaciones
);

-- Índices para mejorar consultas
CREATE INDEX idx_entrevistas_preliminar_fecha ON EntrevistasPreliminar(fecha_entrevista);
CREATE INDEX idx_entrevistas_preliminar_evolucionado ON EntrevistasPreliminar(evolucionado_a_caso);
CREATE INDEX idx_entrevistas_preliminar_caso ON EntrevistasPreliminar(id_caso_relacionado);
CREATE INDEX idx_entrevistas_preliminar_afectado ON EntrevistasPreliminar(id_afectado_creado);




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
    FOREIGN KEY (user_id) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
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

-- NOTA: El usuario por defecto se debe crear desde la aplicación backend
-- usando las variables de entorno para mayor seguridad

