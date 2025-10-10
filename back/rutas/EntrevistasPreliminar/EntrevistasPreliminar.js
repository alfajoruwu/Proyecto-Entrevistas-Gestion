const express = require('express');
const router = express.Router();
const pool = require('../../config/DB');
const { authMiddleware, Verifica } = require('../../middleware/TipoUsuario');

// Crear nueva entrevista preliminar
router.post('/', authMiddleware, Verifica('administrador'), async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const {
            persona_entrevistada,
            tipo_persona,
            correo,
            telefono,
            carrera,
            estamento,
            empresa_servicio,
            unidad,
            resumen_conversacion,
            notas_adicionales,
            fecha_entrevista
        } = req.body;

        if (!persona_entrevistada || !resumen_conversacion) {
            return res.status(400).json({
                error: 'Persona entrevistada y resumen de conversación son requeridos'
            });
        }

        const tiposValidos = ['Docente', 'Estudiante', 'Colaborador', 'Funcionario', 'Administrativo'];
        if (!tipo_persona || !tiposValidos.includes(tipo_persona)) {
            return res.status(400).json({
                error: 'Tipo de persona es requerido y debe ser: Docente, Estudiante, Colaborador, Funcionario o Administrativo'
            });
        }

        // Verificar si ya existe un afectado con el mismo correo (si se proporciona)
        let afectadoExistente = null;
        if (correo) {
            const existingAfectado = await client.query(
                'SELECT id_afectado FROM Afectados WHERE correo = $1',
                [correo]
            );

            if (existingAfectado.rows.length > 0) {
                afectadoExistente = existingAfectado.rows[0];
            }
        }

        let id_afectado_creado = null;

        // Si no existe un afectado con ese correo, crear uno nuevo
        if (!afectadoExistente) {
            const afectadoResult = await client.query(`
                INSERT INTO Afectados (tipo, nombre, correo, telefono, carrera, estamento, empresa_servicio, unidad)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id_afectado
            `, [tipo_persona, persona_entrevistada, correo, telefono, carrera, estamento, empresa_servicio, unidad]);

            id_afectado_creado = afectadoResult.rows[0].id_afectado;
        } else {
            id_afectado_creado = afectadoExistente.id_afectado;
        }

        // Usar fecha proporcionada o timestamp actual
        const fechaFinal = fecha_entrevista ? new Date(fecha_entrevista) : new Date();

        // Crear la entrevista preliminar con referencia al afectado
        const result = await client.query(`
            INSERT INTO EntrevistasPreliminar (
                persona_entrevistada, 
                tipo_persona, 
                contacto,
                resumen_conversacion, 
                notas_adicionales,
                fecha_entrevista,
                usuario_id,
                id_afectado_creado
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            persona_entrevistada,
            tipo_persona,
            correo || telefono, // contacto legacy para compatibilidad
            resumen_conversacion,
            notas_adicionales,
            fechaFinal,
            req.user.id,
            id_afectado_creado
        ]);

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Entrevista preliminar y afectado registrados exitosamente',
            entrevista: result.rows[0],
            afectado_creado: !afectadoExistente
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creando entrevista preliminar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

// Listar todas las entrevistas preliminares con filtros
router.get('/', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const {
            tipo_persona,
            evolucionado,
            busqueda,
            fecha_inicio,
            fecha_fin,
            page = 1,
            limit = 20
        } = req.query;

        // Validar y convertir parámetros de paginación
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20;

        if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                error: 'Parámetros de paginación inválidos',
                details: 'page debe ser >= 1, limit debe estar entre 1 y 100'
            });
        }

        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        // Filtrar por tipo de persona
        if (tipo_persona) {
            paramCount++;
            whereConditions.push(`ep.tipo_persona = $${paramCount}`);
            params.push(tipo_persona);
        }

        // Filtrar por estado de evolución
        if (evolucionado !== undefined) {
            paramCount++;
            whereConditions.push(`ep.evolucionado_a_caso = $${paramCount}`);
            params.push(evolucionado === 'true');
        }

        // Filtrar por búsqueda en persona o resumen
        if (busqueda) {
            paramCount++;
            whereConditions.push(`(ep.persona_entrevistada ILIKE $${paramCount} OR ep.resumen_conversacion ILIKE $${paramCount})`);
            params.push(`%${busqueda}%`);
        }

        // Filtrar por fecha de inicio
        if (fecha_inicio) {
            paramCount++;
            whereConditions.push(`ep.fecha_entrevista >= $${paramCount}`);
            params.push(new Date(fecha_inicio));
        }

        // Filtrar por fecha de fin
        if (fecha_fin) {
            paramCount++;
            const fechaFinCompleta = new Date(fecha_fin);
            fechaFinCompleta.setHours(23, 59, 59, 999);
            whereConditions.push(`ep.fecha_entrevista <= $${paramCount}`);
            params.push(fechaFinCompleta);
        }

        // Consulta principal con información del usuario y caso relacionado
        let query = `
            SELECT 
                ep.*,
                u.nombre as usuario_nombre,
                c.titulo as caso_titulo,
                c.estado as caso_estado
            FROM EntrevistasPreliminar ep
            LEFT JOIN Usuarios u ON ep.usuario_id = u.id_usuario
            LEFT JOIN Casos c ON ep.id_caso_relacionado = c.id_caso
        `;

        let countQuery = `SELECT COUNT(*) FROM EntrevistasPreliminar ep`;

        if (whereConditions.length > 0) {
            const whereClause = ' WHERE ' + whereConditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        query += ' ORDER BY ep.fecha_entrevista DESC';

        // Paginación
        const offset = (pageNum - 1) * limitNum;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limitNum, offset);

        const result = await pool.query(query, params);

        // Contar total para paginación
        const countResult = await pool.query(countQuery, params.slice(0, paramCount));
        const total = parseInt(countResult.rows[0].count);

        res.json({
            entrevistas: result.rows,
            total,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Error obteniendo entrevistas preliminares:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener entrevista preliminar específica
router.get('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                ep.*,
                u.nombre as usuario_nombre,
                c.titulo as caso_titulo,
                c.estado as caso_estado,
                c.id_caso as caso_id
            FROM EntrevistasPreliminar ep
            LEFT JOIN Usuarios u ON ep.usuario_id = u.id_usuario
            LEFT JOIN Casos c ON ep.id_caso_relacionado = c.id_caso
            WHERE ep.id_entrevista_preliminar = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entrevista preliminar no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo entrevista preliminar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar entrevista preliminar
router.put('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const {
            persona_entrevistada,
            tipo_persona,
            correo,
            telefono,
            carrera,
            estamento,
            empresa_servicio,
            unidad,
            resumen_conversacion,
            notas_adicionales,
            fecha_entrevista
        } = req.body;

        if (!persona_entrevistada || !resumen_conversacion) {
            return res.status(400).json({
                error: 'Persona entrevistada y resumen de conversación son requeridos'
            });
        }

        const tiposValidos = ['Docente', 'Estudiante', 'Colaborador', 'Funcionario', 'Administrativo'];
        if (!tipo_persona || !tiposValidos.includes(tipo_persona)) {
            return res.status(400).json({
                error: 'Tipo de persona es requerido y debe ser: Docente, Estudiante, Colaborador, Funcionario o Administrativo'
            });
        }

        // Verificar que la entrevista existe y obtener su afectado relacionado
        const checkResult = await client.query(`
            SELECT evolucionado_a_caso, id_afectado_creado 
            FROM EntrevistasPreliminar 
            WHERE id_entrevista_preliminar = $1
        `, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Entrevista preliminar no encontrada' });
        }

        if (checkResult.rows[0].evolucionado_a_caso) {
            return res.status(400).json({
                error: 'No se puede editar una entrevista que ya evolucionó a caso'
            });
        }

        const id_afectado_creado = checkResult.rows[0].id_afectado_creado;

        // Actualizar el afectado relacionado si existe
        if (id_afectado_creado) {
            await client.query(`
                UPDATE Afectados 
                SET tipo = $1, nombre = $2, correo = $3, telefono = $4, 
                    carrera = $5, estamento = $6, empresa_servicio = $7, unidad = $8
                WHERE id_afectado = $9
            `, [tipo_persona, persona_entrevistada, correo, telefono, carrera, estamento, empresa_servicio, unidad, id_afectado_creado]);
        }

        const fechaFinal = fecha_entrevista ? new Date(fecha_entrevista) : null;

        let updateFields = [];
        let params = [];
        let paramCount = 0;

        updateFields.push(`persona_entrevistada = $${++paramCount}`);
        params.push(persona_entrevistada);

        updateFields.push(`resumen_conversacion = $${++paramCount}`);
        params.push(resumen_conversacion);

        updateFields.push(`tipo_persona = $${++paramCount}`);
        params.push(tipo_persona);

        updateFields.push(`contacto = $${++paramCount}`);
        params.push(correo || telefono); // contacto legacy para compatibilidad

        if (notas_adicionales !== undefined) {
            updateFields.push(`notas_adicionales = $${++paramCount}`);
            params.push(notas_adicionales);
        }

        if (fechaFinal) {
            updateFields.push(`fecha_entrevista = $${++paramCount}`);
            params.push(fechaFinal);
        }

        // Agregar ID para WHERE
        params.push(id);
        const whereParam = `$${++paramCount}`;

        const query = `
            UPDATE EntrevistasPreliminar 
            SET ${updateFields.join(', ')}
            WHERE id_entrevista_preliminar = ${whereParam}
            RETURNING *
        `;

        const result = await client.query(query, params);

        await client.query('COMMIT');

        res.json({
            message: 'Entrevista preliminar actualizada exitosamente',
            entrevista: result.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error actualizando entrevista preliminar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

// Eliminar entrevista preliminar
router.delete('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la entrevista no haya evolucionado a caso
        const checkResult = await pool.query(
            'SELECT evolucionado_a_caso, id_caso_relacionado FROM EntrevistasPreliminar WHERE id_entrevista_preliminar = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Entrevista preliminar no encontrada' });
        }

        if (checkResult.rows[0].evolucionado_a_caso) {
            return res.status(400).json({
                error: 'No se puede eliminar una entrevista que ya evolucionó a caso'
            });
        }

        const result = await pool.query(
            'DELETE FROM EntrevistasPreliminar WHERE id_entrevista_preliminar = $1 RETURNING *',
            [id]
        );

        res.json({
            message: 'Entrevista preliminar eliminada exitosamente',
            entrevista: result.rows[0]
        });
    } catch (error) {
        console.error('Error eliminando entrevista preliminar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Evolucionar entrevista preliminar a caso formal
router.post('/:id/evolucionar', authMiddleware, Verifica('administrador'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const {
            titulo,
            descripcion,
            tipo_fuente = 'entrevista_preliminar'
        } = req.body;

        if (!titulo) {
            return res.status(400).json({ error: 'Título del caso es requerido' });
        }

        // Verificar que la entrevista existe y no ha evolucionado
        const entrevistaResult = await client.query(`
            SELECT ep.*, ep.id_afectado_creado
            FROM EntrevistasPreliminar ep
            WHERE ep.id_entrevista_preliminar = $1
        `, [id]);

        if (entrevistaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Entrevista preliminar no encontrada' });
        }

        const entrevista = entrevistaResult.rows[0];

        if (entrevista.evolucionado_a_caso) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Esta entrevista ya evolucionó a caso'
            });
        }

        // Crear el caso
        const casoResult = await client.query(`
            INSERT INTO Casos (
                titulo, 
                descripcion, 
                fuente, 
                tipo_fuente,
                id_entrevista_preliminar
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            titulo,
            descripcion || `Caso originado desde entrevista preliminar con ${entrevista.persona_entrevistada}`,
            `Entrevista preliminar con ${entrevista.persona_entrevistada}`,
            tipo_fuente,
            id
        ]);

        const nuevoCaso = casoResult.rows[0];

        // Si hay un afectado creado desde la entrevista, agregarlo automáticamente al caso como denunciante
        if (entrevista.id_afectado_creado) {
            await client.query(`
                INSERT INTO RolAfectadoCaso (id_caso, id_afectado, rol)
                VALUES ($1, $2, 'Denunciante')
            `, [nuevoCaso.id_caso, entrevista.id_afectado_creado]);
        }

        // Marcar la entrevista como evolucionada
        await client.query(`
            UPDATE EntrevistasPreliminar 
            SET evolucionado_a_caso = TRUE, id_caso_relacionado = $1
            WHERE id_entrevista_preliminar = $2
        `, [nuevoCaso.id_caso, id]);

        // Registrar acción en bitácora del nuevo caso
        const descripcionBitacora = entrevista.id_afectado_creado
            ? `Caso creado desde entrevista preliminar. Persona entrevistada: ${entrevista.persona_entrevistada} (agregada automáticamente como Denunciante). Resumen: ${entrevista.resumen_conversacion.substring(0, 150)}${entrevista.resumen_conversacion.length > 150 ? '...' : ''}`
            : `Caso creado desde entrevista preliminar. Persona entrevistada: ${entrevista.persona_entrevistada}. Resumen: ${entrevista.resumen_conversacion.substring(0, 200)}${entrevista.resumen_conversacion.length > 200 ? '...' : ''}`;

        await client.query(`
            INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id, color)
            VALUES ($1, $2, $3, $4)
        `, [
            nuevoCaso.id_caso,
            descripcionBitacora,
            req.user.id,
            'bg-success'
        ]);

        await client.query('COMMIT');

        res.status(201).json({
            message: entrevista.id_afectado_creado
                ? 'Entrevista preliminar evolucionada a caso exitosamente. Afectado agregado automáticamente como Denunciante.'
                : 'Entrevista preliminar evolucionada a caso exitosamente',
            caso: nuevoCaso,
            afectado_agregado_automaticamente: !!entrevista.id_afectado_creado,
            entrevista_actualizada: {
                ...entrevista,
                evolucionado_a_caso: true,
                id_caso_relacionado: nuevoCaso.id_caso
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error evolucionando entrevista a caso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

// Obtener estadísticas de entrevistas preliminares
router.get('/estadisticas/resumen', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_entrevistas,
                COUNT(CASE WHEN evolucionado_a_caso = TRUE THEN 1 END) as evolucionadas,
                COUNT(CASE WHEN evolucionado_a_caso = FALSE THEN 1 END) as pendientes,
                COUNT(CASE WHEN tipo_persona = 'Estudiante' THEN 1 END) as estudiantes,
                COUNT(CASE WHEN tipo_persona = 'Docente' THEN 1 END) as docentes,
                COUNT(CASE WHEN tipo_persona = 'Colaborador' THEN 1 END) as colaboradores,
                COUNT(CASE WHEN tipo_persona = 'Externo' THEN 1 END) as externos,
                COUNT(CASE WHEN fecha_entrevista >= NOW() - INTERVAL '30 days' THEN 1 END) as ultimo_mes
            FROM EntrevistasPreliminar
        `);

        res.json(stats.rows[0]);
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;