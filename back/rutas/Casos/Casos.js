const express = require('express');
const router = express.Router();
const pool = require('../../config/DB');
const { authMiddleware, Verifica } = require('../../middleware/TipoUsuario');

// Crear nuevo caso
router.post('/', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { titulo, descripcion, fuente, tipo_fuente } = req.body;

        if (!titulo || !tipo_fuente) {
            return res.status(400).json({ error: 'Título y tipo de fuente son requeridos' });
        }

        // Validar tipos de fuente permitidos
        const tiposValidos = ['derivacion', 'denuncia_presencial', 'denuncia_online', 'entrevista_preliminar'];
        if (!tiposValidos.includes(tipo_fuente)) {
            return res.status(400).json({
                error: 'Tipo de fuente inválido. Debe ser: derivacion, denuncia_presencial, denuncia_online o entrevista_preliminar'
            });
        }

        const result = await pool.query(
            'INSERT INTO Casos (titulo, descripcion, fuente, tipo_fuente) VALUES ($1, $2, $3, $4) RETURNING *',
            [titulo, descripcion, fuente, tipo_fuente]
        );

        res.status(201).json({
            message: 'Caso creado exitosamente',
            caso: result.rows[0]
        });
    } catch (error) {
        console.error('Error creando caso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Listar todos los casos
router.get('/', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { estado, tipo_fuente, participante, busqueda, fechaInicio, fechaFin, page = 1, limit = 10 } = req.query;

        // Validar y convertir parámetros de paginación
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;

        // Validar que sean números válidos
        if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                error: 'Parámetros de paginación inválidos',
                details: 'page debe ser >= 1, limit debe estar entre 1 y 100'
            });
        }

        let whereConditions = [];
        let params = [];
        let paramCount = 0;
        let joins = '';

        // Si hay filtro por participante, agregar JOIN
        if (participante) {
            joins = ` 
                INNER JOIN RolAfectadoCaso rac_filter ON c.id_caso = rac_filter.id_caso 
                INNER JOIN Afectados a_filter ON rac_filter.id_afectado = a_filter.id_afectado
            `;
            paramCount++;
            whereConditions.push(`a_filter.id_afectado = $${paramCount}`);
            params.push(participante);
        }

        // Filtrar por estado
        if (estado) {
            paramCount++;
            whereConditions.push(`c.estado = $${paramCount}`);
            params.push(estado);
        }

        // Filtrar por tipo de fuente
        if (tipo_fuente) {
            paramCount++;
            whereConditions.push(`c.tipo_fuente = $${paramCount}`);
            params.push(tipo_fuente);
        }

        // Filtrar por búsqueda en título y descripción
        if (busqueda) {
            paramCount++;
            whereConditions.push(`(c.titulo ILIKE $${paramCount} OR c.descripcion ILIKE $${paramCount})`);
            params.push(`%${busqueda}%`);
        }

        // Filtrar por fecha de inicio
        if (fechaInicio) {
            paramCount++;
            whereConditions.push(`c.fecha_creacion >= $${paramCount}`);
            params.push(new Date(fechaInicio));
        }

        // Filtrar por fecha de fin
        if (fechaFin) {
            paramCount++;
            // Agregar un día completo hasta las 23:59:59 del día especificado
            const fechaFinCompleta = new Date(fechaFin);
            fechaFinCompleta.setHours(23, 59, 59, 999);
            whereConditions.push(`c.fecha_creacion <= $${paramCount}`);
            params.push(fechaFinCompleta);
        }

        // Consulta principal con afectados e información de entrevista preliminar
        let query = `
            SELECT 
                c.*,
                ep.persona_entrevistada as entrevista_persona,
                ep.fecha_entrevista as entrevista_fecha,
                ep.resumen_conversacion as entrevista_resumen,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id_afectado', a.id_afectado,
                            'nombre', a.nombre,
                            'tipo', a.tipo,
                            'rol', rac.rol
                        ) ORDER BY rac.fecha_asignacion
                    ) FILTER (WHERE a.id_afectado IS NOT NULL), 
                    '[]'
                ) as afectados
            FROM Casos c
            LEFT JOIN RolAfectadoCaso rac ON c.id_caso = rac.id_caso
            LEFT JOIN Afectados a ON rac.id_afectado = a.id_afectado
            LEFT JOIN EntrevistasPreliminar ep ON c.id_entrevista_preliminar = ep.id_entrevista_preliminar
            ${joins}
        `;

        let countQuery = `SELECT COUNT(DISTINCT c.id_caso) FROM Casos c 
                         LEFT JOIN EntrevistasPreliminar ep ON c.id_entrevista_preliminar = ep.id_entrevista_preliminar 
                         ${joins}`;

        if (whereConditions.length > 0) {
            const whereClause = ' WHERE ' + whereConditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        query += ' GROUP BY c.id_caso, ep.persona_entrevistada, ep.fecha_entrevista, ep.resumen_conversacion ORDER BY c.fecha_creacion DESC';        // Paginación con valores validados
        const offset = (pageNum - 1) * limitNum;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limitNum, offset);

        const result = await pool.query(query, params);

        // Contar total para paginación (sin limit/offset)
        const countResult = await pool.query(countQuery, params.slice(0, paramCount));
        const total = parseInt(countResult.rows[0].count);

        res.json({
            casos: result.rows,
            total,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Error obteniendo casos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener caso específico con afectados
router.get('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener información del caso con entrevista preliminar si existe
        const casoResult = await pool.query(`
            SELECT c.*, 
                   ep.persona_entrevistada as entrevista_persona,
                   ep.fecha_entrevista as entrevista_fecha,
                   ep.resumen_conversacion as entrevista_resumen,
                   ep.notas_adicionales as entrevista_notas
            FROM Casos c
            LEFT JOIN EntrevistasPreliminar ep ON c.id_entrevista_preliminar = ep.id_entrevista_preliminar
            WHERE c.id_caso = $1
        `, [id]);

        if (casoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        // Obtener afectados del caso
        const afectadosResult = await pool.query(`
      SELECT a.*, rac.rol, rac.fecha_asignacion
      FROM Afectados a
      JOIN RolAfectadoCaso rac ON a.id_afectado = rac.id_afectado
      WHERE rac.id_caso = $1
    `, [id]);

        // Obtener conteo de entrevistas
        const entrevistasCount = await pool.query(
            'SELECT COUNT(*) FROM Entrevistas WHERE id_caso = $1',
            [id]
        );

        // Obtener conteo de acciones
        const accionesCount = await pool.query(
            'SELECT COUNT(*) FROM AccionesBitacora WHERE id_caso = $1',
            [id]
        );

        const caso = casoResult.rows[0];

        res.json({
            ...caso,
            afectados: afectadosResult.rows,
            contadores: {
                entrevistas: parseInt(entrevistasCount.rows[0].count),
                acciones: parseInt(accionesCount.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Error obteniendo caso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar información del caso
router.put('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion, fuente, tipo_fuente, fecha_creacion } = req.body;

        // Construir consulta dinámicamente
        let updateFields = [];
        let params = [];
        let paramCount = 0;

        if (titulo) {
            updateFields.push(`titulo = $${++paramCount}`);
            params.push(titulo);
        }
        if (descripcion !== undefined) {
            updateFields.push(`descripcion = $${++paramCount}`);
            params.push(descripcion);
        }
        if (fuente !== undefined) {
            updateFields.push(`fuente = $${++paramCount}`);
            params.push(fuente);
        }
        if (tipo_fuente) {
            // Validar tipos de fuente permitidos
            const tiposValidos = ['derivacion', 'denuncia_presencial', 'denuncia_online', 'entrevista_preliminar'];
            if (!tiposValidos.includes(tipo_fuente)) {
                return res.status(400).json({
                    error: 'Tipo de fuente inválido. Debe ser: derivacion, denuncia_presencial, denuncia_online o entrevista_preliminar'
                });
            }
            updateFields.push(`tipo_fuente = $${++paramCount}`);
            params.push(tipo_fuente);
        }
        if (fecha_creacion) {
            updateFields.push(`fecha_creacion = $${++paramCount}`);
            params.push(new Date(fecha_creacion));
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        // Agregar ID para WHERE
        params.push(id);
        const whereParam = `$${++paramCount}`;

        const query = `
            UPDATE Casos 
            SET ${updateFields.join(', ')}
            WHERE id_caso = ${whereParam}
            RETURNING *
        `;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        res.json({
            message: 'Caso actualizado exitosamente',
            caso: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando caso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cambiar estado del caso (incluyendo regresión)
router.put('/:id/estado', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['Recepcionado', 'En Proceso', 'Finalizado', 'Resolución'];

        if (!estado || !estadosValidos.includes(estado)) {
            return res.status(400).json({
                error: 'Estado inválido. Debe ser: Recepcionado, En Proceso, Finalizado o Resolución'
            });
        }

        // Obtener el estado actual del caso
        const casoActual = await pool.query('SELECT estado FROM Casos WHERE id_caso = $1', [id]);

        if (casoActual.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        const estadoActual = casoActual.rows[0].estado;

        // Validar que no se pueda retroceder a estados anteriores desde Resolución
        if (estadoActual === 'Resolución' && estado !== 'En Proceso') {
            return res.status(400).json({
                error: 'Desde Resolución solo se puede volver a En Proceso'
            });
        }

        // Si se regresa de Finalizado, limpiar campos de finalización
        let query = 'UPDATE Casos SET estado = $1';
        let params = [estado, id];

        if (estado !== 'Finalizado' && estado !== 'Resolución') {
            query += ', forma_finalizacion = NULL, fecha_finalizacion = NULL, comentarios_finalizacion = NULL';
        }

        query += ' WHERE id_caso = $2 RETURNING *';

        const result = await pool.query(query, params);

        // Registrar acción en bitácora
        await pool.query(`
      INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
      VALUES ($1, $2, $3)
    `, [id, `Estado cambiado a: ${estado}`, req.user.id]);

        res.json({
            message: 'Estado del caso actualizado exitosamente',
            caso: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Finalizar caso
router.put('/:id/finalizar', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { forma_finalizacion, comentarios, fecha_finalizacion } = req.body;

        const formasValidas = ['Acuerdo', 'Derivacion', 'Frustrado'];

        if (!forma_finalizacion || !formasValidas.includes(forma_finalizacion)) {
            return res.status(400).json({
                error: 'Forma de finalización inválida. Debe ser: Acuerdo, Derivacion o Frustrado'
            });
        }

        // Usar fecha proporcionada o timestamp actual
        const fechaFinal = fecha_finalizacion ? new Date(fecha_finalizacion) : new Date();

        const result = await pool.query(`
      UPDATE Casos 
      SET estado = 'Finalizado',
          forma_finalizacion = $1,
          fecha_finalizacion = $2,
          comentarios_finalizacion = $3
      WHERE id_caso = $4
      RETURNING *
    `, [forma_finalizacion, fechaFinal, comentarios || null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        // Registrar acción en bitácora
        const descripcionAccion = comentarios
            ? `Caso finalizado con modalidad: ${forma_finalizacion}. Comentarios: ${comentarios}`
            : `Caso finalizado con modalidad: ${forma_finalizacion}`;

        await pool.query(`
      INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
      VALUES ($1, $2, $3)
    `, [id, descripcionAccion, req.user.id]); res.json({
            message: 'Caso finalizado exitosamente',
            caso: result.rows[0]
        });
    } catch (error) {
        console.error('Error finalizando caso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cambiar caso a resolución (solo desde estado Finalizado)
router.put('/:id/resolver', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { resolucion } = req.body;

        if (!resolucion) {
            return res.status(400).json({
                error: 'La resolución es requerida'
            });
        }

        // Verificar que el caso existe
        const casoActual = await pool.query('SELECT * FROM Casos WHERE id_caso = $1', [id]);

        if (casoActual.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        // Verificar que el caso no esté ya en resolución
        if (casoActual.rows[0].estado === 'Resolución') {
            return res.status(400).json({
                error: 'El caso ya está en estado de Resolución',
                estadoActual: casoActual.rows[0].estado
            });
        }

        // Actualizar el caso con la resolución
        const result = await pool.query(`
            UPDATE Casos 
            SET estado = 'Resolución',
                resolucion = $1,
                fecha_resolucion = NOW()
            WHERE id_caso = $2
            RETURNING *
        `, [resolucion, id]);

        // Registrar acción en bitácora
        const descripcionAccion = `Caso resuelto. Resolución: ${resolucion}`;

        await pool.query(`
            INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
            VALUES ($1, $2, $3)
        `, [id, descripcionAccion, req.user.id]);

        res.json({
            message: 'Caso cambiado a resolución exitosamente',
            caso: result.rows[0]
        });
    } catch (error) {
        console.error('Error cambiando caso a resolución:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar caso
router.delete('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el caso existe
        const casoExiste = await pool.query('SELECT * FROM Casos WHERE id_caso = $1', [id]);
        if (casoExiste.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        // Eliminar registros relacionados primero (por las foreign keys)
        await pool.query('DELETE FROM AccionesBitacora WHERE id_caso = $1', [id]);
        await pool.query('DELETE FROM EntrevistaAfectado WHERE id_entrevista IN (SELECT id_entrevista FROM Entrevistas WHERE id_caso = $1)', [id]);
        await pool.query('DELETE FROM Entrevistas WHERE id_caso = $1', [id]);
        await pool.query('DELETE FROM RolAfectadoCaso WHERE id_caso = $1', [id]);

        // Finalmente eliminar el caso
        await pool.query('DELETE FROM Casos WHERE id_caso = $1', [id]);

        res.json({
            message: 'Caso eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando caso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;