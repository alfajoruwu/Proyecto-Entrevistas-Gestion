import React, { useState, useEffect } from 'react'
import Navbar from '../../Componentes/Navbar'
import apiClient from '../../AuxS/Axiosinstance'
import { useToast } from '../../Componentes/ToastContext'
import { useNavigate } from 'react-router-dom'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import {
    FaUser,
    FaComments,
    FaPlus,
    FaEdit,
    FaTrash,
    FaEye,
    FaArrowRight,
    FaSearch,
    FaFilter,
    FaUsers,
    FaGraduationCap,
    FaBuilding,
    FaUserTie,
    FaTimes,
    FaSave,
    FaExternalLinkAlt
} from 'react-icons/fa'

const EntrevistaPreliminar = () => {
    const { mostrarToast } = useToast()
    const navigate = useNavigate()

    // Estados principales
    const [entrevistas, setEntrevistas] = useState([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')

    // Filtros
    const [filtrosActivos, setFiltrosActivos] = useState(false)
    const [filtros, setFiltros] = useState({
        tipo_persona: '',
        evolucionado: '',
        fecha_inicio: null,
        fecha_fin: null
    })

    // Estados para nueva entrevista
    const [nuevaEntrevista, setNuevaEntrevista] = useState({
        persona_entrevistada: '',
        tipo_persona: '',
        correo: '',
        telefono: '',
        carrera: '',
        cargo: '',
        empresa_servicio: '',
        unidad: '',
        resumen_conversacion: '',
        notas_adicionales: '',
        fecha_entrevista: new Date()
    })

    // Estados para editar entrevista
    const [entrevistaEditando, setEntrevistaEditando] = useState(null)

    // Estados para evolucionar a caso
    const [entrevistaEvolucionando, setEntrevistaEvolucionando] = useState(null)
    const [datosCaso, setDatosCaso] = useState({
        titulo: '',
        descripcion: ''
    })

    // Estados para vista detallada
    const [entrevistaDetalle, setEntrevistaDetalle] = useState(null)

    // Estadísticas
    const [estadisticas, setEstadisticas] = useState(null)

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1)
    const [totalPaginas, setTotalPaginas] = useState(1)
    const [totalEntrevistas, setTotalEntrevistas] = useState(0)
    const entrevistasPorPagina = 10

    // Cargar entrevistas al montar el componente
    useEffect(() => {
        cargarEntrevistas(1)
        cargarEstadisticas()
    }, [])

    // Recargar entrevistas cuando cambien filtros o búsqueda
    useEffect(() => {
        cargarEntrevistas(1)
    }, [filtros, busqueda])

    const cargarEntrevistas = async (pagina = paginaActual) => {
        try {
            setLoading(true)

            const params = {
                page: pagina,
                limit: entrevistasPorPagina
            }

            // Agregar filtros solo si tienen valor
            if (filtros.tipo_persona) params.tipo_persona = filtros.tipo_persona
            if (filtros.evolucionado !== '') params.evolucionado = filtros.evolucionado
            if (busqueda) params.busqueda = busqueda

            // Convertir fechas a formato ISO
            if (filtros.fecha_inicio) {
                params.fecha_inicio = filtros.fecha_inicio.toISOString().split('T')[0]
            }
            if (filtros.fecha_fin) {
                params.fecha_fin = filtros.fecha_fin.toISOString().split('T')[0]
            }

            const response = await apiClient.get('/api/entrevistas-preliminar', { params })

            setEntrevistas(response.data.entrevistas || [])
            setTotalEntrevistas(response.data.total || 0)
            setTotalPaginas(Math.ceil((response.data.total || 0) / entrevistasPorPagina))
            setPaginaActual(pagina)
        } catch (error) {
            console.error('Error cargando entrevistas:', error)
            mostrarToast('Error al cargar entrevistas preliminares', 'error')
        } finally {
            setLoading(false)
        }
    }

    const cargarEstadisticas = async () => {
        try {
            const response = await apiClient.get('/api/entrevistas-preliminar/estadisticas/resumen')
            setEstadisticas(response.data)
        } catch (error) {
            console.error('Error cargando estadísticas:', error)
        }
    }

    const handleCrearEntrevista = async () => {
        try {
            if (!nuevaEntrevista.persona_entrevistada || !nuevaEntrevista.resumen_conversacion) {
                mostrarToast('Persona entrevistada y resumen son requeridos', 'error')
                return
            }

            const entrevistaData = {
                ...nuevaEntrevista,
                fecha_entrevista: nuevaEntrevista.fecha_entrevista.toISOString()
            }

            await apiClient.post('/api/entrevistas-preliminar', entrevistaData)
            mostrarToast('Entrevista preliminar registrada exitosamente', 'success')

            // Cerrar modal y limpiar formulario
            document.getElementById('modal_crear_entrevista').close()
            setNuevaEntrevista({
                persona_entrevistada: '',
                tipo_persona: '',
                correo: '',
                telefono: '',
                carrera: '',
                cargo: '',
                empresa_servicio: '',
                unidad: '',
                resumen_conversacion: '',
                notas_adicionales: '',
                fecha_entrevista: new Date()
            })

            // Recargar entrevistas y estadísticas
            cargarEntrevistas()
            cargarEstadisticas()
        } catch (error) {
            console.error('Error creando entrevista:', error)
            mostrarToast(error.response?.data?.error || 'Error al registrar entrevista', 'error')
        }
    }

    const handleActualizarEntrevista = async () => {
        try {
            if (!entrevistaEditando) return

            const entrevistaData = {
                persona_entrevistada: entrevistaEditando.persona_entrevistada,
                tipo_persona: entrevistaEditando.tipo_persona,
                correo: entrevistaEditando.correo,
                telefono: entrevistaEditando.telefono,
                carrera: entrevistaEditando.carrera,
                cargo: entrevistaEditando.cargo,
                empresa_servicio: entrevistaEditando.empresa_servicio,
                unidad: entrevistaEditando.unidad,
                resumen_conversacion: entrevistaEditando.resumen_conversacion,
                notas_adicionales: entrevistaEditando.notas_adicionales,
                fecha_entrevista: entrevistaEditando.fecha_entrevista
            }

            await apiClient.put(`/api/entrevistas-preliminar/${entrevistaEditando.id_entrevista_preliminar}`, entrevistaData)
            mostrarToast('Entrevista actualizada exitosamente', 'success')

            // Cerrar modal
            document.getElementById('modal_editar_entrevista').close()
            setEntrevistaEditando(null)

            // Recargar entrevistas
            cargarEntrevistas()
        } catch (error) {
            console.error('Error actualizando entrevista:', error)
            mostrarToast(error.response?.data?.error || 'Error al actualizar entrevista', 'error')
        }
    }

    const handleEliminarEntrevista = async (entrevistaId) => {
        try {
            const confirmacion = window.confirm('¿Estás seguro de que quieres eliminar esta entrevista preliminar? Esta acción no se puede deshacer.')

            if (!confirmacion) return

            await apiClient.delete(`/api/entrevistas-preliminar/${entrevistaId}`)
            mostrarToast('Entrevista eliminada exitosamente', 'success')
            cargarEntrevistas()
            cargarEstadisticas()
        } catch (error) {
            console.error('Error eliminando entrevista:', error)
            mostrarToast(error.response?.data?.error || 'Error al eliminar entrevista', 'error')
        }
    }

    const handleEvolucionarACaso = async () => {
        try {
            if (!entrevistaEvolucionando || !datosCaso.titulo) {
                mostrarToast('Título del caso es requerido', 'error')
                return
            }

            const response = await apiClient.post(`/api/entrevistas-preliminar/${entrevistaEvolucionando.id_entrevista_preliminar}/evolucionar`, datosCaso)

            mostrarToast('Entrevista evolucionada a caso exitosamente', 'success')

            // Cerrar modal y limpiar
            document.getElementById('modal_evolucionar_caso').close()
            setEntrevistaEvolucionando(null)
            setDatosCaso({ titulo: '', descripcion: '' })

            // Recargar datos
            cargarEntrevistas()
            cargarEstadisticas()

            // Opcional: navegar al caso creado
            if (response.data.caso) {
                const confirmar = window.confirm('¿Quieres ir al caso creado ahora?')
                if (confirmar) {
                    navigate(`/Casos/${response.data.caso.id_caso}`)
                }
            }
        } catch (error) {
            console.error('Error evolucionando a caso:', error)
            mostrarToast(error.response?.data?.error || 'Error al evolucionar a caso', 'error')
        }
    }

    const abrirEditarEntrevista = (entrevista) => {
        setEntrevistaEditando({
            ...entrevista,
            fecha_entrevista: new Date(entrevista.fecha_entrevista)
        })
        document.getElementById('modal_editar_entrevista').showModal()
    }

    const abrirEvolucionarCaso = (entrevista) => {
        setEntrevistaEvolucionando(entrevista)
        setDatosCaso({
            titulo: `Caso de ${entrevista.persona_entrevistada}`,
            descripcion: `Caso originado desde entrevista preliminar.\n\nResumen de la entrevista:\n${entrevista.resumen_conversacion}`
        })
        document.getElementById('modal_evolucionar_caso').showModal()
    }

    const abrirDetalleEntrevista = async (entrevista) => {
        try {
            const response = await apiClient.get(`/api/entrevistas-preliminar/${entrevista.id_entrevista_preliminar}`)
            setEntrevistaDetalle(response.data)
            document.getElementById('modal_detalle_entrevista').showModal()
        } catch (error) {
            console.error('Error cargando detalle:', error)
            mostrarToast('Error al cargar detalle de la entrevista', 'error')
        }
    }

    const getTipoPersonaIcon = (tipo) => {
        switch (tipo) {
            case 'Estudiante': return <FaGraduationCap className="text-blue-500" />
            case 'Docente': return <FaUserTie className="text-green-500" />
            case 'Colaborador': return <FaBuilding className="text-purple-500" />
            case 'Externo': return <FaUser className="text-gray-500" />
            default: return <FaUser className="text-gray-400" />
        }
    }

    const getTipoPersonaBadgeColor = (tipo) => {
        switch (tipo) {
            case 'Estudiante': return 'badge-info'
            case 'Docente': return 'badge-success'
            case 'Colaborador': return 'badge-warning'
            case 'Externo': return 'badge-neutral'
            default: return 'badge-ghost'
        }
    }

    return (
        <div>
            <Navbar />

            {/* Header con estadísticas */}
            <div className="p-4 bg-base-200">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FaComments className="text-primary" />
                        Entrevistas Preliminares
                    </h1>
                    <button
                        className="btn btn-primary flex items-center gap-2"
                        onClick={() => {
                            setNuevaEntrevista({
                                persona_entrevistada: '',
                                tipo_persona: '',
                                correo: '',
                                telefono: '',
                                carrera: '',
                                cargo: '',
                                empresa_servicio: '',
                                unidad: '',
                                resumen_conversacion: '',
                                notas_adicionales: '',
                                fecha_entrevista: new Date()
                            })
                            document.getElementById('modal_crear_entrevista').showModal()
                        }}
                    >
                        <FaPlus /> Nueva Entrevista
                    </button>
                </div>

                {/* Estadísticas */}
                {estadisticas && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center gap-2">
                                <FaComments className="text-2xl text-primary" />
                                <div>
                                    <p className="text-sm text-gray-600">Total</p>
                                    <p className="text-xl font-bold">{estadisticas.total_entrevistas}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center gap-2">
                                <FaArrowRight className="text-2xl text-success" />
                                <div>
                                    <p className="text-sm text-gray-600">Evolucionadas</p>
                                    <p className="text-xl font-bold">{estadisticas.evolucionadas}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center gap-2">
                                <FaUsers className="text-2xl text-warning" />
                                <div>
                                    <p className="text-sm text-gray-600">Pendientes</p>
                                    <p className="text-xl font-bold">{estadisticas.pendientes}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                            <div className="flex items-center gap-2">
                                <FaGraduationCap className="text-2xl text-info" />
                                <div>
                                    <p className="text-sm text-gray-600">Último mes</p>
                                    <p className="text-xl font-bold">{estadisticas.ultimo_mes}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Búsqueda y filtros */}
            <div className='flex flex-col gap-4 p-4'>
                <div className='flex gap-2'>
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            className='input input-bordered w-full pl-10'
                            placeholder='Buscar por persona entrevistada o contenido de la conversación...'
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setFiltrosActivos(!filtrosActivos)}
                        className={`btn ${filtrosActivos ? 'btn-primary' : 'btn-outline'} flex items-center gap-2`}
                    >
                        <FaFilter /> Filtros
                    </button>
                </div>

                {/* Panel de filtros */}
                {filtrosActivos && (
                    <div className='bg-base-200 p-4 rounded-lg'>
                        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                            <div>
                                <label className='text-sm font-semibold mb-1 block'>Tipo de persona:</label>
                                <select
                                    className='select select-bordered select-sm w-full'
                                    value={filtros.tipo_persona}
                                    onChange={(e) => setFiltros({ ...filtros, tipo_persona: e.target.value })}
                                >
                                    <option value="">Todos los tipos</option>
                                    <option value="Estudiante">Estudiante</option>
                                    <option value="Docente">Docente</option>
                                    <option value="Colaborador">Colaborador</option>
                                    <option value="Externo">Externo</option>
                                </select>
                            </div>

                            <div>
                                <label className='text-sm font-semibold mb-1 block'>Estado:</label>
                                <select
                                    className='select select-bordered select-sm w-full'
                                    value={filtros.evolucionado}
                                    onChange={(e) => setFiltros({ ...filtros, evolucionado: e.target.value })}
                                >
                                    <option value="">Todos los estados</option>
                                    <option value="false">Pendientes</option>
                                    <option value="true">Evolucionadas a caso</option>
                                </select>
                            </div>

                            <div>
                                <label className='text-sm font-semibold mb-1 block'>Fecha desde:</label>
                                <DatePicker
                                    selected={filtros.fecha_inicio}
                                    onChange={(date) => setFiltros({ ...filtros, fecha_inicio: date })}
                                    className='input input-bordered input-sm w-full'
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Desde..."
                                />
                            </div>

                            <div>
                                <label className='text-sm font-semibold mb-1 block'>Fecha hasta:</label>
                                <DatePicker
                                    selected={filtros.fecha_fin}
                                    onChange={(date) => setFiltros({ ...filtros, fecha_fin: date })}
                                    className='input input-bordered input-sm w-full'
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Hasta..."
                                />
                            </div>
                        </div>

                        <div className='flex justify-end gap-2 mt-4'>
                            <button
                                onClick={() => {
                                    setFiltros({
                                        tipo_persona: '',
                                        evolucionado: '',
                                        fecha_inicio: null,
                                        fecha_fin: null
                                    })
                                    setPaginaActual(1)
                                }}
                                className='btn btn-sm btn-ghost'
                            >
                                Limpiar filtros
                            </button>
                            <button
                                onClick={() => {
                                    setPaginaActual(1)
                                    cargarEntrevistas(1)
                                }}
                                className='btn btn-sm btn-primary'
                            >
                                Aplicar filtros
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista de entrevistas */}
            <div className="p-4">
                <h2 className="text-xl font-bold mb-4">
                    Entrevistas Registradas ({entrevistas.length})
                </h2>

                {loading ? (
                    <div className="text-center">
                        <span className="loading loading-spinner loading-lg"></span>
                        <p>Cargando entrevistas...</p>
                    </div>
                ) : entrevistas.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <FaComments className="text-6xl text-gray-300 mx-auto mb-4" />
                        <p>No hay entrevistas preliminares registradas</p>
                        <button
                            onClick={() => document.getElementById('modal_crear_entrevista').showModal()}
                            className="btn btn-primary mt-4"
                        >
                            Registrar primera entrevista
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {entrevistas.map((entrevista) => (
                            <div key={entrevista.id_entrevista_preliminar} className="card bg-base-100 shadow-xl">
                                <div className="card-body">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="card-title text-lg flex items-center gap-2">
                                                {getTipoPersonaIcon(entrevista.tipo_persona)}
                                                {entrevista.persona_entrevistada}
                                            </h3>

                                            <div className="flex gap-2 mt-2 mb-3">
                                                {entrevista.tipo_persona && (
                                                    <span className={`badge ${getTipoPersonaBadgeColor(entrevista.tipo_persona)}`}>
                                                        {entrevista.tipo_persona}
                                                    </span>
                                                )}
                                                {entrevista.evolucionado_a_caso ? (
                                                    <span className="badge badge-success flex items-center gap-1">
                                                        <FaArrowRight /> Evolucionado a caso
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-warning">
                                                        Pendiente
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                                                {entrevista.resumen_conversacion}
                                            </p>

                                            <div className="flex justify-between items-center text-sm text-gray-500">
                                                <span>📅 {new Date(entrevista.fecha_entrevista).toLocaleDateString('es-ES')}</span>
                                                <span>👤 {entrevista.usuario_nombre || 'Sistema'}</span>
                                            </div>

                                            {entrevista.evolucionado_a_caso && entrevista.caso_titulo && (
                                                <div className="bg-base-200 p-3 rounded-lg mt-3">
                                                    <p className="text-sm font-semibold">Caso relacionado:</p>
                                                    <p className="text-sm">{entrevista.caso_titulo}</p>
                                                    <button
                                                        onClick={() => navigate(`/Casos/${entrevista.id_caso_relacionado}`)}
                                                        className="btn btn-xs btn-outline mt-2 flex items-center gap-1"
                                                    >
                                                        <FaExternalLinkAlt /> Ver caso
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-actions justify-end mt-4">
                                        <button
                                            onClick={() => abrirDetalleEntrevista(entrevista)}
                                            className="btn btn-sm btn-ghost flex items-center gap-1"
                                        >
                                            <FaEye /> Ver detalle
                                        </button>

                                        {!entrevista.evolucionado_a_caso && (
                                            <>
                                                <button
                                                    onClick={() => abrirEditarEntrevista(entrevista)}
                                                    className="btn btn-sm btn-ghost flex items-center gap-1"
                                                >
                                                    <FaEdit /> Editar
                                                </button>

                                                <button
                                                    onClick={() => handleEliminarEntrevista(entrevista.id_entrevista_preliminar)}
                                                    className="btn btn-sm btn-outline btn-error flex items-center gap-1"
                                                >
                                                    <FaTrash /> Eliminar
                                                </button>

                                                <button
                                                    onClick={() => abrirEvolucionarCaso(entrevista)}
                                                    className="btn btn-sm btn-success flex items-center gap-1"
                                                >
                                                    <FaArrowRight /> Evolucionar a Caso
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Paginación */}
                {!loading && entrevistas.length > 0 && (
                    <div className="flex flex-col items-center gap-4 mt-6">
                        <div className="text-sm text-gray-600 bg-base-200 px-4 py-2 rounded-lg">
                            Página {paginaActual} de {totalPaginas} |
                            Mostrando {((paginaActual - 1) * entrevistasPorPagina) + 1} a {Math.min(paginaActual * entrevistasPorPagina, totalEntrevistas)} de {totalEntrevistas} entrevistas
                        </div>

                        <div className="join">
                            <button
                                className="join-item btn btn-sm"
                                onClick={() => cargarEntrevistas(1)}
                                disabled={paginaActual === 1}
                            >
                                «
                            </button>
                            <button
                                className="join-item btn btn-sm"
                                onClick={() => cargarEntrevistas(paginaActual - 1)}
                                disabled={paginaActual === 1}
                            >
                                ‹
                            </button>

                            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                let pageNum
                                if (totalPaginas <= 5) {
                                    pageNum = i + 1
                                } else if (paginaActual <= 3) {
                                    pageNum = i + 1
                                } else if (paginaActual >= totalPaginas - 2) {
                                    pageNum = totalPaginas - 4 + i
                                } else {
                                    pageNum = paginaActual - 2 + i
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        className={`join-item btn btn-sm ${pageNum === paginaActual ? 'btn-active' : ''}`}
                                        onClick={() => cargarEntrevistas(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            })}

                            <button
                                className="join-item btn btn-sm"
                                onClick={() => cargarEntrevistas(paginaActual + 1)}
                                disabled={paginaActual === totalPaginas}
                            >
                                ›
                            </button>
                            <button
                                className="join-item btn btn-sm"
                                onClick={() => cargarEntrevistas(totalPaginas)}
                                disabled={paginaActual === totalPaginas}
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Crear Entrevista */}
            <dialog id="modal_crear_entrevista" className="modal">
                <div className="modal-box max-w-2xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FaPlus className="text-primary" />
                        Registrar Nueva Entrevista Preliminar
                    </h3>

                    <div className='flex flex-col gap-4'>
                        <div>
                            <label className='label'>Persona entrevistada *</label>
                            <input
                                type="text"
                                className='input input-bordered w-full'
                                placeholder='Nombre completo de la persona entrevistada'
                                value={nuevaEntrevista.persona_entrevistada}
                                onChange={(e) => setNuevaEntrevista({ ...nuevaEntrevista, persona_entrevistada: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className='label'>Tipo de persona *</label>
                                <select
                                    className='select select-bordered w-full'
                                    value={nuevaEntrevista.tipo_persona}
                                    onChange={(e) => setNuevaEntrevista({ ...nuevaEntrevista, tipo_persona: e.target.value })}
                                >
                                    <option value="">Seleccione el tipo</option>
                                    <option value="Estudiante">Estudiante</option>
                                    <option value="Docente">Docente</option>
                                    <option value="Colaborador">Colaborador</option>
                                </select>
                            </div>

                            <div>
                                <label className='label'>Correo electrónico</label>
                                <input
                                    type="email"
                                    className='input input-bordered w-full'
                                    placeholder='ejemplo@correo.com'
                                    value={nuevaEntrevista.correo}
                                    onChange={(e) => setNuevaEntrevista({ ...nuevaEntrevista, correo: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className='label'>Teléfono</label>
                                <input
                                    type="tel"
                                    className='input input-bordered w-full'
                                    placeholder='+569 1234 5678'
                                    value={nuevaEntrevista.telefono}
                                    onChange={(e) => setNuevaEntrevista({ ...nuevaEntrevista, telefono: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className='label'>Carrera</label>
                                <input
                                    type="text"
                                    className='input input-bordered w-full'
                                    placeholder='Carrera o especialidad'
                                    value={nuevaEntrevista.carrera}
                                    onChange={(e) => setNuevaEntrevista({ ...nuevaEntrevista, carrera: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className='label'>Cargo</label>
                                <input
                                    type="text"
                                    className='input input-bordered w-full'
                                    placeholder='Cargo o posición'
                                    value={nuevaEntrevista.cargo}
                                    onChange={(e) => setNuevaEntrevista({ ...nuevaEntrevista, cargo: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className='label'>Empresa/Servicio</label>
                                <input
                                    type="text"
                                    className='input input-bordered w-full'
                                    placeholder='Empresa o servicio'
                                    value={nuevaEntrevista.empresa_servicio}
                                    onChange={(e) => setNuevaEntrevista({ ...nuevaEntrevista, empresa_servicio: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className='label'>Unidad</label>
                            <input
                                type="text"
                                className='input input-bordered w-full'
                                placeholder='Unidad o departamento'
                                value={nuevaEntrevista.unidad}
                                onChange={(e) => setNuevaEntrevista({ ...nuevaEntrevista, unidad: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className='label'>Fecha de la entrevista *</label>
                            <DatePicker
                                selected={nuevaEntrevista.fecha_entrevista}
                                onChange={(date) => setNuevaEntrevista({ ...nuevaEntrevista, fecha_entrevista: date })}
                                className='input input-bordered w-full'
                                showTimeSelect
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                dateFormat="dd/MM/yyyy HH:mm"
                                maxDate={new Date()}
                                showYearDropdown
                                showMonthDropdown
                                dropdownMode="select"
                                placeholderText="Seleccione fecha y hora"
                            />
                        </div>

                        <div>
                            <label className='label'>Resumen de la conversación *</label>
                            <textarea
                                className='textarea textarea-bordered w-full h-32'
                                placeholder='Resuma los puntos principales de la conversación y los temas tratados...'
                                value={nuevaEntrevista.resumen_conversacion}
                                onChange={(e) => setNuevaEntrevista({ ...nuevaEntrevista, resumen_conversacion: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className='label'>Notas adicionales</label>
                            <textarea
                                className='textarea textarea-bordered w-full'
                                placeholder='Observaciones adicionales, seguimiento requerido, etc.'
                                value={nuevaEntrevista.notas_adicionales}
                                onChange={(e) => setNuevaEntrevista({ ...nuevaEntrevista, notas_adicionales: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="modal-action">
                        <form method="dialog">
                            <div className='flex gap-2'>
                                <button className="btn btn-ghost">Cancelar</button>
                                <button
                                    type="button"
                                    className="btn btn-primary flex items-center gap-2"
                                    onClick={handleCrearEntrevista}
                                >
                                    <FaSave /> Registrar Entrevista
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>

            {/* Modal Editar Entrevista */}
            <dialog id="modal_editar_entrevista" className="modal">
                <div className="modal-box max-w-2xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FaEdit className="text-primary" />
                        Editar Entrevista Preliminar
                    </h3>

                    {entrevistaEditando && (
                        <div className='flex flex-col gap-4'>
                            <div>
                                <label className='label'>Persona entrevistada *</label>
                                <input
                                    type="text"
                                    className='input input-bordered w-full'
                                    value={entrevistaEditando.persona_entrevistada}
                                    onChange={(e) => setEntrevistaEditando({ ...entrevistaEditando, persona_entrevistada: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className='label'>Tipo de persona *</label>
                                    <select
                                        className='select select-bordered w-full'
                                        value={entrevistaEditando.tipo_persona || ''}
                                        onChange={(e) => setEntrevistaEditando({ ...entrevistaEditando, tipo_persona: e.target.value })}
                                    >
                                        <option value="">Seleccione el tipo</option>
                                        <option value="Estudiante">Estudiante</option>
                                        <option value="Docente">Docente</option>
                                        <option value="Colaborador">Colaborador</option>
                                    </select>
                                </div>

                                <div>
                                    <label className='label'>Correo electrónico</label>
                                    <input
                                        type="email"
                                        className='input input-bordered w-full'
                                        placeholder='ejemplo@correo.com'
                                        value={entrevistaEditando.correo || ''}
                                        onChange={(e) => setEntrevistaEditando({ ...entrevistaEditando, correo: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className='label'>Teléfono</label>
                                    <input
                                        type="tel"
                                        className='input input-bordered w-full'
                                        placeholder='+569 1234 5678'
                                        value={entrevistaEditando.telefono || ''}
                                        onChange={(e) => setEntrevistaEditando({ ...entrevistaEditando, telefono: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className='label'>Carrera</label>
                                    <input
                                        type="text"
                                        className='input input-bordered w-full'
                                        placeholder='Carrera o especialidad'
                                        value={entrevistaEditando.carrera || ''}
                                        onChange={(e) => setEntrevistaEditando({ ...entrevistaEditando, carrera: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className='label'>Cargo</label>
                                    <input
                                        type="text"
                                        className='input input-bordered w-full'
                                        placeholder='Cargo o posición'
                                        value={entrevistaEditando.cargo || ''}
                                        onChange={(e) => setEntrevistaEditando({ ...entrevistaEditando, cargo: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className='label'>Empresa/Servicio</label>
                                    <input
                                        type="text"
                                        className='input input-bordered w-full'
                                        placeholder='Empresa o servicio'
                                        value={entrevistaEditando.empresa_servicio || ''}
                                        onChange={(e) => setEntrevistaEditando({ ...entrevistaEditando, empresa_servicio: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className='label'>Unidad</label>
                                <input
                                    type="text"
                                    className='input input-bordered w-full'
                                    placeholder='Unidad o departamento'
                                    value={entrevistaEditando.unidad || ''}
                                    onChange={(e) => setEntrevistaEditando({ ...entrevistaEditando, unidad: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className='label'>Fecha de la entrevista *</label>
                                <DatePicker
                                    selected={entrevistaEditando.fecha_entrevista}
                                    onChange={(date) => setEntrevistaEditando({ ...entrevistaEditando, fecha_entrevista: date })}
                                    className='input input-bordered w-full'
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={15}
                                    dateFormat="dd/MM/yyyy HH:mm"
                                    maxDate={new Date()}
                                    showYearDropdown
                                    showMonthDropdown
                                    dropdownMode="select"
                                />
                            </div>

                            <div>
                                <label className='label'>Resumen de la conversación *</label>
                                <textarea
                                    className='textarea textarea-bordered w-full h-32'
                                    value={entrevistaEditando.resumen_conversacion}
                                    onChange={(e) => setEntrevistaEditando({ ...entrevistaEditando, resumen_conversacion: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className='label'>Notas adicionales</label>
                                <textarea
                                    className='textarea textarea-bordered w-full'
                                    value={entrevistaEditando.notas_adicionales || ''}
                                    onChange={(e) => setEntrevistaEditando({ ...entrevistaEditando, notas_adicionales: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    <div className="modal-action">
                        <form method="dialog">
                            <div className='flex gap-2'>
                                <button className="btn btn-ghost">Cancelar</button>
                                <button
                                    type="button"
                                    className="btn btn-primary flex items-center gap-2"
                                    onClick={handleActualizarEntrevista}
                                >
                                    <FaSave /> Actualizar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>

            {/* Modal Evolucionar a Caso */}
            <dialog id="modal_evolucionar_caso" className="modal">
                <div className="modal-box max-w-2xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FaArrowRight className="text-success" />
                        Evolucionar a Caso Formal
                    </h3>

                    {entrevistaEvolucionando && (
                        <div className='flex flex-col gap-4'>
                            <div className="bg-base-200 p-3 rounded-lg">
                                <p className="font-semibold">Entrevista con: {entrevistaEvolucionando.persona_entrevistada}</p>
                                <p className="text-sm opacity-70">
                                    {new Date(entrevistaEvolucionando.fecha_entrevista).toLocaleDateString('es-ES')}
                                </p>
                            </div>

                            <div>
                                <label className='label'>Título del caso *</label>
                                <input
                                    type="text"
                                    className='input input-bordered w-full'
                                    placeholder='Ej: Conflicto entre estudiantes'
                                    value={datosCaso.titulo}
                                    onChange={(e) => setDatosCaso({ ...datosCaso, titulo: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className='label'>Descripción del caso</label>
                                <textarea
                                    className='textarea textarea-bordered w-full h-32'
                                    placeholder='Descripción detallada del caso...'
                                    value={datosCaso.descripcion}
                                    onChange={(e) => setDatosCaso({ ...datosCaso, descripcion: e.target.value })}
                                />
                            </div>

                            <div className="alert alert-info">
                                <div className="flex items-start gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    <div>
                                        <h3 className="font-bold">Información importante</h3>
                                        <div className="text-sm">
                                            • Se creará un caso formal vinculado a esta entrevista preliminar<br />
                                            • La entrevista quedará marcada como "evolucionada"<br />
                                            • Podrás gestionar afectados y seguimiento en el nuevo caso<br />
                                            • Esta acción no se puede deshacer
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="modal-action">
                        <form method="dialog">
                            <div className='flex gap-2'>
                                <button className="btn btn-ghost">Cancelar</button>
                                <button
                                    type="button"
                                    className="btn btn-success flex items-center gap-2"
                                    onClick={handleEvolucionarACaso}
                                    disabled={!datosCaso.titulo}
                                >
                                    <FaArrowRight /> Crear Caso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>

            {/* Modal Detalle Entrevista */}
            <dialog id="modal_detalle_entrevista" className="modal">
                <div className="modal-box max-w-3xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FaEye className="text-primary" />
                        Detalle de Entrevista Preliminar
                    </h3>

                    {entrevistaDetalle && (
                        <div className='flex flex-col gap-4'>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        {getTipoPersonaIcon(entrevistaDetalle.tipo_persona)}
                                        Información de la Persona
                                    </h4>
                                    <p><strong>Nombre:</strong> {entrevistaDetalle.persona_entrevistada}</p>
                                    {entrevistaDetalle.tipo_persona && (
                                        <p><strong>Tipo:</strong> {entrevistaDetalle.tipo_persona}</p>
                                    )}
                                    {entrevistaDetalle.contacto && (
                                        <p><strong>Contacto:</strong> {entrevistaDetalle.contacto}</p>
                                    )}
                                </div>

                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2">Información de la Entrevista</h4>
                                    <p><strong>Fecha:</strong> {new Date(entrevistaDetalle.fecha_entrevista).toLocaleString('es-ES')}</p>
                                    <p><strong>Registrado por:</strong> {entrevistaDetalle.usuario_nombre || 'Sistema'}</p>
                                    <p><strong>Estado:</strong>
                                        <span className={`ml-2 badge ${entrevistaDetalle.evolucionado_a_caso ? 'badge-success' : 'badge-warning'}`}>
                                            {entrevistaDetalle.evolucionado_a_caso ? 'Evolucionado a caso' : 'Pendiente'}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="bg-base-200 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2">Resumen de la Conversación</h4>
                                <p className="text-sm whitespace-pre-wrap">{entrevistaDetalle.resumen_conversacion}</p>
                            </div>

                            {entrevistaDetalle.notas_adicionales && (
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2">Notas Adicionales</h4>
                                    <p className="text-sm whitespace-pre-wrap">{entrevistaDetalle.notas_adicionales}</p>
                                </div>
                            )}

                            {entrevistaDetalle.evolucionado_a_caso && entrevistaDetalle.caso_titulo && (
                                <div className="bg-success/10 border border-success/20 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-success">Caso Relacionado</h4>
                                    <p><strong>Título:</strong> {entrevistaDetalle.caso_titulo}</p>
                                    <p><strong>Estado:</strong> {entrevistaDetalle.caso_estado}</p>
                                    <button
                                        onClick={() => {
                                            document.getElementById('modal_detalle_entrevista').close()
                                            navigate(`/Casos/${entrevistaDetalle.caso_id}`)
                                        }}
                                        className="btn btn-success btn-sm mt-2 flex items-center gap-1"
                                    >
                                        <FaExternalLinkAlt /> Ver caso completo
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="modal-action">
                        <form method="dialog">
                            <button className="btn btn-ghost">
                                <FaTimes /> Cerrar
                            </button>
                        </form>
                    </div>
                </div>
            </dialog>
        </div>
    )
}

export default EntrevistaPreliminar