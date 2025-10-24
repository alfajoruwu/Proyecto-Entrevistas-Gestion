import React, { useState, useEffect } from 'react'
import Navbar from '../../Componentes/Navbar'
import apiClient from '../../AuxS/Axiosinstance'
import { useToast } from '../../Componentes/ToastContext'
import {
    FaSearch,
    FaUser,
    FaGraduationCap,
    FaUserTie,
    FaBuilding,
    FaClipboardList,
    FaComments,
    FaExclamationCircle,
    FaCheckCircle,
    FaClock,
    FaTimes,
    FaEye
} from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

const Participantes = () => {
    const { mostrarToast } = useToast()
    const navigate = useNavigate()

    // Estados
    const [busqueda, setBusqueda] = useState('')
    const [participantes, setParticipantes] = useState([])
    const [participanteSeleccionado, setParticipanteSeleccionado] = useState(null)
    const [loading, setLoading] = useState(false)
    const [loadingDetalle, setLoadingDetalle] = useState(false)
    const [detalleParticipante, setDetalleParticipante] = useState(null)
    const [entrevistaSeleccionada, setEntrevistaSeleccionada] = useState(null)

    // Buscar participantes
    const buscarParticipantes = async () => {
        if (!busqueda.trim() || busqueda.trim().length < 2) {
            mostrarToast('Ingrese al menos 2 caracteres para buscar', 'warning')
            return
        }

        try {
            setLoading(true)
            const response = await apiClient.get('/api/afectados/buscar/autocompletar', {
                params: { q: busqueda.trim() }
            })
            setParticipantes(response.data)

            if (response.data.length === 0) {
                mostrarToast('No se encontraron participantes', 'info')
            }
        } catch (error) {
            console.error('Error buscando participantes:', error)
            mostrarToast('Error al buscar participantes', 'error')
        } finally {
            setLoading(false)
        }
    }

    // Obtener detalle del participante
    const verDetalleParticipante = async (participante) => {
        try {
            setLoadingDetalle(true)
            setParticipanteSeleccionado(participante)

            // Obtener información completa del participante
            const response = await apiClient.get(`/api/afectados/${participante.id_afectado}/resumen`)
            setDetalleParticipante(response.data)
        } catch (error) {
            console.error('Error obteniendo detalle:', error)
            mostrarToast('Error al cargar información del participante', 'error')
        } finally {
            setLoadingDetalle(false)
        }
    }

    // Icono según tipo de participante
    const obtenerIconoTipo = (tipo) => {
        switch (tipo) {
            case 'Estudiante': return <FaGraduationCap className="text-blue-600" />
            case 'Docente': return <FaUserTie className="text-green-600" />
            case 'Colaborador': return <FaBuilding className="text-purple-600" />
            case 'Funcionario': return <FaUser className="text-orange-600" />
            case 'Administrativo': return <FaUser className="text-red-600" />
            default: return <FaUser />
        }
    }

    // Icono según estado de caso
    const obtenerIconoEstado = (estado) => {
        switch (estado) {
            case 'Recepcionado': return <FaClock className="text-info" />
            case 'En Proceso': return <FaExclamationCircle className="text-warning" />
            case 'Finalizado': return <FaCheckCircle className="text-error" />
            case 'Resolución': return <FaCheckCircle className="text-success" />
            default: return <FaClock />
        }
    }

    // Navegar a caso
    const irACaso = (idCaso) => {
        navigate(`/Casos/${idCaso}`)
    }

    // Ver detalles de entrevista
    const verDetalleEntrevista = (entrevista) => {
        setEntrevistaSeleccionada(entrevista)
        document.getElementById('modal_detalle_entrevista').showModal()
    }

    // Handle Enter key
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            buscarParticipantes()
        }
    }

    return (
        <div>
            <Navbar />

            <div className="p-4">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <FaSearch className="text-primary" />
                        Búsqueda de Participantes
                    </h1>
                    <p className="text-base-content/70 mt-1">
                        Busca participantes por nombre para ver su historial en casos y entrevistas preliminares
                    </p>
                </div>

                {/* Barra de búsqueda */}
                <div className="bg-base-100 p-6 rounded-lg shadow-lg mb-6">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="input input-bordered flex-1"
                            placeholder="Ingrese nombre del participante..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={buscarParticipantes}
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="loading loading-spinner"></span>
                            ) : (
                                <>
                                    <FaSearch /> Buscar
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Lista de resultados */}
                    <div className="lg:col-span-2 bg-base-100 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Resultados de Búsqueda</h2>

                        {participantes.length === 0 && !loading && (
                            <div className="text-center py-8 text-base-content/50">
                                <FaSearch className="text-4xl mx-auto mb-2 opacity-30" />
                                <p>No hay resultados. Realiza una búsqueda.</p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex justify-center py-8">
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                            </div>
                        )}

                        <div className="space-y-2">
                            {participantes.map((participante) => (
                                <div
                                    key={participante.id_afectado}
                                    className={`card ${participanteSeleccionado?.id_afectado === participante.id_afectado
                                        ? 'bg-primary/10 border-2 border-primary'
                                        : 'bg-base-200 hover:bg-base-300'
                                        } cursor-pointer transition-all`}
                                    onClick={() => verDetalleParticipante(participante)}
                                >
                                    <div className="card-body p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl">
                                                {obtenerIconoTipo(participante.tipo)}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold">{participante.nombre}</h3>
                                                <div className="flex gap-2 items-center text-sm">
                                                    <span className="badge badge-sm">{participante.tipo}</span>
                                                    {participante.correo && (
                                                        <span className="text-base-content/70">{participante.correo}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detalle del participante */}
                    <div className="lg:col-span-3 bg-base-100 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Información del Participante</h2>

                        {!participanteSeleccionado && (
                            <div className="text-center py-8 text-base-content/50">
                                <FaUser className="text-4xl mx-auto mb-2 opacity-30" />
                                <p>Selecciona un participante para ver su información</p>
                            </div>
                        )}

                        {loadingDetalle && (
                            <div className="flex justify-center py-8">
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                            </div>
                        )}

                        {participanteSeleccionado && !loadingDetalle && detalleParticipante && (
                            <div className="space-y-4">
                                {/* Información básica */}
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="text-3xl">
                                            {obtenerIconoTipo(participanteSeleccionado.tipo)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">{participanteSeleccionado.nombre}</h3>
                                            <span className="badge badge-primary">{participanteSeleccionado.tipo}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        {participanteSeleccionado.correo && (
                                            <p><strong>Correo:</strong> {participanteSeleccionado.correo}</p>
                                        )}
                                        {participanteSeleccionado.telefono && (
                                            <p><strong>Teléfono:</strong> {participanteSeleccionado.telefono}</p>
                                        )}
                                        {participanteSeleccionado.carrera && (
                                            <p><strong>Carrera:</strong> {participanteSeleccionado.carrera}</p>
                                        )}
                                        {participanteSeleccionado.estamento && (
                                            <p><strong>Estamento:</strong> {participanteSeleccionado.estamento}</p>
                                        )}
                                        {participanteSeleccionado.empresa_servicio && (
                                            <p><strong>Empresa/Servicio:</strong> {participanteSeleccionado.empresa_servicio}</p>
                                        )}
                                        {participanteSeleccionado.unidad && (
                                            <p><strong>Unidad:</strong> {participanteSeleccionado.unidad}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Estadísticas */}
                                <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
                                    <div className="stat">
                                        <div className="stat-figure text-primary">
                                            <FaClipboardList className="text-2xl" />
                                        </div>
                                        <div className="stat-title">Casos</div>
                                        <div className="stat-value text-primary">
                                            {detalleParticipante.total_casos || 0}
                                        </div>
                                    </div>

                                    <div className="stat">
                                        <div className="stat-figure text-secondary">
                                            <FaComments className="text-2xl" />
                                        </div>
                                        <div className="stat-title">Entrevistas</div>
                                        <div className="stat-value text-secondary">
                                            {detalleParticipante.total_entrevistas_preliminares || 0}
                                        </div>
                                    </div>
                                </div>

                                {/* Casos asociados */}
                                {detalleParticipante.casos && detalleParticipante.casos.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                            <FaClipboardList className="text-primary" />
                                            Casos Asociados
                                        </h3>
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {detalleParticipante.casos.map((caso) => (
                                                <div
                                                    key={caso.id_caso}
                                                    className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-all"
                                                    onClick={() => irACaso(caso.id_caso)}
                                                >
                                                    <div className="card-body p-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1">
                                                                <h4 className="font-semibold text-sm">{caso.titulo}</h4>
                                                                <div className="flex gap-2 items-center mt-1">
                                                                    <span className="badge badge-xs">{caso.rol}</span>
                                                                    <span className={`badge badge-xs ${caso.estado === 'Recepcionado' ? 'badge-info' :
                                                                        caso.estado === 'En Proceso' ? 'badge-warning' :
                                                                            caso.estado === 'Finalizado' ? 'badge-error' :
                                                                                'badge-success'
                                                                        }`}>
                                                                        {caso.estado}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="text-xl">
                                                                {obtenerIconoEstado(caso.estado)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Entrevistas preliminares */}
                                {detalleParticipante.entrevistas_preliminares &&
                                    detalleParticipante.entrevistas_preliminares.length > 0 && (
                                        <div>
                                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                                <FaComments className="text-secondary" />
                                                Entrevistas Preliminares
                                            </h3>
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {detalleParticipante.entrevistas_preliminares.map((entrevista) => (
                                                    <div
                                                        key={entrevista.id_entrevista_preliminar}
                                                        className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-all"
                                                        onClick={() => verDetalleEntrevista(entrevista)}
                                                    >
                                                        <div className="card-body p-3">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1">
                                                                    <div className="text-xs text-base-content/70 mb-1">
                                                                        {new Date(entrevista.fecha_entrevista).toLocaleDateString('es-ES')}
                                                                    </div>
                                                                    <p className="text-sm line-clamp-2">{entrevista.resumen_conversacion}</p>
                                                                    {entrevista.evolucionado_a_caso && (
                                                                        <span className="badge badge-success badge-xs mt-1">
                                                                            Evolucionó a caso
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <FaEye className="text-primary text-lg flex-shrink-0" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                {/* Sin información */}
                                {(!detalleParticipante.casos || detalleParticipante.casos.length === 0) &&
                                    (!detalleParticipante.entrevistas_preliminares ||
                                        detalleParticipante.entrevistas_preliminares.length === 0) && (
                                        <div className="alert alert-info">
                                            <FaExclamationCircle />
                                            <span>Este participante no tiene casos ni entrevistas preliminares registradas.</span>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal de detalle de entrevista preliminar */}
                <dialog id="modal_detalle_entrevista" className="modal">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <FaComments className="text-secondary" />
                            Detalle de Entrevista Preliminar
                        </h3>

                        {entrevistaSeleccionada && (
                            <div className='flex flex-col gap-4'>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-base-200 p-4 rounded-lg">
                                        <h4 className="font-semibold mb-2 text-secondary">Información de la Persona</h4>
                                        <p><strong>Nombre:</strong> {entrevistaSeleccionada.persona_entrevistada}</p>
                                        {entrevistaSeleccionada.tipo_persona && (
                                            <p><strong>Tipo:</strong> {entrevistaSeleccionada.tipo_persona}</p>
                                        )}
                                    </div>

                                    <div className="bg-base-200 p-4 rounded-lg">
                                        <h4 className="font-semibold mb-2 text-secondary">Fecha de Entrevista</h4>
                                        <p>{new Date(entrevistaSeleccionada.fecha_entrevista).toLocaleString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}</p>
                                    </div>
                                </div>

                                {entrevistaSeleccionada.resumen_conversacion && (
                                    <div className="bg-base-200 p-4 rounded-lg">
                                        <h4 className="font-semibold mb-2 text-secondary">Resumen de la Conversación</h4>
                                        <p className="text-sm whitespace-pre-wrap">{entrevistaSeleccionada.resumen_conversacion}</p>
                                    </div>
                                )}

                                {entrevistaSeleccionada.notas_adicionales && (
                                    <div className="bg-base-200 p-4 rounded-lg">
                                        <h4 className="font-semibold mb-2 text-secondary">Notas Adicionales</h4>
                                        <p className="text-sm whitespace-pre-wrap">{entrevistaSeleccionada.notas_adicionales}</p>
                                    </div>
                                )}

                                {entrevistaSeleccionada.evolucionado_a_caso && (
                                    <div className="bg-success/10 border border-success/20 p-4 rounded-lg">
                                        <h4 className="font-semibold mb-2 text-success">Estado de Evolución</h4>
                                        <p className="text-sm text-success flex items-center gap-2">
                                            <FaCheckCircle />
                                            Esta entrevista preliminar evolucionó exitosamente a un caso
                                        </p>
                                        {entrevistaSeleccionada.id_caso_relacionado && (
                                            <button
                                                className="btn btn-sm btn-success mt-2"
                                                onClick={() => {
                                                    document.getElementById('modal_detalle_entrevista').close()
                                                    irACaso(entrevistaSeleccionada.id_caso_relacionado)
                                                }}
                                            >
                                                Ver Caso Relacionado
                                            </button>
                                        )}
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
        </div>
    )
}

export default Participantes
