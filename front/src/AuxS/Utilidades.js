// Utilidades generales para la aplicación

/**
 * Formatea una fecha en un formato más amigable
 * @param {Date} fecha - La fecha a formatear
 * @returns {string} - Fecha formateada como DD/MM/YYYY HH:MM
 */
export const formatearFecha = (fecha) => {
    if (!fecha || !(fecha instanceof Date) || isNaN(fecha)) return 'Fecha inválida';

    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');

    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
};

/**
 * Trunca un texto si es muy largo
 * @param {string} texto - El texto a truncar 
 * @param {number} longitud - Longitud máxima
 * @returns {string} - Texto truncado
 */
export const truncarTexto = (texto, longitud = 100) => {
    if (!texto) return '';
    if (texto.length <= longitud) return texto;
    return texto.substring(0, longitud) + '...';
};
