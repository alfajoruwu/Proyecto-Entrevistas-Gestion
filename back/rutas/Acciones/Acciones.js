const express = require('express');
const router = express.Router();
const pool = require('../../config/DB');
const { authMiddleware, Verifica } = require('../../middleware/TipoUsuario');

// Registrar nueva acción en un caso
router.post('/casos/:casoId/acciones', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { casoId } = req.params;
        const { descripcion, color } = req.body;

        if (!descripcion) {
            return res.status(400).json({ error: 'Descripción es requerida' });
        }

        // Verificar que el caso existe
        const casoExists = await pool.query('SELECT id_caso FROM Casos WHERE id_caso = $1', [casoId]);
        if (casoExists.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        const result = await pool.query(`
      INSERT INTO AccionesBitacora (id_caso, descripcion, color, usuario_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [casoId, descripcion, color || 'bg-primary', req.user.id]);

        res.status(201).json({
            message: 'Acción registrada exitosamente',
            accion: result.rows[0]
        });
    } catch (error) {
        console.error('Error registrando acción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Listar acciones de un caso
router.get('/casos/:casoId/acciones', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { casoId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        // Verificar que el caso existe
        const casoResult = await pool.query('SELECT id_caso, titulo FROM Casos WHERE id_caso = $1', [casoId]);
        if (casoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        // Obtener acciones con información del usuario
        const offset = (page - 1) * limit;
        const accionesResult = await pool.query(`
      SELECT 
        ab.*,
        u.nombre as usuario_nombre
      FROM AccionesBitacora ab
      LEFT JOIN Usuarios u ON ab.usuario_id = u.id_usuario
      WHERE ab.id_caso = $1
      ORDER BY ab.fecha DESC
      LIMIT $2 OFFSET $3
    `, [casoId, limit, offset]);

        // Contar total para paginación
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM AccionesBitacora WHERE id_caso = $1',
            [casoId]
        );
        const total = parseInt(countResult.rows[0].count);

        res.json({
            caso: casoResult.rows[0],
            acciones: accionesResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error obteniendo acciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener acción específica
router.get('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        ab.*,
        u.nombre as usuario_nombre,
        c.titulo as caso_titulo
      FROM AccionesBitacora ab
      LEFT JOIN Usuarios u ON ab.usuario_id = u.id_usuario
      LEFT JOIN Casos c ON ab.id_caso = c.id_caso
      WHERE ab.id_accion = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Acción no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo acción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar acción (principalmente para agregar o modificar información)
router.put('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion, color } = req.body;

        const result = await pool.query(`
      UPDATE AccionesBitacora 
      SET 
        descripcion = COALESCE($1, descripcion),
        color = COALESCE($2, color)
      WHERE id_accion = $3
      RETURNING *
    `, [descripcion, color, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Acción no encontrada' });
        }

        res.json({
            message: 'Acción actualizada exitosamente',
            accion: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando acción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar acción (solo si fue creada por error)
router.delete('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      DELETE FROM AccionesBitacora 
      WHERE id_accion = $1
      RETURNING *
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Acción no encontrada' });
        }

        res.json({ message: 'Acción eliminada exitosamente' });
    } catch (error) {
        console.error('Error eliminando acción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener timeline completo de un caso (acciones + eventos importantes)
router.get('/casos/:casoId/timeline', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { casoId } = req.params;

        // Verificar que el caso existe
        const casoResult = await pool.query('SELECT * FROM Casos WHERE id_caso = $1', [casoId]);
        if (casoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        // Obtener timeline combinado
        const timelineResult = await pool.query(`
      SELECT 
        'accion' as tipo,
        ab.id_accion as id,
        ab.descripcion,
        ab.fecha,
        u.nombre as usuario_nombre,
        NULL as detalles_extra
      FROM AccionesBitacora ab
      LEFT JOIN Usuarios u ON ab.usuario_id = u.id_usuario
      WHERE ab.id_caso = $1

      UNION ALL

      SELECT 
        'entrevista' as tipo,
        e.id_entrevista as id,
        CONCAT('Entrevista programada: ', e.lugar) as descripcion,
        COALESCE(e.fecha_hora, e.fecha_creacion) as fecha,
        NULL as usuario_nombre,
        json_build_object('lugar', e.lugar, 'fecha_hora', e.fecha_hora) as detalles_extra
      FROM Entrevistas e
      WHERE e.id_caso = $1

      UNION ALL

      SELECT 
        'cambio_estado' as tipo,
        NULL as id,
        CONCAT('Caso creado con estado: ', c.estado) as descripcion,
        c.fecha_creacion as fecha,
        NULL as usuario_nombre,
        json_build_object('estado', c.estado) as detalles_extra
      FROM Casos c
      WHERE c.id_caso = $1

      ORDER BY fecha DESC
    `, [casoId]);

        res.json({
            caso: casoResult.rows[0],
            timeline: timelineResult.rows
        });
    } catch (error) {
        console.error('Error obteniendo timeline:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;