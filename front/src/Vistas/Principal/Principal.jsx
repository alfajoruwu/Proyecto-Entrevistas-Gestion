import React, { useState, useEffect } from 'react'
import Navbar from '../../Componentes/Navbar'
import apiClient from '../../AuxS/Axiosinstance'
import { useToast } from '../../Componentes/ToastContext'
import { useNavigate } from 'react-router-dom'

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaComments, FaEye, FaTimes, FaCheckCircle, FaInfo } from 'react-icons/fa';

const Principal = () => {
    const { mostrarToast } = useToast()
    const navigate = useNavigate()

    // Estados principales
    const [casos, setCasos] = useState([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')

    // Filtros
    const [filtrosActivos, setFiltrosActivos] = useState(false)
    const [filtros, setFiltros] = useState({
        estado: '',
        fechaInicio: null,
        fechaFin: null,
        tipo_fuente: '',
        participante: '' // Nuevo filtro por participante
    })

    // Estados para participantes
    const [afectadosDisponibles, setAfectadosDisponibles] = useState([])
    const [loadingAfectados, setLoadingAfectados] = useState(false)
    const [busquedaParticipante, setBusquedaParticipante] = useState('')
    const [sugerenciasParticipantes, setSugerenciasParticipantes] = useState([])
    const [mostrarSugerenciasParticipantes, setMostrarSugerenciasParticipantes] = useState(false)
    const [participanteSeleccionado, setParticipanteSeleccionado] = useState(null)

    // Nuevo caso
    const [nuevoCaso, setNuevoCaso] = useState({
        titulo: '',
        descripcion: '',
        fuente: '',
        tipo_fuente: '',
        fecha_creacion: new Date()
    })

    // Caso para editar
    const [casoEditando, setCasoEditando] = useState(null)

    // Modal de finalización
    const [casoParaFinalizar, setCasoParaFinalizar] = useState(null)
    const [formaFinalizacion, setFormaFinalizacion] = useState('')
    const [comentariosFinalizacion, setComentariosFinalizacion] = useState('')
    const [fechaFinalizacion, setFechaFinalizacion] = useState(new Date())

    // Modal de resolución
    const [casoParaResolver, setCasoParaResolver] = useState(null)
    const [resolucion, setResolucion] = useState('')

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1)
    const [totalPaginas, setTotalPaginas] = useState(1)
    const [totalCasos, setTotalCasos] = useState(0)
    const casosPorPagina = 20 // Casos por página

    // Estado para modal de entrevista preliminar
    const [entrevistaPreliminarDetalle, setEntrevistaPreliminarDetalle] = useState(null)

    // Cargar casos al montar el componente
    useEffect(() => {
        cargarCasos(1)
        cargarAfectadosDisponibles() // Cargar afectados para el filtro
    }, [])

    // Recargar casos cuando cambien filtros o búsqueda
    useEffect(() => {
        cargarCasos(1)
    }, [filtros, busqueda])

    const cargarCasos = async (pagina = paginaActual) => {
        try {
            setLoading(true)

            // Preparar parámetros para el backend
            const params = {
                page: pagina,
                limit: casosPorPagina
            }

            // Agregar filtros solo si tienen valor
            if (filtros.estado) params.estado = filtros.estado
            if (filtros.tipo_fuente) params.tipo_fuente = filtros.tipo_fuente
            if (filtros.participante) params.participante = filtros.participante
            if (busqueda) params.busqueda = busqueda

            // Convertir fechas a formato ISO para el backend
            if (filtros.fechaInicio) {
                params.fechaInicio = filtros.fechaInicio.toISOString().split('T')[0] // YYYY-MM-DD
            }
            if (filtros.fechaFin) {
                params.fechaFin = filtros.fechaFin.toISOString().split('T')[0] // YYYY-MM-DD
            }

            const response = await apiClient.get('/api/casos', { params })

            setCasos(response.data.casos || [])
            setTotalCasos(response.data.total || 0)
            setTotalPaginas(Math.ceil((response.data.total || 0) / casosPorPagina))
            setPaginaActual(pagina)
        } catch (error) {
            console.error('Error cargando casos:', error)
            mostrarToast('Error al cargar casos', 'error')
        } finally {
            setLoading(false)
        }
    }

    const cargarAfectadosDisponibles = async () => {
        try {
            setLoadingAfectados(true)
            // Usar la ruta regular para obtener todos los afectados (sin filtro de autocompletado)
            const response = await apiClient.get('/api/afectados', {
                params: { limit: 100 } // Traer todos los afectados
            })
            setAfectadosDisponibles(response.data.afectados || [])
        } catch (error) {
            console.error('Error cargando afectados:', error)
        } finally {
            setLoadingAfectados(false)
        }
    }

    const buscarParticipantes = async (query) => {
        if (query.length < 2) {
            setSugerenciasParticipantes([])
            setMostrarSugerenciasParticipantes(false)
            return
        }

        try {
            const response = await apiClient.get('/api/afectados/buscar/autocompletar', {
                params: { q: query, limit: 10 }
            })
            setSugerenciasParticipantes(response.data || [])
            setMostrarSugerenciasParticipantes(true)
        } catch (error) {
            console.error('Error buscando participantes:', error)
            setSugerenciasParticipantes([])
        }
    }

    const seleccionarParticipante = (participante) => {
        setParticipanteSeleccionado(participante)
        setBusquedaParticipante(participante.nombre)
        setFiltros({ ...filtros, participante: participante.id_afectado })
        setMostrarSugerenciasParticipantes(false)
    }

    const limpiarParticipante = () => {
        setParticipanteSeleccionado(null)
        setBusquedaParticipante('')
        setFiltros({ ...filtros, participante: '' })
        setSugerenciasParticipantes([])
        setMostrarSugerenciasParticipantes(false)
    }

    const handleCrearCaso = async () => {
        try {
            if (!nuevoCaso.titulo || !nuevoCaso.tipo_fuente) {
                mostrarToast('Complete al menos el título y tipo de fuente', 'error')
                return
            }

            const casoData = {
                ...nuevoCaso,
                fecha_creacion: nuevoCaso.fecha_creacion.toISOString()
            }

            await apiClient.post('/api/casos', casoData)
            mostrarToast('Caso creado exitosamente', 'success')

            // Cerrar modal y limpiar formulario
            document.getElementById('modal_crear_caso').close()
            setNuevoCaso({
                titulo: '',
                descripcion: '',
                fuente: '',
                tipo_fuente: '',
                fecha_creacion: new Date()
            })

            // Recargar casos
            cargarCasos()
        } catch (error) {
            console.error('Error creando caso:', error)
            mostrarToast(error.response?.data?.error || 'Error al crear caso', 'error')
        }
    }

    const handleFinalizarCaso = async () => {
        try {
            if (!casoParaFinalizar || !formaFinalizacion) {
                mostrarToast('Seleccione una forma de finalización', 'error')
                return
            }

            await apiClient.put(`/api/casos/${casoParaFinalizar.id_caso}/finalizar`, {
                forma_finalizacion: formaFinalizacion,
                comentarios: comentariosFinalizacion,
                fecha_finalizacion: fechaFinalizacion.toISOString()
            })

            mostrarToast(`Caso finalizado: ${formaFinalizacion}`, 'success')

            // Cerrar modal y limpiar
            document.getElementById('modal_finalizar_caso').close()
            setCasoParaFinalizar(null)
            setFormaFinalizacion('')
            setComentariosFinalizacion('')
            setFechaFinalizacion(new Date())

            // Recargar casos
            cargarCasos()
        } catch (error) {
            console.error('Error finalizando caso:', error)
            mostrarToast(error.response?.data?.error || 'Error al finalizar caso', 'error')
        }
    }

    const handleActualizarCaso = async () => {
        try {
            if (!casoEditando) return

            await apiClient.put(`/api/casos/${casoEditando.id_caso}`, {
                titulo: casoEditando.titulo,
                descripcion: casoEditando.descripcion,
                fuente: casoEditando.fuente,
                tipo_fuente: casoEditando.tipo_fuente,
                fecha_creacion: casoEditando.fecha_creacion
            })

            mostrarToast('Caso actualizado exitosamente', 'success')

            // Cerrar modal
            document.getElementById('modal_editar_caso').close()
            setCasoEditando(null)

            // Recargar casos
            cargarCasos()
        } catch (error) {
            console.error('Error actualizando caso:', error)
            mostrarToast(error.response?.data?.error || 'Error al actualizar caso', 'error')
        }
    }

    const handleEliminarCaso = async (casoId) => {
        try {
            const confirmacion = window.confirm('¿Estás seguro de que quieres eliminar este caso? Esta acción no se puede deshacer.')

            if (!confirmacion) return

            await apiClient.delete(`/api/casos/${casoId}`)
            mostrarToast('Caso eliminado exitosamente', 'success')
            cargarCasos()
        } catch (error) {
            console.error('Error eliminando caso:', error)
            mostrarToast(error.response?.data?.error || 'Error al eliminar caso', 'error')
        }
    }

    const handleCambiarEstado = async (casoId, nuevoEstado) => {
        try {
            // Si se quiere cambiar a resolución, abrir modal específico
            if (nuevoEstado === 'Resolución') {
                const caso = casos.find(c => c.id_caso === casoId)
                if (caso && caso.estado !== 'Finalizado') {
                    mostrarToast('El caso debe estar Finalizado antes de poder resolverlo', 'error')
                    return
                }
                abrirResolverCaso(caso)
                return
            }

            await apiClient.put(`/api/casos/${casoId}/estado`, {
                estado: nuevoEstado
            })
            mostrarToast(`Estado cambiado a ${nuevoEstado}`, 'success')
            cargarCasos()
        } catch (error) {
            console.error('Error cambiando estado:', error)
            mostrarToast(error.response?.data?.error || 'Error al cambiar estado', 'error')
        }
    }

    const abrirResolverCaso = (caso) => {
        setCasoParaResolver(caso)
        setResolucion('')
        document.getElementById('modal_resolver_caso').showModal()
    }

    const handleResolver = async () => {
        try {
            if (!casoParaResolver || !resolucion.trim()) {
                mostrarToast('La resolución es requerida', 'error')
                return
            }

            await apiClient.put(`/api/casos/${casoParaResolver.id_caso}/resolver`, {
                resolucion: resolucion.trim()
            })

            mostrarToast('Caso resuelto exitosamente', 'success')
            cargarCasos()
            setCasoParaResolver(null)
            setResolucion('')
            document.getElementById('modal_resolver_caso').close()
        } catch (error) {
            console.error('Error resolviendo caso:', error)
            mostrarToast(error.response?.data?.error || 'Error al resolver caso', 'error')
        }
    }

    const abrirEditarCaso = (caso) => {
        setCasoEditando({ ...caso })
        document.getElementById('modal_editar_caso').showModal()
    }

    const abrirFinalizarCaso = (caso) => {
        setCasoParaFinalizar(caso)
        setFormaFinalizacion('')
        setComentariosFinalizacion('')
        setFechaFinalizacion(new Date())
        document.getElementById('modal_finalizar_caso').showModal()
    }

    const irACaso = (id) => {
        navigate(`/Casos/${id}`)
    }

    const abrirDetalleEntrevistaPreliminar = (caso) => {
        setEntrevistaPreliminarDetalle(caso)
        document.getElementById('modal_entrevista_preliminar_principal').showModal()
    }

    // Filtrar casos - removido porque se hace en el backend
    // const casosFiltrados = casos // Usar directamente los casos del backend

    const getEstadoBadgeColor = (estado) => {
        switch (estado) {
            case 'Recepcionado': return 'badge-info'
            case 'En Proceso': return 'badge-warning'
            case 'Finalizado': return 'badge-error'
            case 'Resolución': return 'badge-success'
            default: return 'badge-neutral'
        }
    }

    return (
        <div>
            <Navbar />

            {/* Búsqueda y acciones principales */}
            <div className='flex flex-col gap-4 p-4'>
                <div className='flex'>
                    <input
                        type="text"
                        className='input input-bordered flex-1'
                        placeholder='Buscar casos por título, descripción o fuente...'
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                <div className='flex gap-2'>
                    <button
                        className="flex-1 btn btn-primary"
                        onClick={() => {
                            setNuevoCaso({
                                titulo: '',
                                descripcion: '',
                                fuente: '',
                                tipo_fuente: ''
                            })
                            document.getElementById('modal_crear_caso').showModal()
                        }}
                    >
                        + Crear Nuevo Caso
                    </button>
                    <button
                        onClick={() => setFiltrosActivos(!filtrosActivos)}
                        className='flex-1 btn btn-accent'
                    >
                        Filtros
                    </button>
                </div>

                {/* Panel de filtros */}
                {filtrosActivos && (
                    <div className='bg-base-200 p-4 rounded-lg'>
                        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                            <div>
                                <label className='text-sm font-semibold mb-1 block'>Estado:</label>
                                <select
                                    className='select select-bordered select-sm w-full'
                                    value={filtros.estado}
                                    onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                                >
                                    <option value="">Todos los estados</option>
                                    <option value="Recepcionado">Recepcionado</option>
                                    <option value="En Proceso">En Proceso</option>
                                    <option value="Finalizado">Finalizado</option>
                                    <option value="Resolución">Resolución</option>
                                </select>
                            </div>

                            <div>
                                <label className='text-sm font-semibold mb-1 block'>Tipo de fuente:</label>
                                <select
                                    className='select select-bordered select-sm w-full'
                                    value={filtros.tipo_fuente}
                                    onChange={(e) => setFiltros({ ...filtros, tipo_fuente: e.target.value })}
                                >
                                    <option value="">Todos los tipos</option>
                                    <option value="derivacion">Derivación</option>
                                    <option value="denuncia_presencial">Denuncia Presencial</option>
                                    <option value="denuncia_online">Denuncia Online/Correo</option>
                                    <option value="entrevista_preliminar">Entrevista Preliminar</option>
                                </select>
                            </div>

                            <div className="relative">
                                <label className='text-sm font-semibold mb-1 block'>Participante:</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className='input input-bordered input-sm w-full'
                                        placeholder="Buscar participante..."
                                        value={busquedaParticipante}
                                        onChange={(e) => {
                                            setBusquedaParticipante(e.target.value)
                                            if (!participanteSeleccionado) {
                                                buscarParticipantes(e.target.value)
                                            }
                                        }}
                                        onFocus={() => {
                                            if (busquedaParticipante.length >= 2 && sugerenciasParticipantes.length > 0) {
                                                setMostrarSugerenciasParticipantes(true)
                                            }
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => setMostrarSugerenciasParticipantes(false), 200)
                                        }}
                                    />

                                    {participanteSeleccionado && (
                                        <button
                                            type="button"
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            onClick={limpiarParticipante}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Sugerencias */}
                                {mostrarSugerenciasParticipantes && sugerenciasParticipantes.length > 0 && (
                                    <div className="absolute z-50 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                        {sugerenciasParticipantes.map((participante) => (
                                            <div
                                                key={participante.id_afectado}
                                                className="p-2 hover:bg-base-200 cursor-pointer border-b border-base-300 last:border-b-0"
                                                onClick={() => seleccionarParticipante(participante)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-sm">{participante.nombre}</p>
                                                        <p className="text-xs text-gray-500">{participante.tipo}</p>
                                                        {participante.correo && (
                                                            <p className="text-xs text-gray-400">{participante.correo}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className='text-sm font-semibold mb-1 block'>Fecha desde:</label>
                                <DatePicker
                                    selected={filtros.fechaInicio}
                                    onChange={(date) => setFiltros({ ...filtros, fechaInicio: date })}
                                    className='input input-bordered input-sm w-full'
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Desde..."
                                />
                            </div>

                            <div>
                                <label className='text-sm font-semibold mb-1 block'>Fecha hasta:</label>
                                <DatePicker
                                    selected={filtros.fechaFin}
                                    onChange={(date) => setFiltros({ ...filtros, fechaFin: date })}
                                    className='input input-bordered input-sm w-full'
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="Hasta..."
                                />
                            </div>
                        </div>

                        <div className='flex justify-end gap-2 mt-4'>
                            <button
                                onClick={() => {
                                    // Limpiar todos los filtros
                                    setFiltros({
                                        estado: '',
                                        fechaInicio: null,
                                        fechaFin: null,
                                        tipo_fuente: '',
                                        participante: ''
                                    })
                                    // Limpiar participante seleccionado
                                    limpiarParticipante()
                                    // Recargar casos sin filtros
                                    setPaginaActual(1)
                                }}
                                className='btn btn-sm btn-ghost'
                            >
                                Limpiar filtros
                            </button>
                            <button
                                onClick={() => {
                                    // Forzar recarga con los filtros actuales
                                    setPaginaActual(1)
                                    cargarCasos(1)
                                }}
                                className='btn btn-sm btn-primary'
                            >
                                Aplicar filtros
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista de casos */}
            <div className="p-4">
                <h2 className="text-xl font-bold mb-4">
                    Casos de Convivencia ({casos.length})
                </h2>

                {loading ? (
                    <div className="text-center">
                        <span className="loading loading-spinner loading-lg"></span>
                        <p>Cargando casos...</p>
                    </div>
                ) : casos.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <p>No hay casos que coincidan con los filtros</p>
                        {casos.length === 0 && (
                            <button
                                onClick={() => document.getElementById('modal_crear_caso').showModal()}
                                className="btn btn-primary mt-4"
                            >
                                Crear el primer caso
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {casos.map((caso) => (
                            <div key={caso.id_caso} className="card bg-base-100 shadow-xl">
                                <div className="card-body">
                                    <h3 className="card-title text-lg">{caso.titulo}</h3>

                                    {caso.descripcion && (
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                            {caso.descripcion}
                                        </p>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex gap-2 flex-wrap">
                                                <span className={`badge ${getEstadoBadgeColor(caso.estado)}`}>
                                                    {caso.estado}
                                                </span>
                                                <span className="badge badge-outline">
                                                    {caso.tipo_fuente?.replace('_', ' ') || 'Sin tipo'}
                                                </span>
                                                {caso.forma_finalizacion && (
                                                    <span className="badge badge-secondary">
                                                        {caso.forma_finalizacion}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-sm text-gray-600">
                                                📅 {new Date(caso.fecha_creacion).toLocaleDateString('es-ES')}
                                            </span>
                                        </div>

                                        {caso.fuente && (
                                            <div>
                                                <span className="text-sm font-semibold">Fuente: </span>
                                                <span className="text-sm text-gray-600">{caso.fuente}</span>
                                            </div>
                                        )}

                                        {/* Mostrar información de entrevista preliminar si existe */}
                                        {caso.tipo_fuente === 'entrevista_preliminar' && caso.entrevista_persona && (
                                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mt-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <FaComments className="text-blue-600" />
                                                        <span className="text-sm font-semibold text-blue-700">
                                                            Originado desde entrevista con {caso.entrevista_persona}
                                                        </span>
                                                        {caso.entrevista_fecha && (
                                                            <span className="text-blue-600 text-xs">
                                                                • {new Date(caso.entrevista_fecha).toLocaleDateString('es-ES')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => abrirDetalleEntrevistaPreliminar(caso)}
                                                        className="btn btn-xs btn-outline btn-primary flex items-center gap-1"
                                                    >
                                                        <FaEye /> Ver
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Mostrar participantes del caso */}
                                        {caso.afectados && caso.afectados.length > 0 && (
                                            <div>
                                                <span className="text-sm font-semibold">Participantes: </span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {caso.afectados.slice(0, 3).map((afectado, index) => (
                                                        <span
                                                            key={index}
                                                            className={`badge badge-sm ${afectado.rol === 'Denunciante' ? 'badge-error' :
                                                                afectado.rol === 'Denunciado' ? 'badge-warning' :
                                                                    afectado.rol === 'Testigo' ? 'badge-info' :
                                                                        'badge-neutral'
                                                                }`}
                                                            title={`${afectado.nombre} - ${afectado.rol}`}
                                                        >
                                                            {afectado.nombre} ({afectado.rol})
                                                        </span>
                                                    ))}
                                                    {caso.afectados.length > 3 && (
                                                        <span className="badge badge-sm badge-ghost">
                                                            +{caso.afectados.length - 3} más
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {caso.estado === 'Finalizado' && (caso.comentarios_finalizacion || caso.fecha_finalizacion) && (
                                            <div className="bg-base-200 p-3 rounded-lg mt-2">
                                                {caso.fecha_finalizacion && (
                                                    <div className="text-sm text-gray-600 mb-2">
                                                        <span className="font-semibold">📅 Finalizado el: </span>
                                                        {new Date(caso.fecha_finalizacion).toLocaleDateString('es-ES', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                )}
                                                {caso.comentarios_finalizacion && (
                                                    <div>
                                                        <span className="text-sm font-semibold">Motivo de finalización: </span>
                                                        <p className="text-sm text-gray-700 mt-1">{caso.comentarios_finalizacion}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Información de resolución */}
                                        {caso.estado === 'Resolución' && (caso.resolucion || caso.fecha_resolucion) && (
                                            <div className="bg-success/10 border border-success/20 p-3 rounded-lg mb-2">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <FaCheckCircle className="text-success" />
                                                    <span className="font-semibold text-success">Caso Resuelto</span>
                                                </div>
                                                {caso.fecha_resolucion && (
                                                    <div>
                                                        <span className="font-semibold">📅 Resuelto el: </span>
                                                        {new Date(caso.fecha_resolucion).toLocaleDateString('es-ES', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                )}
                                                {caso.resolucion && (
                                                    <div>
                                                        <span className="text-sm font-semibold">Descripción de la resolución: </span>
                                                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{caso.resolucion}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="card-actions justify-end mt-4">
                                        {/* Botones de progresión/regresión de estado */}
                                        {caso.estado === 'Recepcionado' && (
                                            <button
                                                onClick={() => handleCambiarEstado(caso.id_caso, 'En Proceso')}
                                                className="btn btn-sm btn-warning"
                                            >
                                                Poner en Proceso
                                            </button>
                                        )}

                                        {caso.estado === 'En Proceso' && (
                                            <>
                                                <button
                                                    onClick={() => handleCambiarEstado(caso.id_caso, 'Recepcionado')}
                                                    className="btn btn-sm btn-info"
                                                >
                                                    Volver a Recepcionado
                                                </button>
                                            </>
                                        )}

                                        {caso.estado === 'Resolución' && (
                                            <>
                                                <button
                                                    onClick={() => handleCambiarEstado(caso.id_caso, 'En Proceso')}
                                                    className="btn btn-sm btn-warning"
                                                >
                                                    Volver a En Proceso
                                                </button>
                                            </>
                                        )}

                                        {caso.estado === 'Finalizado' && (
                                            <>
                                                <button
                                                    onClick={() => handleCambiarEstado(caso.id_caso, 'En Proceso')}
                                                    className="btn btn-sm btn-warning"
                                                >
                                                    Reabrir caso
                                                </button>
                                                <button
                                                    onClick={() => handleCambiarEstado(caso.id_caso, 'Resolución')}
                                                    className="btn btn-sm btn-success"
                                                >
                                                    Cambiar a Resolución
                                                </button>
                                            </>
                                        )}

                                        {caso.estado !== 'Finalizado' && caso.estado !== 'Resolución' && (
                                            <button
                                                onClick={() => abrirFinalizarCaso(caso)}
                                                className="btn btn-sm btn-error"
                                            >
                                                Finalizar
                                            </button>
                                        )}

                                        <button
                                            onClick={() => abrirEditarCaso(caso)}
                                            className="btn btn-sm btn-ghost"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            onClick={() => handleEliminarCaso(caso.id_caso)}
                                            className="btn btn-sm btn-outline btn-error"
                                        >
                                            Eliminar
                                        </button>

                                        <button
                                            onClick={() => irACaso(caso.id_caso)}
                                            className="btn btn-sm btn-primary"
                                        >
                                            Ver Detalles
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Paginación */}
                {!loading && casos.length > 0 && (
                    <div className="flex flex-col items-center gap-4 mt-6">
                        <div className="text-sm text-gray-600 bg-base-200 px-4 py-2 rounded-lg">
                            Página {paginaActual} de {totalPaginas} |
                            Mostrando {((paginaActual - 1) * casosPorPagina) + 1} a {Math.min(paginaActual * casosPorPagina, totalCasos)} de {totalCasos} casos
                            ({casosPorPagina} casos por página)
                        </div>

                        <div className="join">
                            <button
                                className="join-item btn btn-sm"
                                onClick={() => cargarCasos(1)}
                                disabled={paginaActual === 1}
                            >
                                «
                            </button>
                            <button
                                className="join-item btn btn-sm"
                                onClick={() => cargarCasos(paginaActual - 1)}
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
                                        onClick={() => cargarCasos(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            })}

                            <button
                                className="join-item btn btn-sm"
                                onClick={() => cargarCasos(paginaActual + 1)}
                                disabled={paginaActual === totalPaginas}
                            >
                                ›
                            </button>
                            <button
                                className="join-item btn btn-sm"
                                onClick={() => cargarCasos(totalPaginas)}
                                disabled={paginaActual === totalPaginas}
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Crear Caso */}
            <dialog id="modal_crear_caso" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">Crear Nuevo Caso</h3>

                    <div className='flex flex-col gap-4'>
                        <div>
                            <label className='label'>Título del caso *</label>
                            <input
                                type="text"
                                className='input input-bordered w-full'
                                placeholder='Ej: Conflicto entre estudiantes en aula 201'
                                value={nuevoCaso.titulo}
                                onChange={(e) => setNuevoCaso({ ...nuevoCaso, titulo: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className='label'>Descripción</label>
                            <textarea
                                className='textarea textarea-bordered w-full'
                                placeholder='Descripción detallada del caso...'
                                value={nuevoCaso.descripcion}
                                onChange={(e) => setNuevoCaso({ ...nuevoCaso, descripcion: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className='label'>Fecha de creación *</label>
                            <DatePicker
                                selected={nuevoCaso.fecha_creacion}
                                onChange={(date) => setNuevoCaso({ ...nuevoCaso, fecha_creacion: date })}
                                className='input input-bordered w-full'
                                dateFormat="dd/MM/yyyy"
                                maxDate={new Date()}
                                showYearDropdown
                                showMonthDropdown
                                dropdownMode="select"
                                placeholderText="Seleccione la fecha"
                            />
                        </div>

                        <div>
                            <label className='label'>Tipo de fuente *</label>
                            <select
                                className='select select-bordered w-full'
                                value={nuevoCaso.tipo_fuente}
                                onChange={(e) => setNuevoCaso({ ...nuevoCaso, tipo_fuente: e.target.value })}
                            >
                                <option value="">Seleccione el tipo de fuente</option>
                                <option value="derivacion">Derivación</option>
                                <option value="denuncia_presencial">Denuncia Presencial</option>
                                <option value="denuncia_online">Denuncia Online/Correo</option>
                                <option value="entrevista_preliminar">Entrevista Preliminar</option>
                            </select>
                        </div>

                        <div>
                            <label className='label'>Fuente</label>
                            <input
                                type="text"
                                className='input input-bordered w-full'
                                placeholder='Ej: Correo de coordinación académica, llamada telefónica...'
                                value={nuevoCaso.fuente}
                                onChange={(e) => setNuevoCaso({ ...nuevoCaso, fuente: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-action">
                        <form method="dialog">
                            <div className='flex gap-2'>
                                <button className="btn btn-ghost">Cancelar</button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleCrearCaso}
                                >
                                    Crear Caso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>

            {/* Modal Editar Caso */}
            <dialog id="modal_editar_caso" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">Editar Caso</h3>

                    {casoEditando && (
                        <div className='flex flex-col gap-4'>
                            <div>
                                <label className='label'>Título del caso *</label>
                                <input
                                    type="text"
                                    className='input input-bordered w-full'
                                    value={casoEditando.titulo}
                                    onChange={(e) => setCasoEditando({ ...casoEditando, titulo: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className='label'>Descripción</label>
                                <textarea
                                    className='textarea textarea-bordered w-full'
                                    value={casoEditando.descripcion || ''}
                                    onChange={(e) => setCasoEditando({ ...casoEditando, descripcion: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className='label'>Fecha de creación *</label>
                                <DatePicker
                                    selected={casoEditando.fecha_creacion}
                                    onChange={(date) => setCasoEditando({ ...casoEditando, fecha_creacion: date })}
                                    className='input input-bordered w-full'
                                    dateFormat="dd/MM/yyyy"
                                    maxDate={new Date()}
                                    showYearDropdown
                                    showMonthDropdown
                                    dropdownMode="select"
                                    placeholderText="Seleccione la fecha de creación"
                                />
                            </div>

                            <div>
                                <label className='label'>Tipo de fuente *</label>
                                <select
                                    className='select select-bordered w-full'
                                    value={casoEditando.tipo_fuente}
                                    onChange={(e) => setCasoEditando({ ...casoEditando, tipo_fuente: e.target.value })}
                                >
                                    <option value="derivacion">Derivación</option>
                                    <option value="denuncia_presencial">Denuncia Presencial</option>
                                    <option value="denuncia_online">Denuncia Online/Correo</option>
                                    <option value="entrevista_preliminar">Entrevista Preliminar</option>
                                </select>
                            </div>

                            <div>
                                <label className='label'>Fuente</label>
                                <input
                                    type="text"
                                    className='input input-bordered w-full'
                                    value={casoEditando.fuente || ''}
                                    onChange={(e) => setCasoEditando({ ...casoEditando, fuente: e.target.value })}
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
                                    className="btn btn-primary"
                                    onClick={handleActualizarCaso}
                                >
                                    Actualizar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>

            {/* Modal Finalizar Caso */}
            <dialog id="modal_finalizar_caso" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">Finalizar Caso</h3>

                    {casoParaFinalizar && (
                        <div className='flex flex-col gap-4'>
                            <div className="bg-base-200 p-3 rounded-lg">
                                <p className="font-semibold">{casoParaFinalizar.titulo}</p>
                                <p className="text-sm opacity-70">Estado actual: {casoParaFinalizar.estado}</p>
                            </div>

                            <div>
                                <label className='label'>Forma de finalización *</label>
                                <select
                                    className='select select-bordered w-full'
                                    value={formaFinalizacion}
                                    onChange={(e) => setFormaFinalizacion(e.target.value)}
                                >
                                    <option value="">Seleccione forma de finalización</option>
                                    <option value="Acuerdo">Acuerdo</option>
                                    <option value="Derivacion">Derivación</option>
                                    <option value="Frustrado">Frustrado</option>
                                </select>
                            </div>

                            <div>
                                <label className='label'>Comentarios adicionales</label>
                                <textarea
                                    className='textarea textarea-bordered w-full'
                                    placeholder='Agregue comentarios sobre la finalización del caso...'
                                    value={comentariosFinalizacion}
                                    onChange={(e) => setComentariosFinalizacion(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className='label'>Fecha de finalización *</label>
                                <DatePicker
                                    selected={fechaFinalizacion}
                                    onChange={(date) => setFechaFinalizacion(date)}
                                    className='input input-bordered w-full'
                                    showTimeSelect
                                    timeFormat="HH:mm"
                                    timeIntervals={15}
                                    dateFormat="dd/MM/yyyy HH:mm"
                                    maxDate={new Date()}
                                    showYearDropdown
                                    showMonthDropdown
                                    dropdownMode="select"
                                    placeholderText="Seleccione fecha y hora de finalización"
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
                                    className="btn btn-error"
                                    onClick={handleFinalizarCaso}
                                    disabled={!formaFinalizacion}
                                >
                                    Finalizar Caso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>

            {/* Modal para mostrar detalles de entrevista preliminar */}
            <dialog id="modal_entrevista_preliminar_principal" className="modal">
                <div className="modal-box max-w-2xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FaComments className="text-blue-600" />
                        Detalles de Entrevista Preliminar
                    </h3>

                    {entrevistaPreliminarDetalle && (
                        <div className='flex flex-col gap-4'>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-blue-700">Información de la Persona</h4>
                                    <p><strong>Nombre:</strong> {entrevistaPreliminarDetalle.entrevista_persona}</p>
                                </div>

                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-blue-700">Información de la Entrevista</h4>
                                    {entrevistaPreliminarDetalle.entrevista_fecha && (
                                        <p><strong>Fecha:</strong> {new Date(entrevistaPreliminarDetalle.entrevista_fecha).toLocaleString('es-ES')}</p>
                                    )}
                                </div>
                            </div>

                            {entrevistaPreliminarDetalle.entrevista_resumen && (
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-blue-700">Resumen de la Conversación</h4>
                                    <p className="text-sm whitespace-pre-wrap">{entrevistaPreliminarDetalle.entrevista_resumen}</p>
                                </div>
                            )}

                            {entrevistaPreliminarDetalle.entrevista_notas && (
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-blue-700">Notas Adicionales</h4>
                                    <p className="text-sm whitespace-pre-wrap">{entrevistaPreliminarDetalle.entrevista_notas}</p>
                                </div>
                            )}

                            <div className="bg-success/10 border border-success/20 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2 text-success">Estado de Evolución</h4>
                                <p className="text-sm text-success">
                                    ✅ Esta entrevista preliminar evolucionó exitosamente al caso: <strong>"{entrevistaPreliminarDetalle.titulo}"</strong>
                                </p>
                            </div>
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

            {/* Modal para resolver caso */}
            <dialog id="modal_resolver_caso" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg mb-4">Resolver Caso</h3>

                    {casoParaResolver && (
                        <div className='flex flex-col gap-4'>
                            <div className="bg-base-200 p-3 rounded-lg">
                                <p className="font-semibold">{casoParaResolver.titulo}</p>
                                <p className="text-sm opacity-70">Estado actual: {casoParaResolver.estado}</p>
                            </div>

                            <div>
                                <label className='label'>Descripción de la resolución *</label>
                                <textarea
                                    className='textarea textarea-bordered w-full'
                                    placeholder='Describe detalladamente cómo se resolvió el caso...'
                                    value={resolucion}
                                    onChange={(e) => setResolucion(e.target.value)}
                                    rows={4}
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
                                    className="btn btn-success"
                                    onClick={handleResolver}
                                    disabled={!resolucion.trim()}
                                >
                                    Resolver Caso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>
        </div>
    )
}

export default Principal