import React, { useState, useEffect } from 'react'
import Navbar from '../../Componentes/Navbar'
import apiClient from '../../AuxS/Axiosinstance'
import { useToast } from '../../Componentes/ToastContext'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js'
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2'
import {
    FaChartBar,
    FaChartPie,
    FaChartLine,
    FaUsers,
    FaClipboardList,
    FaComments,
    FaFilter,
    FaDownload,
    FaCalendarAlt,
    FaSync,
    FaExclamationTriangle,
    FaCheckCircle,
    FaClock,
    FaGraduationCap,
    FaUserTie,
    FaBuilding
} from 'react-icons/fa'

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
)

const Estadisticas = () => {
    const { mostrarToast } = useToast()

    // Estados para datos estadísticos
    const [estadisticasGenerales, setEstadisticasGenerales] = useState(null)
    const [tendenciasCasos, setTendenciasCasos] = useState([])
    const [distribucionTipos, setDistribucionTipos] = useState([])
    const [estadisticasAfectados, setEstadisticasAfectados] = useState(null)
    const [loading, setLoading] = useState(true)

    // Estados para filtros
    const [filtros, setFiltros] = useState({
        fecha_inicio: null,
        fecha_fin: null,
        tipo_reporte: 'general' // 'general', 'casos', 'entrevistas', 'afectados'
    })

    // Estados para la interfaz
    const [mostrarFiltros, setMostrarFiltros] = useState(false)
    const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date())

    useEffect(() => {
        cargarEstadisticas()
    }, [filtros])

    const cargarEstadisticas = async () => {
        try {
            setLoading(true)

            const params = {}
            if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio.toISOString().split('T')[0]
            if (filtros.fecha_fin) params.fecha_fin = filtros.fecha_fin.toISOString().split('T')[0]

            // Cargar estadísticas generales
            const generalResponse = await apiClient.get('/api/estadisticas/general', { params })
            setEstadisticasGenerales(generalResponse.data)

            // Cargar tendencias por fecha
            const tendenciasResponse = await apiClient.get('/api/estadisticas/tendencias', { params })
            setTendenciasCasos(tendenciasResponse.data)

            // Cargar distribución por tipos
            const distribucionResponse = await apiClient.get('/api/estadisticas/distribucion', { params })
            setDistribucionTipos(distribucionResponse.data)

            // Cargar estadísticas de afectados
            const afectadosResponse = await apiClient.get('/api/estadisticas/afectados', { params })
            setEstadisticasAfectados(afectadosResponse.data)

            setUltimaActualizacion(new Date())
        } catch (error) {
            console.error('Error cargando estadísticas:', error)
            mostrarToast('Error al cargar estadísticas', 'error')
        } finally {
            setLoading(false)
        }
    }

    const aplicarFiltros = () => {
        cargarEstadisticas()
        setMostrarFiltros(false)
        mostrarToast('Filtros aplicados correctamente', 'success')
    }

    const limpiarFiltros = () => {
        setFiltros({
            fecha_inicio: null,
            fecha_fin: null,
            tipo_reporte: 'general'
        })
        mostrarToast('Filtros limpiados', 'info')
    }

    const exportarReporte = async (formato) => {
        try {
            const params = {
                formato,
                ...filtros,
                fecha_inicio: filtros.fecha_inicio?.toISOString().split('T')[0],
                fecha_fin: filtros.fecha_fin?.toISOString().split('T')[0]
            }

            const response = await apiClient.get('/api/estadisticas/exportar', {
                params,
                responseType: 'blob'
            })

            // Crear y descargar archivo con la extensión correcta
            const blob = new Blob([response.data])
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url

            // Determinar la extensión correcta del archivo
            let extension = formato
            if (formato === 'excel') {
                extension = 'xlsx'
            }

            link.download = `reporte_estadisticas_${new Date().toISOString().split('T')[0]}.${extension}`
            link.click()
            window.URL.revokeObjectURL(url)

            mostrarToast(`Reporte exportado en formato ${formato.toUpperCase()}`, 'success')
        } catch (error) {
            console.error('Error exportando reporte:', error)
            mostrarToast('Error al exportar reporte', 'error')
        }
    }

    // Configuraciones de gráficos
    const crearGraficoTendencias = () => {
        if (!tendenciasCasos || tendenciasCasos.length === 0) return null

        const data = {
            labels: tendenciasCasos.map(item => {
                const [year, month] = item.mes.split('-')
                const date = new Date(year, month - 1)
                return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
            }),
            datasets: [
                {
                    label: 'Casos Creados',
                    data: tendenciasCasos.map(item => parseInt(item.casos)),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Entrevistas Preliminares',
                    data: tendenciasCasos.map(item => parseInt(item.entrevistas)),
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        }

        const options = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false,
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false,
            }
        }

        return <Line data={data} options={options} />
    }

    const crearGraficoEstados = () => {
        if (!estadisticasGenerales) return null

        const data = {
            labels: ['Recepcionados', 'En Proceso', 'Finalizados', 'En Resolución'],
            datasets: [
                {
                    data: [
                        estadisticasGenerales.casos_recepcionados,
                        estadisticasGenerales.casos_en_proceso,
                        estadisticasGenerales.casos_finalizados,
                        estadisticasGenerales.casos_en_resolucion || 0
                    ],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(34, 197, 94, 0.8)'
                    ],
                    borderColor: [
                        'rgb(59, 130, 246)',
                        'rgb(245, 158, 11)',
                        'rgb(16, 185, 129)',
                        'rgb(34, 197, 94)'
                    ],
                    borderWidth: 2
                }
            ]
        }

        const options = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
            }
        }

        return <Doughnut data={data} options={options} />
    }

    const crearGraficoAfectados = () => {
        if (!estadisticasAfectados) return null

        const data = {
            labels: ['Estudiantes', 'Docentes', 'Colaboradores'],
            datasets: [
                {
                    label: 'Cantidad',
                    data: [
                        estadisticasAfectados.estudiantes,
                        estadisticasAfectados.docentes,
                        estadisticasAfectados.colaboradores
                    ],
                    backgroundColor: [
                        'rgba(139, 69, 19, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(168, 85, 247, 0.8)'
                    ],
                    borderColor: [
                        'rgb(139, 69, 19)',
                        'rgb(34, 197, 94)',
                        'rgb(168, 85, 247)'
                    ],
                    borderWidth: 2
                }
            ]
        }

        const options = {
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }

        return <Bar data={data} options={options} />
    }

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="flex justify-center items-center h-screen">
                    <div className="loading loading-spinner loading-lg text-primary"></div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <Navbar />

            {/* Header */}
            <div className="p-4 bg-base-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <FaChartBar className="text-primary" />
                            Dashboard de Estadísticas
                        </h1>
                        <p className="text-base-content/70 mt-1">
                            Panel de control para análisis y reportes del sistema
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                        >
                            <FaFilter /> Filtros
                        </button>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={cargarEstadisticas}
                        >
                            <FaSync /> Actualizar
                        </button>
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-success btn-sm">
                                <FaDownload /> Exportar
                            </div>
                            <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                                <li><a onClick={() => exportarReporte('pdf')}>📄 Exportar PDF</a></li>
                                <li><a onClick={() => exportarReporte('excel')}>📊 Exportar Excel</a></li>
                                <li><a onClick={() => exportarReporte('csv')}>📝 Exportar CSV</a></li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Información de última actualización */}
                <div className="alert alert-info mb-4">
                    <FaClock />
                    <span>Última actualización: {ultimaActualizacion.toLocaleString('es-ES')}</span>
                </div>

                {/* Panel de filtros */}
                {mostrarFiltros && (
                    <div className="bg-base-100 p-4 rounded-lg shadow mb-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <FaFilter className="text-primary" />
                            Filtros de Reporte
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="label">Fecha de inicio</label>
                                <DatePicker
                                    selected={filtros.fecha_inicio}
                                    onChange={(date) => setFiltros({ ...filtros, fecha_inicio: date })}
                                    className="input input-bordered w-full"
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Seleccionar fecha"
                                    maxDate={new Date()}
                                />
                            </div>

                            <div>
                                <label className="label">Fecha de fin</label>
                                <DatePicker
                                    selected={filtros.fecha_fin}
                                    onChange={(date) => setFiltros({ ...filtros, fecha_fin: date })}
                                    className="input input-bordered w-full"
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Seleccionar fecha"
                                    maxDate={new Date()}
                                    minDate={filtros.fecha_inicio}
                                />
                            </div>

                            <div>
                                <label className="label">Tipo de reporte</label>
                                <select
                                    className="select select-bordered w-full"
                                    value={filtros.tipo_reporte}
                                    onChange={(e) => setFiltros({ ...filtros, tipo_reporte: e.target.value })}
                                >
                                    <option value="general">General</option>
                                    <option value="casos">Solo Casos</option>
                                    <option value="entrevistas">Solo Entrevistas</option>
                                    <option value="afectados">Solo Afectados</option>
                                </select>
                            </div>

                            <div className="flex items-end gap-2">
                                <button
                                    className="btn btn-primary flex-1"
                                    onClick={aplicarFiltros}
                                >
                                    Aplicar
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    onClick={limpiarFiltros}
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Dashboard principal */}
            <div className="p-4">
                {estadisticasGenerales && (
                    <>
                        {/* Métricas principales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="stat bg-base-100 rounded-lg shadow">
                                <div className="stat-figure text-primary">
                                    <FaClipboardList className="text-3xl" />
                                </div>
                                <div className="stat-title">Total Casos</div>
                                <div className="stat-value text-primary">{estadisticasGenerales.total_casos}</div>
                                <div className="stat-desc">
                                    {estadisticasGenerales.casos_mes_actual} este mes
                                </div>
                            </div>

                            <div className="stat bg-base-100 rounded-lg shadow">
                                <div className="stat-figure text-secondary">
                                    <FaComments className="text-3xl" />
                                </div>
                                <div className="stat-title">Entrevistas Preliminares</div>
                                <div className="stat-value text-secondary">{estadisticasGenerales.total_entrevistas}</div>
                                <div className="stat-desc">
                                    {estadisticasGenerales.entrevistas_evolucionadas} evolucionadas
                                </div>
                            </div>

                            <div className="stat bg-base-100 rounded-lg shadow">
                                <div className="stat-figure text-accent">
                                    <FaUsers className="text-3xl" />
                                </div>
                                <div className="stat-title">Total Afectados</div>
                                <div className="stat-value text-accent">{estadisticasGenerales.total_afectados}</div>
                                <div className="stat-desc">
                                    {estadisticasGenerales.afectados_mes_actual} este mes
                                </div>
                            </div>

                            <div className="stat bg-base-100 rounded-lg shadow">
                                <div className="stat-figure text-warning">
                                    <FaCheckCircle className="text-3xl" />
                                </div>
                                <div className="stat-title">Casos Finalizados</div>
                                <div className="stat-value text-warning">{estadisticasGenerales.casos_finalizados}</div>
                                <div className="stat-desc">
                                    {((estadisticasGenerales.casos_finalizados / estadisticasGenerales.total_casos) * 100).toFixed(1)}% del total
                                </div>
                            </div>
                        </div>

                        {/* Estados de casos */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <div className="bg-base-100 p-6 rounded-lg shadow">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <FaChartPie className="text-primary" />
                                    Estados de Casos
                                </h3>
                                <div className="h-64">
                                    {crearGraficoEstados()}
                                </div>
                            </div>

                            {estadisticasAfectados && (
                                <div className="bg-base-100 p-6 rounded-lg shadow">
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        <FaUsers className="text-primary" />
                                        Distribución de Afectados
                                    </h3>
                                    <div className="h-64">
                                        {crearGraficoAfectados()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Estadísticas detalladas de afectados */}
                        {estadisticasAfectados && (
                            <div className="bg-base-100 p-6 rounded-lg shadow mb-6">
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <FaUsers className="text-primary" />
                                    Análisis Detallado de Afectados
                                </h3>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Estadísticas por tipo */}
                                    <div>
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                            <FaGraduationCap className="text-blue-500" />
                                            Por Tipo de Afectado
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                                                <span className="flex items-center gap-2">
                                                    <FaGraduationCap className="text-blue-600" />
                                                    Estudiantes
                                                </span>
                                                <span className="font-bold text-blue-600">
                                                    {estadisticasAfectados.estudiantes}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                                                <span className="flex items-center gap-2">
                                                    <FaUserTie className="text-green-600" />
                                                    Docentes
                                                </span>
                                                <span className="font-bold text-green-600">
                                                    {estadisticasAfectados.docentes}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                                                <span className="flex items-center gap-2">
                                                    <FaBuilding className="text-purple-600" />
                                                    Colaboradores
                                                </span>
                                                <span className="font-bold text-purple-600">
                                                    {estadisticasAfectados.colaboradores}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 p-3 bg-base-200 rounded">
                                            <div className="text-sm text-base-content/70">Total de afectados</div>
                                            <div className="text-2xl font-bold text-primary">
                                                {estadisticasAfectados.estudiantes + estadisticasAfectados.docentes + estadisticasAfectados.colaboradores}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Distribución de roles */}
                                    <div>
                                        <h4 className="font-semibold mb-3">Roles en Casos</h4>
                                        <div className="space-y-2">
                                            {estadisticasAfectados.roles_en_casos && estadisticasAfectados.roles_en_casos.map((rol, index) => (
                                                <div key={index} className="flex justify-between items-center p-2 bg-base-200 rounded">
                                                    <span className="capitalize">{rol.rol}</span>
                                                    <span className="font-bold">{rol.cantidad}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Afectados recurrentes */}
                                    <div>
                                        <h4 className="font-semibold mb-3">Afectados Recurrentes</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {estadisticasAfectados.afectados_recurrentes && estadisticasAfectados.afectados_recurrentes.length > 0 ? (
                                                estadisticasAfectados.afectados_recurrentes.map((afectado, index) => (
                                                    <div key={index} className="p-2 bg-warning/10 border border-warning/20 rounded">
                                                        <div className="font-medium text-sm">{afectado.nombre}</div>
                                                        <div className="text-xs text-base-content/70">
                                                            {afectado.tipo} • {afectado.total_casos} casos
                                                        </div>
                                                        <div className="text-xs text-warning">
                                                            Roles: {afectado.roles}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-sm text-base-content/50 text-center py-4">
                                                    No hay afectados con múltiples casos
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Gráfico de tendencias */}
                        <div className="bg-base-100 p-6 rounded-lg shadow mb-6">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <FaChartLine className="text-primary" />
                                Tendencias por Mes
                            </h3>
                            <div className="h-80">
                                {crearGraficoTendencias()}
                            </div>
                        </div>

                        {/* Información adicional */}
                        <div className="bg-base-100 p-6 rounded-lg shadow">
                            <h3 className="text-xl font-bold mb-4">Resumen del Período</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-primary">{estadisticasGenerales.promedio_casos_mes}</div>
                                    <div className="text-sm text-base-content/70">Promedio casos/mes</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-secondary">{estadisticasGenerales.tiempo_promedio_resolucion}</div>
                                    <div className="text-sm text-base-content/70">Días promedio resolución</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-accent">{estadisticasGenerales.tasa_evolucion}%</div>
                                    <div className="text-sm text-base-content/70">Tasa evolución entrevistas</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default Estadisticas