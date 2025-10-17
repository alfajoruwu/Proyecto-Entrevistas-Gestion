const express = require('express');
const router = express.Router();
const pool = require('../../config/DB');
const { authMiddleware, Verifica } = require('../../middleware/TipoUsuario');

// Crear nuevo afectado
router.post('/', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const {
            tipo, nombre, correo, telefono,
            carrera, estamento, empresa_servicio, unidad
        } = req.body;

        if (!tipo || !nombre) {
            return res.status(400).json({ error: 'Tipo y nombre son requeridos' });
        }

        const tiposValidos = ['Docente', 'Estudiante', 'Colaborador', 'Funcionario', 'Administrativo'];
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({
                error: 'Tipo inválido. Debe ser: Docente, Estudiante, Colaborador, Funcionario o Administrativo'
            });
        }

        // Verificar si ya existe un afectado con el mismo correo
        if (correo) {
            const existingAfectado = await pool.query(
                'SELECT id_afectado FROM Afectados WHERE correo = $1',
                [correo]
            );

            if (existingAfectado.rows.length > 0) {
                return res.status(400).json({
                    error: 'Ya existe un afectado con este correo electrónico'
                });
            }
        }

        const result = await pool.query(`
      INSERT INTO Afectados (tipo, nombre, correo, telefono, carrera, estamento, empresa_servicio, unidad)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [tipo, nombre, correo, telefono, carrera, estamento, empresa_servicio, unidad]);

        res.status(201).json({
            message: 'Afectado creado exitosamente',
            afectado: result.rows[0]
        });
    } catch (error) {
        console.error('Error creando afectado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Listar todos los afectados con filtros
router.get('/', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { tipo, search, page = 1, limit = 10 } = req.query;

        let query = 'SELECT * FROM Afectados WHERE 1=1';
        let params = [];

        // Filtro por tipo
        if (tipo) {
            query += ` AND tipo = $${params.length + 1}`;
            params.push(tipo);
        }

        // Búsqueda por nombre o correo
        if (search) {
            query += ` AND (nombre ILIKE $${params.length + 1} OR correo ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }

        query += ' ORDER BY nombre ASC';

        // Paginación
        const offset = (page - 1) * limit;
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Contar total para paginación
        let countQuery = 'SELECT COUNT(*) FROM Afectados WHERE 1=1';
        let countParams = [];

        if (tipo) {
            countQuery += ` AND tipo = $${countParams.length + 1}`;
            countParams.push(tipo);
        }

        if (search) {
            countQuery += ` AND (nombre ILIKE $${countParams.length + 1} OR correo ILIKE $${countParams.length + 1})`;
            countParams.push(`%${search}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            afectados: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error obteniendo afectados:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Buscar afectados para autocompletado (con historial resumido)
router.get('/buscar/autocompletar', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { q } = req.query; // query string para búsqueda

        if (!q || q.length < 2) {
            return res.json([]);
        }

        // Buscar afectados que coincidan con el nombre
        const afectadosResult = await pool.query(`
            SELECT DISTINCT
                a.id_afectado,
                a.nombre,
                a.correo,
                a.telefono,
                a.tipo,
                a.carrera,
                a.estamento,
                a.empresa_servicio,
                a.unidad,
                COUNT(rac.id_caso) as total_casos
            FROM Afectados a
            LEFT JOIN RolAfectadoCaso rac ON a.id_afectado = rac.id_afectado
            WHERE a.nombre ILIKE $1
            GROUP BY a.id_afectado, a.nombre, a.correo, a.telefono, a.tipo, a.carrera, a.estamento, a.empresa_servicio, a.unidad
            ORDER BY a.nombre ASC
            LIMIT 10
        `, [`%${q}%`]);

        // Para cada afectado, obtener un resumen de sus casos más recientes
        const afectadosConHistorial = await Promise.all(
            afectadosResult.rows.map(async (afectado) => {
                const historialResult = await pool.query(`
                    SELECT 
                        c.id_caso,
                        c.titulo,
                        c.estado,
                        c.fecha_creacion,
                        rac.rol
                    FROM Casos c
                    JOIN RolAfectadoCaso rac ON c.id_caso = rac.id_caso
                    WHERE rac.id_afectado = $1
                    ORDER BY c.fecha_creacion DESC
                    LIMIT 3
                `, [afectado.id_afectado]);

                return {
                    ...afectado,
                    casos_recientes: historialResult.rows
                };
            })
        );

        res.json(afectadosConHistorial);
    } catch (error) {
        console.error('Error en búsqueda de autocompletado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener afectado específico
router.get('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('SELECT * FROM Afectados WHERE id_afectado = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Afectado no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo afectado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener resumen completo del afectado (casos y entrevistas preliminares)
router.get('/:id/resumen', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener información básica del afectado
        const afectadoResult = await pool.query(
            'SELECT * FROM Afectados WHERE id_afectado = $1',
            [id]
        );

        if (afectadoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Afectado no encontrado' });
        }

        const afectado = afectadoResult.rows[0];

        // Obtener todos los casos en los que participa
        const casosResult = await pool.query(`
            SELECT 
                c.id_caso,
                c.titulo,
                c.descripcion,
                c.estado,
                c.fecha_creacion,
                c.fecha_finalizacion,
                rac.rol
            FROM Casos c
            JOIN RolAfectadoCaso rac ON c.id_caso = rac.id_caso
            WHERE rac.id_afectado = $1
            ORDER BY c.fecha_creacion DESC
        `, [id]);

        // Obtener entrevistas preliminares donde aparece
        const entrevistasResult = await pool.query(`
            SELECT 
                id_entrevista_preliminar,
                persona_entrevistada,
                tipo_persona,
                resumen_conversacion,
                fecha_entrevista,
                evolucionado_a_caso,
                id_caso_relacionado
            FROM EntrevistasPreliminar
            WHERE id_afectado_creado = $1
            ORDER BY fecha_entrevista DESC
        `, [id]);

        // Calcular estadísticas
        const estadisticas = {
            total_casos: casosResult.rows.length,
            total_entrevistas_preliminares: entrevistasResult.rows.length,
            casos_por_estado: {},
            roles_en_casos: {}
        };

        // Agrupar casos por estado
        casosResult.rows.forEach(caso => {
            estadisticas.casos_por_estado[caso.estado] =
                (estadisticas.casos_por_estado[caso.estado] || 0) + 1;
            estadisticas.roles_en_casos[caso.rol] =
                (estadisticas.roles_en_casos[caso.rol] || 0) + 1;
        });

        res.json({
            ...afectado,
            ...estadisticas,
            casos: casosResult.rows,
            entrevistas_preliminares: entrevistasResult.rows
        });
    } catch (error) {
        console.error('Error obteniendo resumen del afectado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar afectado
router.put('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            tipo, nombre, correo, telefono,
            carrera, estamento, empresa_servicio, unidad
        } = req.body;

        if (!tipo || !nombre) {
            return res.status(400).json({ error: 'Tipo y nombre son requeridos' });
        }

        const tiposValidos = ['Docente', 'Estudiante', 'Colaborador', 'Funcionario', 'Administrativo'];
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({
                error: 'Tipo inválido. Debe ser: Docente, Estudiante, Colaborador, Funcionario o Administrativo'
            });
        }

        // Verificar si el correo ya existe en otro afectado
        if (correo) {
            const existingAfectado = await pool.query(
                'SELECT id_afectado FROM Afectados WHERE correo = $1 AND id_afectado != $2',
                [correo, id]
            );

            if (existingAfectado.rows.length > 0) {
                return res.status(400).json({
                    error: 'Ya existe otro afectado con este correo electrónico'
                });
            }
        }

        const result = await pool.query(`
            UPDATE Afectados 
            SET tipo = $1, nombre = $2, correo = $3, telefono = $4, 
                carrera = $5, estamento = $6, empresa_servicio = $7, unidad = $8,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id_afectado = $9
            RETURNING *
        `, [tipo, nombre, correo, telefono, carrera, estamento, empresa_servicio, unidad, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Afectado no encontrado' });
        }

        res.json({
            message: 'Afectado actualizado exitosamente',
            afectado: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando afectado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar afectado
router.delete('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el afectado está asignado a algún caso
        const casosAsignados = await pool.query(
            'SELECT COUNT(*) FROM RolAfectadoCaso WHERE id_afectado = $1',
            [id]
        );

        if (parseInt(casosAsignados.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar el afectado porque está asignado a uno o más casos'
            });
        }

        const result = await pool.query(
            'DELETE FROM Afectados WHERE id_afectado = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Afectado no encontrado' });
        }

        res.json({ message: 'Afectado eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando afectado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener historial de casos de un afectado
router.get('/:id/historial', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el afectado existe
        const afectadoResult = await pool.query(
            'SELECT nombre FROM Afectados WHERE id_afectado = $1',
            [id]
        );

        if (afectadoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Afectado no encontrado' });
        }

        // Obtener historial de casos
        const casosResult = await pool.query(`
      SELECT 
        c.id_caso,
        c.titulo,
        c.estado,
        c.fecha_creacion,
        c.fecha_finalizacion,
        rac.rol,
        rac.fecha_asignacion
      FROM Casos c
      JOIN RolAfectadoCaso rac ON c.id_caso = rac.id_caso
      WHERE rac.id_afectado = $1
      ORDER BY c.fecha_creacion DESC
    `, [id]);

        res.json({
            afectado: afectadoResult.rows[0],
            historial_casos: casosResult.rows
        });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear nuevo afectado y asignarlo directamente a un caso
router.post('/casos/:casoId/afectados/nuevo', authMiddleware, Verifica('administrador'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { casoId } = req.params;
        const {
            tipo, nombre, correo, telefono,
            carrera, estamento, empresa_servicio, unidad, rol
        } = req.body;

        if (!tipo || !nombre || !rol) {
            return res.status(400).json({ error: 'Tipo, nombre y rol son requeridos' });
        }

        const tiposValidos = ['Docente', 'Estudiante', 'Colaborador', 'Funcionario', 'Administrativo'];
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({
                error: 'Tipo inválido. Debe ser: Docente, Estudiante, Colaborador, Funcionario o Administrativo'
            });
        }

        const rolesValidos = ['Denunciante', 'Denunciado', 'Testigo', 'Informante'];
        if (!rolesValidos.includes(rol)) {
            return res.status(400).json({
                error: 'Rol inválido. Debe ser: Denunciante, Denunciado, Testigo o Informante'
            });
        }

        // Verificar que el caso existe
        const casoExists = await client.query('SELECT id_caso FROM Casos WHERE id_caso = $1', [casoId]);
        if (casoExists.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        // Verificar si ya existe un afectado con el mismo correo
        if (correo) {
            const existingAfectado = await client.query(
                'SELECT id_afectado FROM Afectados WHERE correo = $1',
                [correo]
            );

            if (existingAfectado.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'Ya existe un afectado con este correo electrónico'
                });
            }
        }

        // Crear el afectado
        const afectadoResult = await client.query(`
            INSERT INTO Afectados (tipo, nombre, correo, telefono, carrera, estamento, empresa_servicio, unidad)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [tipo, nombre, correo, telefono, carrera, estamento, empresa_servicio, unidad]);

        const nuevoAfectado = afectadoResult.rows[0];

        // Asignar al caso
        const relacionResult = await client.query(`
            INSERT INTO RolAfectadoCaso (id_caso, id_afectado, rol)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [casoId, nuevoAfectado.id_afectado, rol]);

        // Registrar acción en bitácora
        await client.query(`
            INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
            VALUES ($1, $2, $3)
        `, [casoId, `Nuevo afectado agregado: ${nombre} como ${rol}`, req.user.id]);

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Afectado creado y asignado al caso exitosamente',
            afectado: {
                ...nuevoAfectado,
                rol: rol,
                fecha_asignacion: relacionResult.rows[0].fecha_asignacion
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creando afectado para caso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

// Obtener afectados de un caso específico
router.get('/casos/:casoId/afectados', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { casoId } = req.params;

        // Verificar que el caso existe
        const casoExists = await pool.query('SELECT titulo FROM Casos WHERE id_caso = $1', [casoId]);
        if (casoExists.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        // Obtener afectados del caso con su rol
        const result = await pool.query(`
            SELECT 
                a.id_afectado,
                a.tipo,
                a.nombre,
                a.correo,
                a.telefono,
                a.carrera,
                a.estamento,
                a.empresa_servicio,
                a.unidad,
                a.fecha_creacion,
                rac.rol,
                rac.fecha_asignacion
            FROM Afectados a
            JOIN RolAfectadoCaso rac ON a.id_afectado = rac.id_afectado
            WHERE rac.id_caso = $1
            ORDER BY rac.fecha_asignacion DESC
        `, [casoId]);

        res.json({
            caso: casoExists.rows[0],
            afectados: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo afectados del caso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Asignar afectado a un caso
router.post('/casos/:casoId/afectados', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { casoId } = req.params;
        const { id_afectado, rol } = req.body;

        if (!id_afectado || !rol) {
            return res.status(400).json({ error: 'ID del afectado y rol son requeridos' });
        }

        const rolesValidos = ['Denunciante', 'Denunciado', 'Testigo', 'Informante'];
        if (!rolesValidos.includes(rol)) {
            return res.status(400).json({
                error: 'Rol inválido. Debe ser: Denunciante, Denunciado, Testigo o Informante'
            });
        }

        // Verificar que el caso existe
        const casoExists = await pool.query('SELECT id_caso FROM Casos WHERE id_caso = $1', [casoId]);
        if (casoExists.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        // Verificar que el afectado existe
        const afectadoExists = await pool.query('SELECT id_afectado FROM Afectados WHERE id_afectado = $1', [id_afectado]);
        if (afectadoExists.rows.length === 0) {
            return res.status(404).json({ error: 'Afectado no encontrado' });
        }

        // Verificar que la relación no existe ya
        const relationExists = await pool.query(
            'SELECT id FROM RolAfectadoCaso WHERE id_caso = $1 AND id_afectado = $2',
            [casoId, id_afectado]
        );

        if (relationExists.rows.length > 0) {
            return res.status(400).json({
                error: 'El afectado ya está asignado a este caso'
            });
        }

        const result = await pool.query(`
      INSERT INTO RolAfectadoCaso (id_caso, id_afectado, rol)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [casoId, id_afectado, rol]);

        // Registrar acción en bitácora
        const afectadoInfo = await pool.query('SELECT nombre FROM Afectados WHERE id_afectado = $1', [id_afectado]);
        await pool.query(`
      INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
      VALUES ($1, $2, $3)
    `, [casoId, `Afectado agregado: ${afectadoInfo.rows[0].nombre} como ${rol}`, req.user.id]);

        res.status(201).json({
            message: 'Afectado asignado al caso exitosamente',
            relacion: result.rows[0]
        });
    } catch (error) {
        console.error('Error asignando afectado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cambiar rol de afectado en caso
router.put('/casos/:casoId/afectados/:afectadoId', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { casoId, afectadoId } = req.params;
        const { rol } = req.body;

        if (!rol) {
            return res.status(400).json({ error: 'Rol es requerido' });
        }

        const rolesValidos = ['Denunciante', 'Denunciado', 'Testigo', 'Informante'];
        if (!rolesValidos.includes(rol)) {
            return res.status(400).json({
                error: 'Rol inválido. Debe ser: Denunciante, Denunciado, Testigo o Informante'
            });
        }

        const result = await pool.query(`
      UPDATE RolAfectadoCaso 
      SET rol = $1
      WHERE id_caso = $2 AND id_afectado = $3
      RETURNING *
    `, [rol, casoId, afectadoId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Relación afectado-caso no encontrada' });
        }

        // Registrar acción en bitácora
        const afectadoInfo = await pool.query('SELECT nombre FROM Afectados WHERE id_afectado = $1', [afectadoId]);
        await pool.query(`
      INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
      VALUES ($1, $2, $3)
    `, [casoId, `Rol cambiado para ${afectadoInfo.rows[0].nombre}: ${rol}`, req.user.id]);

        res.json({
            message: 'Rol del afectado actualizado exitosamente',
            relacion: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando rol:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Remover afectado de caso
router.delete('/casos/:casoId/afectados/:afectadoId', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { casoId, afectadoId } = req.params;

        // Obtener info del afectado antes de eliminar
        const afectadoInfo = await pool.query('SELECT nombre FROM Afectados WHERE id_afectado = $1', [afectadoId]);

        const result = await pool.query(`
      DELETE FROM RolAfectadoCaso 
      WHERE id_caso = $1 AND id_afectado = $2
      RETURNING *
    `, [casoId, afectadoId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Relación afectado-caso no encontrada' });
        }

        // Registrar acción en bitácora
        if (afectadoInfo.rows.length > 0) {
            await pool.query(`
        INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
        VALUES ($1, $2, $3)
      `, [casoId, `Afectado removido: ${afectadoInfo.rows[0].nombre}`, req.user.id]);
        }

        res.json({ message: 'Afectado removido del caso exitosamente' });
    } catch (error) {
        console.error('Error removiendo afectado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;