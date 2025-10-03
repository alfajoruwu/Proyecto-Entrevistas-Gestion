const express = require('express');
const router = express.Router();
const pool = require('../../config/DB');
const { authMiddleware, Verifica } = require('../../middleware/TipoUsuario');

// Crear entrevista para un caso
router.post('/casos/:casoId/entrevistas', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { casoId } = req.params;
        const { fecha_hora, lugar, resumen, participantes } = req.body;

        if (!fecha_hora || !lugar) {
            return res.status(400).json({ error: 'Fecha/hora y lugar son requeridos' });
        }

        // Verificar que el caso existe
        const casoExists = await pool.query('SELECT id_caso FROM Casos WHERE id_caso = $1', [casoId]);
        if (casoExists.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        // Comenzar transacción
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Crear la entrevista
            const entrevistaResult = await client.query(`
        INSERT INTO Entrevistas (id_caso, fecha_hora, lugar, resumen)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [casoId, fecha_hora, lugar, resumen]);

            const entrevista = entrevistaResult.rows[0];

            // Agregar participantes si se proporcionan
            if (participantes && Array.isArray(participantes) && participantes.length > 0) {
                for (const participanteId of participantes) {
                    // Verificar que el afectado existe y está relacionado con el caso
                    const afectadoEnCaso = await client.query(`
            SELECT a.id_afectado 
            FROM Afectados a
            JOIN RolAfectadoCaso rac ON a.id_afectado = rac.id_afectado
            WHERE a.id_afectado = $1 AND rac.id_caso = $2
          `, [participanteId, casoId]);

                    if (afectadoEnCaso.rows.length === 0) {
                        throw new Error(`El afectado ${participanteId} no está relacionado con este caso`);
                    }

                    // Agregar participante a la entrevista
                    await client.query(`
            INSERT INTO EntrevistaAfectado (id_entrevista, id_afectado)
            VALUES ($1, $2)
          `, [entrevista.id_entrevista, participanteId]);
                }
            }

            // Registrar acción en bitácora
            await client.query(`
        INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
        VALUES ($1, $2, $3)
      `, [casoId, `Entrevista programada para ${fecha_hora} en ${lugar}`, req.user.id]);

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Entrevista creada exitosamente',
                entrevista: entrevista
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error creando entrevista:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
});

// Listar entrevistas de un caso
router.get('/casos/:casoId/entrevistas', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { casoId } = req.params;

        // Verificar que el caso existe
        const casoExists = await pool.query('SELECT id_caso, titulo FROM Casos WHERE id_caso = $1', [casoId]);
        if (casoExists.rows.length === 0) {
            return res.status(404).json({ error: 'Caso no encontrado' });
        }

        // Obtener entrevistas con participantes
        const entrevistasResult = await pool.query(`
      SELECT 
        e.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id_afectado', a.id_afectado,
              'nombre', a.nombre,
              'tipo', a.tipo,
              'rol_en_caso', rac.rol
            )
          ) FILTER (WHERE a.id_afectado IS NOT NULL), 
          '[]'
        ) as participantes
      FROM Entrevistas e
      LEFT JOIN EntrevistaAfectado ea ON e.id_entrevista = ea.id_entrevista
      LEFT JOIN Afectados a ON ea.id_afectado = a.id_afectado
      LEFT JOIN RolAfectadoCaso rac ON (a.id_afectado = rac.id_afectado AND rac.id_caso = e.id_caso)
      WHERE e.id_caso = $1
      GROUP BY e.id_entrevista
      ORDER BY e.fecha_hora DESC
    `, [casoId]);

        res.json({
            caso: casoExists.rows[0],
            entrevistas: entrevistasResult.rows
        });
    } catch (error) {
        console.error('Error obteniendo entrevistas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener entrevista específica
router.get('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener entrevista con participantes
        const entrevistaResult = await pool.query(`
      SELECT 
        e.*,
        c.titulo as caso_titulo,
        COALESCE(
          json_agg(
            json_build_object(
              'id_afectado', a.id_afectado,
              'nombre', a.nombre,
              'tipo', a.tipo,
              'correo', a.correo,
              'rol_en_caso', rac.rol
            )
          ) FILTER (WHERE a.id_afectado IS NOT NULL), 
          '[]'
        ) as participantes
      FROM Entrevistas e
      JOIN Casos c ON e.id_caso = c.id_caso
      LEFT JOIN EntrevistaAfectado ea ON e.id_entrevista = ea.id_entrevista
      LEFT JOIN Afectados a ON ea.id_afectado = a.id_afectado
      LEFT JOIN RolAfectadoCaso rac ON (a.id_afectado = rac.id_afectado AND rac.id_caso = e.id_caso)
      WHERE e.id_entrevista = $1
      GROUP BY e.id_entrevista, c.titulo
    `, [id]);

        if (entrevistaResult.rows.length === 0) {
            return res.status(404).json({ error: 'Entrevista no encontrada' });
        }

        res.json(entrevistaResult.rows[0]);
    } catch (error) {
        console.error('Error obteniendo entrevista:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar entrevista (principalmente la bitácora)
router.put('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha_hora, lugar, resumen, resultado } = req.body;

        const result = await pool.query(`
      UPDATE Entrevistas 
      SET 
        fecha_hora = COALESCE($1, fecha_hora),
        lugar = COALESCE($2, lugar),
        resumen = COALESCE($3, resumen),
        resultado = COALESCE($4, resultado)
      WHERE id_entrevista = $5
      RETURNING *
    `, [fecha_hora, lugar, resumen, resultado, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entrevista no encontrada' });
        }

        // Si se actualizó el resumen (bitácora), registrar acción
        if (resumen) {
            await pool.query(`
        INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
        VALUES ($1, $2, $3)
      `, [result.rows[0].id_caso, `Bitácora de entrevista actualizada (${result.rows[0].fecha_hora})`, req.user.id]);
        }

        res.json({
            message: 'Entrevista actualizada exitosamente',
            entrevista: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando entrevista:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Añadir participantes a una entrevista
router.post('/:id/participantes', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { participantes } = req.body;

        if (!participantes || !Array.isArray(participantes) || participantes.length === 0) {
            return res.status(400).json({ error: 'Se requiere un array de participantes' });
        }

        // Verificar que la entrevista existe y obtener el caso
        const entrevistaResult = await pool.query(
            'SELECT id_caso FROM Entrevistas WHERE id_entrevista = $1',
            [id]
        );

        if (entrevistaResult.rows.length === 0) {
            return res.status(404).json({ error: 'Entrevista no encontrada' });
        }

        const casoId = entrevistaResult.rows[0].id_caso;

        // Comenzar transacción
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const participantesAgregados = [];

            for (const participanteId of participantes) {
                // Verificar que el afectado existe y está relacionado con el caso
                const afectadoEnCaso = await client.query(`
          SELECT a.nombre 
          FROM Afectados a
          JOIN RolAfectadoCaso rac ON a.id_afectado = rac.id_afectado
          WHERE a.id_afectado = $1 AND rac.id_caso = $2
        `, [participanteId, casoId]);

                if (afectadoEnCaso.rows.length === 0) {
                    throw new Error(`El afectado ${participanteId} no está relacionado con este caso`);
                }

                // Verificar que no esté ya en la entrevista
                const yaEnEntrevista = await client.query(`
          SELECT id FROM EntrevistaAfectado 
          WHERE id_entrevista = $1 AND id_afectado = $2
        `, [id, participanteId]);

                if (yaEnEntrevista.rows.length === 0) {
                    // Agregar participante a la entrevista
                    await client.query(`
            INSERT INTO EntrevistaAfectado (id_entrevista, id_afectado)
            VALUES ($1, $2)
          `, [id, participanteId]);

                    participantesAgregados.push({
                        id_afectado: participanteId,
                        nombre: afectadoEnCaso.rows[0].nombre
                    });
                }
            }

            // Registrar acción en bitácora si se agregaron participantes
            if (participantesAgregados.length > 0) {
                const nombres = participantesAgregados.map(p => p.nombre).join(', ');
                await client.query(`
          INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
          VALUES ($1, $2, $3)
        `, [casoId, `Participantes agregados a entrevista: ${nombres}`, req.user.id]);
            }

            await client.query('COMMIT');

            res.json({
                message: 'Participantes agregados exitosamente',
                participantes_agregados: participantesAgregados
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error agregando participantes:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
});

// Remover participante de entrevista
router.delete('/:id/participantes/:afectadoId', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id, afectadoId } = req.params;

        // Obtener información antes de eliminar
        const infoResult = await pool.query(`
      SELECT e.id_caso, a.nombre
      FROM Entrevistas e
      JOIN EntrevistaAfectado ea ON e.id_entrevista = ea.id_entrevista
      JOIN Afectados a ON ea.id_afectado = a.id_afectado
      WHERE e.id_entrevista = $1 AND a.id_afectado = $2
    `, [id, afectadoId]);

        if (infoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Participante no encontrado en esta entrevista' });
        }

        const { id_caso, nombre } = infoResult.rows[0];

        // Eliminar participante
        const result = await pool.query(`
      DELETE FROM EntrevistaAfectado 
      WHERE id_entrevista = $1 AND id_afectado = $2
      RETURNING *
    `, [id, afectadoId]);

        // Registrar acción en bitácora
        await pool.query(`
      INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
      VALUES ($1, $2, $3)
    `, [id_caso, `Participante removido de entrevista: ${nombre}`, req.user.id]);

        res.json({ message: 'Participante removido de la entrevista exitosamente' });
    } catch (error) {
        console.error('Error removiendo participante:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar entrevista completa
router.delete('/:id', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener información de la entrevista antes de eliminar
        const entrevistaInfo = await pool.query(`
            SELECT e.id_caso, e.fecha_hora, e.lugar
            FROM Entrevistas e
            WHERE e.id_entrevista = $1
        `, [id]);

        if (entrevistaInfo.rows.length === 0) {
            return res.status(404).json({ error: 'Entrevista no encontrada' });
        }

        const { id_caso, fecha_hora, lugar } = entrevistaInfo.rows[0];

        // Comenzar transacción
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Eliminar primero los participantes de la entrevista
            await client.query('DELETE FROM EntrevistaAfectado WHERE id_entrevista = $1', [id]);

            // Eliminar la entrevista
            const result = await client.query('DELETE FROM Entrevistas WHERE id_entrevista = $1 RETURNING *', [id]);

            // Registrar acción en bitácora
            await client.query(`
                INSERT INTO AccionesBitacora (id_caso, descripcion, usuario_id)
                VALUES ($1, $2, $3)
            `, [id_caso, `Entrevista eliminada: ${fecha_hora} en ${lugar}`, req.user.id]);

            await client.query('COMMIT');

            res.json({
                message: 'Entrevista eliminada exitosamente',
                entrevista: result.rows[0]
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error eliminando entrevista:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;