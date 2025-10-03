const express = require('express');
const router = express.Router();
const pool = require('../../config/DB');
const { authMiddleware, Verifica } = require('../../middleware/TipoUsuario');
const PDFDocument = require('pdfkit');
const xl = require('excel4node');

// Obtener estadísticas generales
router.get('/general', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        let whereClause = '';
        let params = [];
        let paramCount = 0;

        // Agregar filtros de fecha si están presentes
        if (fecha_inicio || fecha_fin) {
            const conditions = [];
            if (fecha_inicio) {
                paramCount++;
                conditions.push(`fecha_creacion >= $${paramCount}`);
                params.push(new Date(fecha_inicio));
            }
            if (fecha_fin) {
                paramCount++;
                const fechaFinCompleta = new Date(fecha_fin);
                fechaFinCompleta.setHours(23, 59, 59, 999);
                conditions.push(`fecha_creacion <= $${paramCount}`);
                params.push(fechaFinCompleta);
            }
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        // Consulta para estadísticas de casos
        const casosQuery = `
            SELECT 
                COUNT(*) as total_casos,
                COUNT(CASE WHEN estado = 'Recepcionado' THEN 1 END) as casos_recepcionados,
                COUNT(CASE WHEN estado = 'En Proceso' THEN 1 END) as casos_en_proceso,
                COUNT(CASE WHEN estado = 'Finalizado' THEN 1 END) as casos_finalizados,
                COUNT(CASE WHEN EXTRACT(MONTH FROM fecha_creacion) = EXTRACT(MONTH FROM CURRENT_DATE) 
                           AND EXTRACT(YEAR FROM fecha_creacion) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) as casos_mes_actual,
                ROUND(AVG(CASE WHEN fecha_finalizacion IS NOT NULL 
                         THEN EXTRACT(EPOCH FROM (fecha_finalizacion - fecha_creacion))/86400 END), 1) as tiempo_promedio_resolucion
            FROM Casos 
            ${whereClause}
        `;

        const casosResult = await pool.query(casosQuery, params);

        // Consulta para estadísticas de entrevistas preliminares
        const entrevistasWhereClause = whereClause.replace(/fecha_creacion/g, 'fecha_entrevista');
        const entrevistasQuery = `
            SELECT 
                COUNT(*) as total_entrevistas,
                COUNT(CASE WHEN evolucionado_a_caso = true THEN 1 END) as entrevistas_evolucionadas,
                COUNT(CASE WHEN EXTRACT(MONTH FROM fecha_entrevista) = EXTRACT(MONTH FROM CURRENT_DATE) 
                           AND EXTRACT(YEAR FROM fecha_entrevista) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) as entrevistas_mes_actual
            FROM EntrevistasPreliminar 
            ${entrevistasWhereClause}
        `;

        const entrevistasResult = await pool.query(entrevistasQuery, params);

        // Consulta para estadísticas de afectados
        const afectadosWhereClause = whereClause.replace(/fecha_creacion/g, 'fecha_creacion');
        const afectadosQuery = `
            SELECT 
                COUNT(*) as total_afectados,
                COUNT(CASE WHEN EXTRACT(MONTH FROM fecha_creacion) = EXTRACT(MONTH FROM CURRENT_DATE) 
                           AND EXTRACT(YEAR FROM fecha_creacion) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) as afectados_mes_actual
            FROM Afectados 
            ${afectadosWhereClause}
        `;

        const afectadosResult = await pool.query(afectadosQuery, params);

        // Calcular métricas adicionales
        const estadisticas = {
            ...casosResult.rows[0],
            ...entrevistasResult.rows[0],
            ...afectadosResult.rows[0],
            promedio_casos_mes: Math.round((parseInt(casosResult.rows[0].total_casos) / 12) * 10) / 10,
            tasa_evolucion: entrevistasResult.rows[0].total_entrevistas > 0
                ? Math.round((entrevistasResult.rows[0].entrevistas_evolucionadas / entrevistasResult.rows[0].total_entrevistas) * 100)
                : 0
        };

        // Convertir strings a números
        Object.keys(estadisticas).forEach(key => {
            if (estadisticas[key] && !isNaN(estadisticas[key])) {
                estadisticas[key] = parseInt(estadisticas[key]) || parseFloat(estadisticas[key]) || 0;
            }
        });

        res.json(estadisticas);
    } catch (error) {
        console.error('Error obteniendo estadísticas generales:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener tendencias por fecha (últimos 12 meses)
router.get('/tendencias', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        let dateCondition = `fecha_creacion >= CURRENT_DATE - INTERVAL '12 months'`;
        let params = [];

        if (fecha_inicio && fecha_fin) {
            dateCondition = `fecha_creacion BETWEEN $1 AND $2`;
            params = [fecha_inicio, fecha_fin + ' 23:59:59'];
        }

        const query = `
            WITH meses AS (
                SELECT 
                    DATE_TRUNC('month', fecha_creacion) as mes,
                    COUNT(*) as casos_creados
                FROM Casos 
                WHERE ${dateCondition}
                GROUP BY DATE_TRUNC('month', fecha_creacion)
            ),
            entrevistas_mes AS (
                SELECT 
                    DATE_TRUNC('month', fecha_entrevista) as mes,
                    COUNT(*) as entrevistas_creadas
                FROM EntrevistasPreliminar 
                WHERE ${dateCondition.replace('fecha_creacion', 'fecha_entrevista')}
                GROUP BY DATE_TRUNC('month', fecha_entrevista)
            )
            SELECT 
                TO_CHAR(COALESCE(m.mes, e.mes), 'YYYY-MM') as mes,
                COALESCE(m.casos_creados, 0) as casos,
                COALESCE(e.entrevistas_creadas, 0) as entrevistas
            FROM meses m
            FULL OUTER JOIN entrevistas_mes e ON m.mes = e.mes
            ORDER BY COALESCE(m.mes, e.mes)
        `;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tendencias:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener distribución por tipos
router.get('/distribucion', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        let whereClause = '';
        let params = [];

        if (fecha_inicio && fecha_fin) {
            whereClause = 'WHERE fecha_creacion BETWEEN $1 AND $2';
            params = [fecha_inicio, fecha_fin + ' 23:59:59'];
        }

        // Distribución por tipo de fuente de casos
        const tiposFuenteQuery = `
            SELECT 
                COALESCE(tipo_fuente, 'Sin especificar') as tipo,
                COUNT(*) as cantidad
            FROM Casos 
            ${whereClause}
            GROUP BY tipo_fuente
            ORDER BY cantidad DESC
        `;

        // Distribución por estado de casos
        const estadosCasosQuery = `
            SELECT 
                estado,
                COUNT(*) as cantidad
            FROM Casos 
            ${whereClause}
            GROUP BY estado
            ORDER BY cantidad DESC
        `;

        // Distribución por forma de finalización
        const formasFinalizacionQuery = `
            SELECT 
                COALESCE(forma_finalizacion, 'En proceso') as forma,
                COUNT(*) as cantidad
            FROM Casos 
            ${whereClause}
            GROUP BY forma_finalizacion
            ORDER BY cantidad DESC
        `;

        const [tiposFuente, estadosCasos, formasFinalizacion] = await Promise.all([
            pool.query(tiposFuenteQuery, params),
            pool.query(estadosCasosQuery, params),
            pool.query(formasFinalizacionQuery, params)
        ]);

        res.json({
            tipos_fuente: tiposFuente.rows,
            estados_casos: estadosCasos.rows,
            formas_finalizacion: formasFinalizacion.rows
        });
    } catch (error) {
        console.error('Error obteniendo distribución:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener estadísticas de afectados
router.get('/afectados', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        let whereClause = '';
        let params = [];

        if (fecha_inicio && fecha_fin) {
            whereClause = 'WHERE fecha_creacion BETWEEN $1 AND $2';
            params = [fecha_inicio, fecha_fin + ' 23:59:59'];
        }

        // Distribución por tipo de afectado
        const tiposAfectadosQuery = `
            SELECT 
                tipo,
                COUNT(*) as cantidad
            FROM Afectados 
            ${whereClause}
            GROUP BY tipo
            ORDER BY cantidad DESC
        `;

        // Distribución por roles en casos
        const rolesQuery = `
            SELECT 
                rac.rol,
                COUNT(*) as cantidad
            FROM RolAfectadoCaso rac
            JOIN Afectados a ON rac.id_afectado = a.id_afectado
            ${whereClause ? whereClause.replace('fecha_creacion', 'a.fecha_creacion') : ''}
            GROUP BY rac.rol
            ORDER BY cantidad DESC
        `;

        // Afectados con múltiples casos
        const afectadosRecurrentesQuery = `
            SELECT 
                a.nombre,
                a.tipo,
                COUNT(DISTINCT rac.id_caso) as total_casos,
                string_agg(DISTINCT rac.rol, ', ') as roles
            FROM Afectados a
            JOIN RolAfectadoCaso rac ON a.id_afectado = rac.id_afectado
            ${whereClause ? whereClause.replace('fecha_creacion', 'a.fecha_creacion') : ''}
            GROUP BY a.id_afectado, a.nombre, a.tipo
            HAVING COUNT(DISTINCT rac.id_caso) > 1
            ORDER BY total_casos DESC
            LIMIT 10
        `;

        const [tiposAfectados, roles, afectadosRecurrentes] = await Promise.all([
            pool.query(tiposAfectadosQuery, params),
            pool.query(rolesQuery, params),
            pool.query(afectadosRecurrentesQuery, params)
        ]);

        // Calcular estadísticas por tipo
        const estadisticasPorTipo = tiposAfectados.rows.reduce((acc, row) => {
            acc[row.tipo.toLowerCase()] = parseInt(row.cantidad);
            return acc;
        }, {});

        res.json({
            tipos_afectados: tiposAfectados.rows,
            roles_en_casos: roles.rows,
            afectados_recurrentes: afectadosRecurrentes.rows,
            estudiantes: estadisticasPorTipo.estudiante || 0,
            docentes: estadisticasPorTipo.docente || 0,
            colaboradores: estadisticasPorTipo.colaborador || 0
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de afectados:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Exportar datos
router.get('/exportar', authMiddleware, Verifica('administrador'), async (req, res) => {
    try {
        const { formato = 'csv', fecha_inicio, fecha_fin } = req.query;

        let whereClause = '';
        let params = [];

        if (fecha_inicio && fecha_fin) {
            whereClause = 'WHERE c.fecha_creacion BETWEEN $1 AND $2';
            params = [fecha_inicio, fecha_fin + ' 23:59:59'];
        }

        // Consulta completa para exportar datos
        const query = `
            SELECT 
                c.id_caso,
                c.titulo,
                c.descripcion,
                c.estado,
                c.tipo_fuente,
                c.forma_finalizacion,
                c.fecha_creacion,
                c.fecha_finalizacion,
                COUNT(DISTINCT rac.id_afectado) as total_afectados,
                string_agg(DISTINCT CONCAT(a.nombre, ' (', rac.rol, ')'), '; ') as afectados_info,
                COUNT(DISTINCT e.id_entrevista) as total_entrevistas,
                COUNT(DISTINCT ab.id_accion) as total_acciones,
                CASE 
                    WHEN c.id_entrevista_preliminar IS NOT NULL THEN 'Evolucionado de entrevista'
                    ELSE 'Creado directamente'
                END as origen
            FROM Casos c
            LEFT JOIN RolAfectadoCaso rac ON c.id_caso = rac.id_caso
            LEFT JOIN Afectados a ON rac.id_afectado = a.id_afectado
            LEFT JOIN Entrevistas e ON c.id_caso = e.id_caso
            LEFT JOIN AccionesBitacora ab ON c.id_caso = ab.id_caso
            ${whereClause}
            GROUP BY c.id_caso, c.titulo, c.descripcion, c.estado, c.tipo_fuente, 
                     c.forma_finalizacion, c.fecha_creacion, c.fecha_finalizacion, c.id_entrevista_preliminar
            ORDER BY c.fecha_creacion DESC
        `;

        const result = await pool.query(query, params);
        const fechaReporte = new Date().toISOString().split('T')[0];

        if (formato === 'csv') {
            // Generar CSV
            const headers = [
                'ID Caso', 'Título', 'Descripción', 'Estado', 'Tipo Fuente',
                'Forma Finalización', 'Fecha Creación', 'Fecha Finalización',
                'Total Afectados', 'Afectados (Rol)', 'Total Entrevistas',
                'Total Acciones', 'Origen'
            ].join(',');

            const csvData = result.rows.map(row => [
                row.id_caso,
                `"${(row.titulo || '').replace(/"/g, '""')}"`,
                `"${(row.descripcion || '').replace(/"/g, '""')}"`,
                row.estado,
                row.tipo_fuente || '',
                row.forma_finalizacion || '',
                row.fecha_creacion ? new Date(row.fecha_creacion).toLocaleDateString('es-ES') : '',
                row.fecha_finalizacion ? new Date(row.fecha_finalizacion).toLocaleDateString('es-ES') : '',
                row.total_afectados,
                `"${(row.afectados_info || '').replace(/"/g, '""')}"`,
                row.total_entrevistas,
                row.total_acciones,
                row.origen
            ].join(',')).join('\n');

            const csvContent = headers + '\n' + csvData;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="reporte_casos_${fechaReporte}.csv"`);
            res.send('\ufeff' + csvContent); // BOM para Excel

        } else if (formato === 'excel') {
            // Generar Excel
            const wb = new xl.Workbook();
            const ws = wb.addWorksheet('Reporte de Casos');

            // Estilos
            const headerStyle = wb.createStyle({
                font: { bold: true, color: '#FFFFFF' },
                fill: { type: 'pattern', patternType: 'solid', fgColor: '#2563EB' },
                alignment: { horizontal: 'center' }
            });

            const cellStyle = wb.createStyle({
                alignment: { horizontal: 'left' },
                border: {
                    left: { style: 'thin', color: '#CCCCCC' },
                    right: { style: 'thin', color: '#CCCCCC' },
                    top: { style: 'thin', color: '#CCCCCC' },
                    bottom: { style: 'thin', color: '#CCCCCC' }
                }
            });

            // Headers
            const headers = [
                'ID Caso', 'Título', 'Descripción', 'Estado', 'Tipo Fuente',
                'Forma Finalización', 'Fecha Creación', 'Fecha Finalización',
                'Total Afectados', 'Afectados (Rol)', 'Total Entrevistas',
                'Total Acciones', 'Origen'
            ];

            headers.forEach((header, index) => {
                ws.cell(1, index + 1).string(header).style(headerStyle);
            });

            // Datos
            result.rows.forEach((row, rowIndex) => {
                const dataRow = rowIndex + 2;
                ws.cell(dataRow, 1).number(row.id_caso).style(cellStyle);
                ws.cell(dataRow, 2).string(row.titulo || '').style(cellStyle);
                ws.cell(dataRow, 3).string(row.descripcion || '').style(cellStyle);
                ws.cell(dataRow, 4).string(row.estado || '').style(cellStyle);
                ws.cell(dataRow, 5).string(row.tipo_fuente || '').style(cellStyle);
                ws.cell(dataRow, 6).string(row.forma_finalizacion || '').style(cellStyle);
                ws.cell(dataRow, 7).string(row.fecha_creacion ? new Date(row.fecha_creacion).toLocaleDateString('es-ES') : '').style(cellStyle);
                ws.cell(dataRow, 8).string(row.fecha_finalizacion ? new Date(row.fecha_finalizacion).toLocaleDateString('es-ES') : '').style(cellStyle);
                ws.cell(dataRow, 9).number(parseInt(row.total_afectados)).style(cellStyle);
                ws.cell(dataRow, 10).string(row.afectados_info || '').style(cellStyle);
                ws.cell(dataRow, 11).number(parseInt(row.total_entrevistas)).style(cellStyle);
                ws.cell(dataRow, 12).number(parseInt(row.total_acciones)).style(cellStyle);
                ws.cell(dataRow, 13).string(row.origen).style(cellStyle);
            });

            // Ajustar ancho de columnas
            ws.column(1).setWidth(10);
            ws.column(2).setWidth(25);
            ws.column(3).setWidth(30);
            ws.column(4).setWidth(15);
            ws.column(5).setWidth(20);
            ws.column(6).setWidth(20);
            ws.column(7).setWidth(15);
            ws.column(8).setWidth(15);
            ws.column(9).setWidth(12);
            ws.column(10).setWidth(35);
            ws.column(11).setWidth(12);
            ws.column(12).setWidth(12);
            ws.column(13).setWidth(20);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="reporte_casos_${fechaReporte}.xlsx"`);

            wb.write(`reporte_casos_${fechaReporte}.xlsx`, res);

        } else if (formato === 'pdf') {
            // Generar PDF
            const doc = new PDFDocument({ margin: 50 });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="reporte_casos_${fechaReporte}.pdf"`);

            doc.pipe(res);

            // Título
            doc.fontSize(20).font('Helvetica-Bold').text('Reporte de Casos de Convivencia', { align: 'center' });
            doc.moveDown();

            // Información del reporte
            doc.fontSize(12).font('Helvetica');
            doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, { align: 'right' });
            if (fecha_inicio && fecha_fin) {
                doc.text(`Período: ${fecha_inicio} - ${fecha_fin}`, { align: 'right' });
            }
            doc.moveDown();

            // Resumen estadístico
            doc.fontSize(14).font('Helvetica-Bold').text('Resumen Estadístico:');
            doc.fontSize(12).font('Helvetica');
            doc.text(`Total de casos: ${result.rows.length}`);

            const estadosCasos = result.rows.reduce((acc, row) => {
                acc[row.estado] = (acc[row.estado] || 0) + 1;
                return acc;
            }, {});

            Object.entries(estadosCasos).forEach(([estado, cantidad]) => {
                doc.text(`- ${estado}: ${cantidad} casos`);
            });

            doc.moveDown();

            // Tabla de datos
            doc.fontSize(14).font('Helvetica-Bold').text('Detalle de Casos:');
            doc.moveDown();

            const tableTop = doc.y;
            const tableLeft = 50;
            const colWidths = [40, 120, 80, 100, 80, 80];

            // Headers de la tabla
            doc.fontSize(10).font('Helvetica-Bold');
            let currentX = tableLeft;
            const headers = ['ID', 'Título', 'Estado', 'Tipo Fuente', 'Afectados', 'Fecha'];
            headers.forEach((header, i) => {
                doc.text(header, currentX, tableTop, { width: colWidths[i], align: 'center' });
                currentX += colWidths[i];
            });

            // Línea separadora
            doc.moveTo(tableLeft, tableTop + 15).lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), tableTop + 15).stroke();

            // Datos de la tabla
            doc.fontSize(9).font('Helvetica');
            let currentY = tableTop + 25;

            result.rows.forEach((row, index) => {
                if (currentY > 700) { // Nueva página si es necesario
                    doc.addPage();
                    currentY = 50;
                }

                currentX = tableLeft;
                const rowData = [
                    row.id_caso.toString(),
                    (row.titulo || '').substring(0, 25) + ((row.titulo || '').length > 25 ? '...' : ''),
                    row.estado || '',
                    (row.tipo_fuente || '').substring(0, 15) + ((row.tipo_fuente || '').length > 15 ? '...' : ''),
                    row.total_afectados.toString(),
                    row.fecha_creacion ? new Date(row.fecha_creacion).toLocaleDateString('es-ES') : ''
                ];

                rowData.forEach((data, i) => {
                    doc.text(data, currentX, currentY, { width: colWidths[i], align: 'center' });
                    currentX += colWidths[i];
                });

                currentY += 20;
            });

            // Pie de página
            doc.fontSize(8).font('Helvetica').text(
                'Reporte generado por Sistema de Gestión de Entrevistas',
                50,
                doc.page.height - 50,
                { align: 'center' }
            );

            doc.end();

        } else {
            res.status(400).json({
                error: 'Formato no soportado',
                formatos_disponibles: ['csv', 'excel', 'pdf']
            });
        }
    } catch (error) {
        console.error('Error en exportación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;