import React, { useState, useEffect } from 'react';
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';
import apiClient from '../../AuxS/Axiosinstance';
import { useToast } from '../../Componentes/ToastContext';
import {
    FaCalendarAlt,
    FaClock,
    FaMapMarkerAlt,
    FaUsers,
    FaEdit,
    FaTrash,
    FaPlus,
    FaSearch,
    FaTimes,
    FaStickyNote,
    FaFileAlt,
    FaSave,
    FaUser
} from 'react-icons/fa';
import { IoMdAdd } from 'react-icons/io';
import { BsPersonPlus } from 'react-icons/bs';

const EntrevistasManager = ({ casoId, afectadosCaso }) => {
    const { mostrarToast } = useToast();

    // Estados para entrevistas
    const [entrevistas, setEntrevistas] = useState([]);
    const [loadingEntrevistas, setLoadingEntrevistas] = useState(false);

    // Estados para formulario de entrevista
    const [formularioEntrevista, setFormularioEntrevista] = useState({
        fecha: '',
        hora: '',
        lugar: '',
        descripcion: '',
        integrantes: []
    });
    const [editandoEntrevista, setEditandoEntrevista] = useState(null);
    const [guardandoEntrevista, setGuardandoEntrevista] = useState(false);

    // Estados para búsqueda y filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroFecha, setFiltroFecha] = useState('');

    // Estados para anotaciones
    const [anotaciones, setAnotaciones] = useState([]);
    const [entrevistaActual, setEntrevistaActual] = useState(null);
    const [formularioAnotacion, setFormularioAnotacion] = useState({
        titulo: '',
        contenido: '',
        color: 'bg-primary'
    });
    const [editandoAnotacion, setEditandoAnotacion] = useState(null);
    const [guardandoAnotacion, setGuardandoAnotacion] = useState(false);

    // Modal Entrevistas (mantener para compatibilidad)
    const [date, setDate] = useState(new Date());
    const [Integrantes, SetIntegrantes] = useState([]);

    // -------- Manejo de modals y formularios ------------

    const limpiarFormularioEntrevista = () => {
        setFormularioEntrevista({
            fecha: '',
            hora: '',
            lugar: '',
            descripcion: '',
            integrantes: []
        });
        setEditandoEntrevista(null);
        SetIntegrantes([]);
    };

    const limpiarFormularioAnotacion = () => {
        setFormularioAnotacion({
            titulo: '',
            contenido: '',
            color: 'bg-primary'
        });
        setEditandoAnotacion(null);
    };

    // -------- Funciones para Dialog de Anotaciones ------------
    const AbrirDialogAnotacion = () => {
        limpiarFormularioAnotacion();
        document.getElementById('CrearAnotacion').showModal();
    };

    const CerrarDialogAnotacion = () => {
        limpiarFormularioAnotacion();
        document.getElementById('CrearAnotacion').close();
    };

    // --------- Modal Crear nueva entrevista
    const CancelarModalEntrevista = () => {
        limpiarFormularioEntrevista();
        document.getElementById('CrearEntrevistas').close();
    }

    const GuardarModalEntrevista = async () => {
        // Validaciones
        if (!formularioEntrevista.fecha || !formularioEntrevista.hora || !formularioEntrevista.lugar) {
            mostrarToast('Fecha, hora y lugar son requeridos', 'error');
            return;
        }

        if (Integrantes.length === 0) {
            mostrarToast('Debe seleccionar al menos un integrante', 'error');
            return;
        }

        setGuardandoEntrevista(true);
        try {
            const datosEntrevista = {
                fecha_hora: `${formularioEntrevista.fecha}T${formularioEntrevista.hora}:00`,
                lugar: formularioEntrevista.lugar,
                resumen: formularioEntrevista.descripcion, // Mapear descripcion a resumen
                participantes: Integrantes
            };

            console.log('Datos que se envían al backend:', datosEntrevista);

            if (editandoEntrevista) {
                // Actualizar entrevista existente
                await apiClient.put(`/api/entrevistas/${editandoEntrevista}`, datosEntrevista);
                mostrarToast('Entrevista actualizada exitosamente', 'success');
            } else {
                // Crear nueva entrevista
                await apiClient.post(`/api/entrevistas/casos/${casoId}/entrevistas`, datosEntrevista);
                mostrarToast('Entrevista creada exitosamente', 'success');
            }

            limpiarFormularioEntrevista();
            document.getElementById('CrearEntrevistas').close();
            // Pequeño delay para asegurar que el backend procesó los datos
            setTimeout(() => {
                cargarEntrevistas();
            }, 500);
        } catch (error) {
            console.error('Error guardando entrevista:', error);
            mostrarToast(error.response?.data?.error || 'Error al guardar entrevista', 'error');
        } finally {
            setGuardandoEntrevista(false);
        }
    }

    // -------- Entrevistas detalles ------------
    const AbrirDetallesEntrevistas = (entrevista) => {
        setEntrevistaActual(entrevista);
        const entrevistaId = entrevista.id_entrevista || entrevista.id || entrevista._id;
        cargarAnotaciones(entrevistaId);
        document.getElementById('VerdetallesEntrevistas').showModal();
    }

    const CerrarDetallesEntrevistas = () => {
        setEntrevistaActual(null);
        setAnotaciones([]);
        limpiarFormularioAnotacion();
        document.getElementById('VerdetallesEntrevistas').close();
    }

    // --------- Modal Añadir integrantes
    const CerrarModalAñadirIntegrantes = () => {
        document.getElementById('AñadirIntegrantes').close();
    }

    const GuardarAñadirIntegrantes = () => {
        // Enviar al backend el guardar integrantes
        document.getElementById('AñadirIntegrantes').close();
    }

    const SetterIntegrantes = (event) => {
        SetIntegrantes(event.target.value);
    }

    const AñadirIntegrante = (Integrante) => {
        SetIntegrantes([...Integrantes, Integrante]);
        console.log("Añadido");
    }

    const RetirarIntegrante = (Integrante) => {
        // Si integrante es un objeto, comparar por ID
        const integranteId = typeof Integrante === 'object' && Integrante !== null ?
            (Integrante.id_afectado || Integrante.id) : Integrante;

        SetIntegrantes(Integrantes.filter(item => {
            const itemId = typeof item === 'object' && item !== null ?
                (item.id_afectado || item.id) : item;
            return itemId !== integranteId;
        }));
        console.log("Eliminado");
    }

    // -------- Funciones para Anotaciones ------------
    const cargarAnotaciones = async (entrevistaId) => {
        try {
            // Por ahora simular datos locales
            const anotacionesLocal = JSON.parse(localStorage.getItem(`anotaciones_${entrevistaId}`)) || [];
            setAnotaciones(anotacionesLocal);
        } catch (error) {
            console.error('Error cargando anotaciones:', error);
            setAnotaciones([]);
        }
    };

    const guardarAnotacion = async () => {
        if (!formularioAnotacion.titulo.trim() || !formularioAnotacion.contenido.trim()) {
            mostrarToast('Título y contenido son requeridos', 'error');
            return;
        }

        setGuardandoAnotacion(true);
        try {
            const nuevaAnotacion = {
                id: editandoAnotacion || Date.now(),
                titulo: formularioAnotacion.titulo,
                contenido: formularioAnotacion.contenido,
                color: formularioAnotacion.color,
                fecha: new Date().toISOString(),
                entrevistaId: entrevistaActual.id_entrevista || entrevistaActual.id || entrevistaActual._id
            };

            let anotacionesActualizadas;
            if (editandoAnotacion) {
                anotacionesActualizadas = anotaciones.map(a =>
                    a.id === editandoAnotacion ? nuevaAnotacion : a
                );
                mostrarToast('Anotación actualizada', 'success');
            } else {
                anotacionesActualizadas = [...anotaciones, nuevaAnotacion];
                mostrarToast('Anotación creada', 'success');
            }

            localStorage.setItem(`anotaciones_${entrevistaActual.id_entrevista || entrevistaActual.id || entrevistaActual._id}`, JSON.stringify(anotacionesActualizadas));
            setAnotaciones(anotacionesActualizadas);
            CerrarDialogAnotacion();
        } catch (error) {
            console.error('Error guardando anotación:', error);
            mostrarToast('Error al guardar anotación', 'error');
        } finally {
            setGuardandoAnotacion(false);
        }
    };

    const editarAnotacion = (anotacion) => {
        setFormularioAnotacion({
            titulo: anotacion.titulo,
            contenido: anotacion.contenido,
            color: anotacion.color
        });
        setEditandoAnotacion(anotacion.id);
        document.getElementById('CrearAnotacion').showModal();
    };

    const eliminarAnotacion = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta anotación?')) return;

        try {
            const anotacionesActualizadas = anotaciones.filter(a => a.id !== id);
            localStorage.setItem(`anotaciones_${entrevistaActual.id_entrevista || entrevistaActual.id || entrevistaActual._id}`, JSON.stringify(anotacionesActualizadas));
            setAnotaciones(anotacionesActualizadas);
            mostrarToast('Anotación eliminada', 'success');
        } catch (error) {
            console.error('Error eliminando anotación:', error);
            mostrarToast('Error al eliminar anotación', 'error');
        }
    };

    // Función que simula una llamada a la base de datos para entrevistas
    const simularLlamadaEntrevistas = async () => {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 800));

        // Datos simulados de entrevistas más simples
        const entrevistasSimuladas = [
            {
                id: 1,
                hora: new Date("2024-02-15T09:00:00"),
                lugar: "Sala de conferencias A",
                descripcion: "Entrevista inicial con testigos principales",
                id_integrantes: []
            },
            {
                id: 2,
                hora: new Date("2024-02-15T14:30:00"),
                lugar: "Oficina principal - Piso 2",
                descripcion: "Seguimiento de declaraciones previas",
                id_integrantes: []
            }
        ];

        return entrevistasSimuladas;
    };

    const cargarEntrevistas = async () => {
        if (!casoId) return;

        setLoadingEntrevistas(true);
        try {
            const response = await apiClient.get(`/api/entrevistas/casos/${casoId}/entrevistas`);
            const entrevistasData = response.data.entrevistas || response.data;
            console.log('Entrevistas cargadas:', entrevistasData);
            setEntrevistas(entrevistasData);
        } catch (error) {
            console.error('Error cargando entrevistas:', error);
            // Fallback a datos simulados si hay error
            const entrevistasObtenidas = await simularLlamadaEntrevistas();
            console.log('Usando datos simulados:', entrevistasObtenidas);
            setEntrevistas(entrevistasObtenidas);
        } finally {
            setLoadingEntrevistas(false);
        }
    };

    const editarEntrevista = (entrevista) => {
        try {
            console.log('Editando entrevista:', entrevista);
            console.log('Participantes originales:', entrevista.participantes);

            // Obtener ID de manera robusta
            const entrevistaId = entrevista.id_entrevista || entrevista.id || entrevista._id;

            if (!entrevistaId) {
                mostrarToast('Error: No se puede editar la entrevista, ID inválido', 'error');
                return;
            }

            // Prellenar formulario con datos de la entrevista
            const fechaHora = new Date(entrevista.fecha_hora || entrevista.hora);
            const fecha = fechaHora.toISOString().split('T')[0];
            const hora = fechaHora.toTimeString().split(':').slice(0, 2).join(':');

            const participantes = entrevista.participantes || entrevista.integrantes || entrevista.id_integrantes || [];

            // Extraer IDs de participantes si vienen como objetos
            const participantesIds = participantes.map(p => {
                if (typeof p === 'object' && p.id_afectado) {
                    return p.id_afectado;
                }
                return p;
            });

            console.log('Participantes procesados:', participantesIds);

            setFormularioEntrevista({
                fecha: fecha,
                hora: hora,
                lugar: entrevista.lugar || '',
                descripcion: entrevista.resumen || entrevista.descripcion || '',
                integrantes: participantesIds
            });

            SetIntegrantes(participantesIds);
            setEditandoEntrevista(entrevistaId);
            document.getElementById('CrearEntrevistas').showModal();
        } catch (error) {
            console.error('Error al cargar datos de entrevista:', error);
            mostrarToast('Error al cargar datos de la entrevista', 'error');
        }
    };

    const eliminarEntrevista = async (id, titulo) => {
        // Validar que el ID existe
        if (!id || id === undefined) {
            console.error('Error: ID de entrevista no válido:', id);
            mostrarToast('Error: No se puede eliminar la entrevista, ID inválido', 'error');
            return;
        }

        if (!confirm(`¿Estás seguro de que deseas eliminar la entrevista #${id}?`)) {
            return;
        }

        try {
            await apiClient.delete(`/api/entrevistas/${id}`);
            mostrarToast('Entrevista eliminada exitosamente', 'success');
            cargarEntrevistas();
        } catch (error) {
            console.error('Error eliminando entrevista:', error);
            mostrarToast('Error al eliminar entrevista', 'error');
        }
    };

    // Filtrar entrevistas según búsqueda
    const entrevistasFiltradas = entrevistas.filter(entrevista => {
        const cumpleBusqueda = !busqueda ||
            entrevista.lugar?.toLowerCase().includes(busqueda.toLowerCase()) ||
            entrevista.id_integrantes?.some(nombre =>
                nombre.toLowerCase().includes(busqueda.toLowerCase())
            ) ||
            entrevista.descripcion?.toLowerCase().includes(busqueda.toLowerCase());

        const cumpleFecha = !filtroFecha ||
            entrevista.hora?.includes(filtroFecha) ||
            entrevista.fecha_hora?.includes(filtroFecha);

        return cumpleBusqueda && cumpleFecha;
    });

    useEffect(() => {
        if (casoId) {
            cargarEntrevistas();
        }
    }, [casoId]);

    return (
        <div className='flex flex-col gap-2 p-3'>
            <div className='flex justify-between'>
                <h2 className='text-2xl font-bold'>Entrevistas ({entrevistasFiltradas.length})</h2>
                <button
                    className="btn btn-accent"
                    onClick={() => {
                        limpiarFormularioEntrevista();
                        document.getElementById('CrearEntrevistas').showModal();
                    }}
                >
                    <FaPlus className="mr-2" />
                    Crear nueva entrevista
                </button>
            </div>

            {/* Filtros de búsqueda */}
            <div className='flex gap-2 p-3'>
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        className='input input-bordered w-full pl-10'
                        placeholder='Buscar por lugar, participantes o descripción...'
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="date"
                        className='input input-bordered pl-10'
                        placeholder='Filtrar por fecha'
                        value={filtroFecha}
                        onChange={(e) => setFiltroFecha(e.target.value)}
                    />
                </div>
                {(busqueda || filtroFecha) && (
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                            setBusqueda('');
                            setFiltroFecha('');
                        }}
                    >
                        <FaTimes className="mr-1" />
                        Limpiar
                    </button>
                )}
            </div>

            {loadingEntrevistas ? (
                <div className="text-center text-gray-500 py-8">
                    <div className="loading loading-spinner loading-lg"></div>
                    <p className="mt-2">Cargando entrevistas...</p>
                </div>
            ) : entrevistasFiltradas.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                    <p>{entrevistas.length === 0 ? 'No hay entrevistas registradas' : 'No se encontraron entrevistas con los filtros aplicados'}</p>
                    {entrevistas.length === 0 && (
                        <button
                            className="btn btn-primary mt-4"
                            onClick={() => {
                                limpiarFormularioEntrevista();
                                document.getElementById('CrearEntrevistas').showModal();
                            }}
                        >
                            <FaPlus className="mr-2" />
                            Crear primera entrevista
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 mt-4">
                    {entrevistasFiltradas.map((entrevista) => (
                        <div key={entrevista.id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="card-body">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="card-title text-lg flex items-center gap-2">
                                            <FaStickyNote className="text-primary" />
                                            Entrevista #{entrevista.id_entrevista || entrevista.id || entrevista._id || 'Sin ID'}
                                            <span className="badge badge-primary badge-sm">
                                                ID: {entrevista.id_entrevista || entrevista.id || entrevista._id || 'N/A'}
                                            </span>
                                        </h3>
                                        <div className="flex flex-col gap-2 mt-3">
                                            <div className="flex items-center gap-2">
                                                <FaCalendarAlt className="text-gray-500" />
                                                <span className="text-gray-500">Fecha y hora:</span>
                                                <span className="font-medium">
                                                    {(entrevista.fecha_hora || entrevista.hora) ?
                                                        new Date(entrevista.fecha_hora || entrevista.hora).toLocaleString('es-ES', {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) : 'Fecha no especificada'
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FaMapMarkerAlt className="text-gray-500" />
                                                <span className="text-gray-500">Lugar:</span>
                                                <span className="font-medium">{entrevista.lugar}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <FaUsers className="text-gray-500" />
                                                <span className="text-gray-500">Participantes:</span>
                                                <span className="text-sm">
                                                    {(() => {
                                                        const participantes = entrevista.participantes || entrevista.integrantes || entrevista.id_integrantes || [];
                                                        if (participantes.length === 0) return 'Sin participantes asignados';

                                                        return participantes.map(p => {
                                                            // Si es un objeto del backend con estructura completa
                                                            if (typeof p === 'object' && p !== null) {
                                                                return p.nombre || p.Nombre || `ID: ${p.id_afectado || p.id || JSON.stringify(p)}`;
                                                            }
                                                            // Si es string
                                                            if (typeof p === 'string') return p;
                                                            // Si es número, buscar en afectadosCaso
                                                            const afectado = afectadosCaso.find(a => a.id_afectado === p || a.id === p);
                                                            return afectado ? (afectado.nombre || afectado.Nombre) : `ID: ${p}`;
                                                        }).join(', ');
                                                    })()
                                                    }
                                                </span>
                                            </div>
                                            {(entrevista.resumen || entrevista.descripcion) && (
                                                <div className="flex items-start gap-2 mt-2">
                                                    <FaFileAlt className="text-gray-500 mt-1" />
                                                    <span className="text-gray-500">Descripción:</span>
                                                    <span className="text-sm text-gray-700">{entrevista.resumen || entrevista.descripcion}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="card-actions flex flex-col gap-2">
                                        <button
                                            onClick={() => AbrirDetallesEntrevistas(entrevista)}
                                            className="btn btn-info btn-sm"
                                        >
                                            <FaStickyNote className="mr-1" />
                                            Anotaciones
                                        </button>
                                        <button
                                            onClick={() => {
                                                console.log('Editar entrevista - Objeto:', entrevista);
                                                editarEntrevista(entrevista);
                                            }}
                                            className="btn btn-primary btn-sm"
                                        >
                                            <FaEdit className="mr-1" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => {
                                                const entrevistaId = entrevista.id_entrevista || entrevista.id || entrevista._id;
                                                console.log('Eliminar entrevista - ID:', entrevistaId, 'Objeto:', entrevista);
                                                eliminarEntrevista(entrevistaId, `Entrevista #${entrevistaId}`);
                                            }}
                                            className="btn btn-error btn-sm"
                                        >
                                            <FaTrash className="mr-1" />
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODALES */}

            {/* Modal Crear/Editar Entrevistas */}
            <dialog id="CrearEntrevistas" className="modal">
                <div className="modal-box max-w-2xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        {editandoEntrevista ? (
                            <>
                                <FaEdit className="text-primary" />
                                Editar entrevista
                            </>
                        ) : (
                            <>
                                <FaPlus className="text-accent" />
                                Crear nueva entrevista
                            </>
                        )}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Fecha */}
                        <div>
                            <label className="label">
                                <span className="label-text">Fecha *</span>
                            </label>
                            <input
                                className='input input-bordered w-full'
                                type="date"
                                value={formularioEntrevista.fecha}
                                onChange={(e) => setFormularioEntrevista({ ...formularioEntrevista, fecha: e.target.value })}
                                required
                            />
                        </div>

                        {/* Hora */}
                        <div>
                            <label className="label">
                                <span className="label-text">Hora *</span>
                            </label>
                            <input
                                className='input input-bordered w-full'
                                type="time"
                                value={formularioEntrevista.hora}
                                onChange={(e) => setFormularioEntrevista({ ...formularioEntrevista, hora: e.target.value })}
                                required
                            />
                        </div>

                        {/* Lugar */}
                        <div className="md:col-span-2">
                            <label className="label">
                                <span className="label-text">Lugar *</span>
                            </label>
                            <input
                                className='input input-bordered w-full'
                                type="text"
                                placeholder="Ej: Sala de conferencias A, Oficina 201, Zoom, etc."
                                value={formularioEntrevista.lugar}
                                onChange={(e) => setFormularioEntrevista({ ...formularioEntrevista, lugar: e.target.value })}
                                required
                            />
                        </div>

                        {/* Descripción */}
                        <div className="md:col-span-2">
                            <label className="label">
                                <span className="label-text">Descripción (opcional)</span>
                            </label>
                            <textarea
                                className='textarea textarea-bordered w-full'
                                placeholder="Descripción o notas sobre la entrevista..."
                                value={formularioEntrevista.descripcion}
                                onChange={(e) => setFormularioEntrevista({ ...formularioEntrevista, descripcion: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Sección de integrantes */}
                    <div className='mt-6'>
                        <div className='flex justify-between items-center mb-3'>
                            <label className="label">
                                <span className="label-text font-medium">Participantes de la entrevista *</span>
                            </label>
                            <button className="btn btn-accent btn-sm" onClick={() => document.getElementById('AñadirIntegrantes').showModal()}>
                                <BsPersonPlus className="mr-1" />
                                Añadir participante
                            </button>
                        </div>
                        <div className="min-h-[80px] p-4 border border-base-300 rounded-lg bg-base-50">
                            {Integrantes.length === 0 ? (
                                <div className="text-center text-gray-500 py-4">
                                    <p className="text-sm">No hay participantes seleccionados</p>
                                    <p className="text-xs">Haz clic en "Añadir participante" para seleccionar afectados</p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {Integrantes.map((integrante, index) => {
                                        // Si integrante es un objeto, extraer su ID
                                        const integranteId = typeof integrante === 'object' && integrante !== null ?
                                            (integrante.id_afectado || integrante.id) : integrante;

                                        const afectado = afectadosCaso.find(item =>
                                            item.id_afectado === integranteId ||
                                            item.id === integranteId
                                        );

                                        let nombre;
                                        if (typeof integrante === 'object' && integrante !== null && integrante.nombre) {
                                            nombre = integrante.nombre;
                                        } else if (afectado) {
                                            nombre = afectado.nombre || afectado.Nombre;
                                        } else if (typeof integrante === 'string') {
                                            nombre = integrante;
                                        } else {
                                            nombre = `ID: ${integranteId}`;
                                        }

                                        return (
                                            <div key={index} className="badge badge-primary gap-2 p-3">
                                                <span>{nombre}</span>
                                                <button
                                                    className="btn btn-ghost btn-xs text-primary-content"
                                                    onClick={() => RetirarIntegrante(integrante)}
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-action mt-6">
                        <button onClick={CancelarModalEntrevista} className='btn btn-outline'>
                            Cancelar
                        </button>
                        <button
                            onClick={GuardarModalEntrevista}
                            className={`btn btn-primary ${guardandoEntrevista ? 'loading' : ''}`}
                            disabled={guardandoEntrevista}
                        >
                            {guardandoEntrevista ? 'Guardando...' : (editandoEntrevista ? 'Actualizar' : 'Crear Entrevista')}
                        </button>
                    </div>
                </div>
            </dialog>

            {/* Modal de integrantes */}
            <dialog id="AñadirIntegrantes" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FaUsers className="text-primary" />
                        Seleccionar Participantes
                    </h3>

                    <div className='pb-3'>
                        <p className="py-4">Selecciona a quien añadir</p>
                        <div className='flex'>
                            <input type="text" className='flex-1 input input-bordered' placeholder='Buscar afectado...' />
                        </div>
                    </div>

                    {/* Cartas de integrantes */}
                    {afectadosCaso.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            <p>Cargando afectados...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
                            {afectadosCaso.map((afectado, index) => (
                                <div key={index} className='flex items-center rounded-2xl bg-base-200'>
                                    <div className='flex flex-1 flex-col p-3'>
                                        <p className='text-xl flex items-center gap-2'>
                                            <FaUser className="text-gray-500" />
                                            {afectado.nombre || afectado.Nombre}
                                        </p>
                                        <p className='text-xs'>Carrera: {afectado.carrera || 'No especificada'}</p>
                                        <p className='text-xs'>Rol: {(afectado.cargo || afectado.tipo || 'sin cargo').charAt(0).toUpperCase() + (afectado.cargo || afectado.tipo || 'sin cargo').slice(1)}</p>
                                    </div>
                                    <div className='flex'>
                                        {!Integrantes.includes(afectado.id_afectado) &&
                                            <button onClick={() => AñadirIntegrante(afectado.id_afectado)} className='btn m-4 btn-accent'>
                                                <FaPlus className="mr-1" />
                                                Añadir
                                            </button>
                                        }
                                        {Integrantes.includes(afectado.id_afectado) &&
                                            <button onClick={() => RetirarIntegrante(afectado.id_afectado)} className='btn m-4 btn-error'>
                                                <FaTimes className="mr-1" />
                                                Retirar
                                            </button>
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="modal-action">
                        <div className='flex gap-3'>
                            <button onClick={() => GuardarAñadirIntegrantes()} className='btn btn-success'>
                                <FaSave className="mr-1" />
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            </dialog>

            {/* Modal Detalles/Anotaciones de Entrevistas */}
            <dialog id="VerdetallesEntrevistas" className="modal">
                <div className="modal-box max-w-4xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FaStickyNote className="text-primary" />
                        Anotaciones de Entrevista
                        {entrevistaActual && (
                            <span className="badge badge-info">
                                Entrevista #{entrevistaActual.id_entrevista || entrevistaActual.id || entrevistaActual._id}
                            </span>
                        )}
                    </h3>

                    {/* Botón para crear nueva anotación */}
                    <div className="flex justify-end mb-4">
                        <button
                            className='btn btn-accent btn-sm'
                            onClick={AbrirDialogAnotacion}
                        >
                            <FaPlus className="mr-1" />
                            Nueva Anotación
                        </button>
                    </div>

                    {/* Lista de anotaciones */}
                    <div className='flex flex-col gap-4 max-h-[50vh] overflow-y-auto'>
                        {anotaciones.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                <p>No hay anotaciones para esta entrevista</p>
                                <p className="text-sm">Haz clic en "Nueva Anotación" para crear la primera</p>
                            </div>
                        ) : (
                            anotaciones.map((anotacion) => (
                                <div key={anotacion.id} className='card bg-base-200 shadow-sm'>
                                    <div className='card-body p-4'>
                                        <div className={`${anotacion.color} text-white rounded-lg p-3 mb-3`}>
                                            <h4 className="font-semibold text-lg">{anotacion.titulo}</h4>
                                        </div>
                                        <p className="text-sm leading-relaxed mb-3">
                                            {anotacion.contenido}
                                        </p>
                                        <div className='flex justify-between items-center'>
                                            <div className='text-xs text-gray-600 flex items-center gap-2'>
                                                <span className="flex items-center gap-1">
                                                    <FaCalendarAlt />
                                                    {new Date(anotacion.fecha).toLocaleString('es-ES')}
                                                </span>
                                            </div>
                                            <div className='flex gap-2'>
                                                <button
                                                    className='btn btn-primary btn-xs'
                                                    onClick={() => editarAnotacion(anotacion)}
                                                >
                                                    <FaEdit className="mr-1" />
                                                    Editar
                                                </button>
                                                <button
                                                    className='btn btn-error btn-xs'
                                                    onClick={() => eliminarAnotacion(anotacion.id)}
                                                >
                                                    <FaTrash className="mr-1" />
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="modal-action mt-6">
                        <button onClick={CerrarDetallesEntrevistas} className='btn btn-outline'>
                            Cerrar
                        </button>
                    </div>
                </div>
            </dialog>

            {/* Dialog para Crear/Editar Anotación */}
            <dialog id="CrearAnotacion" className="modal">
                <div className="modal-box max-w-2xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        {editandoAnotacion ? (
                            <>
                                <FaEdit className="text-primary" />
                                Editar Anotación
                            </>
                        ) : (
                            <>
                                <FaPlus className="text-accent" />
                                Nueva Anotación
                            </>
                        )}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-2">
                            <label className="label">
                                <span className="label-text">Título *</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Título de la anotación..."
                                value={formularioAnotacion.titulo}
                                onChange={(e) => setFormularioAnotacion({ ...formularioAnotacion, titulo: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="label">
                                <span className="label-text">Color</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={formularioAnotacion.color}
                                onChange={(e) => setFormularioAnotacion({ ...formularioAnotacion, color: e.target.value })}
                            >
                                <option value="bg-primary">Azul (Principal)</option>
                                <option value="bg-secondary">Morado (Secundario)</option>
                                <option value="bg-accent">Verde (Acento)</option>
                                <option value="bg-info">Celeste (Info)</option>
                                <option value="bg-success">Verde (Éxito)</option>
                                <option value="bg-warning">Amarillo (Advertencia)</option>
                                <option value="bg-error">Rojo (Error)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="label">
                            <span className="label-text">Contenido *</span>
                        </label>
                        <textarea
                            className="textarea textarea-bordered w-full"
                            rows="4"
                            placeholder="Escribe el contenido de la anotación..."
                            value={formularioAnotacion.contenido}
                            onChange={(e) => setFormularioAnotacion({ ...formularioAnotacion, contenido: e.target.value })}
                        />
                    </div>

                    <div className="modal-action">
                        <button
                            onClick={CerrarDialogAnotacion}
                            className='btn btn-outline'
                        >
                            Cancelar
                        </button>
                        <button
                            className={`btn btn-primary ${guardandoAnotacion ? 'loading' : ''}`}
                            onClick={guardarAnotacion}
                            disabled={guardandoAnotacion}
                        >
                            <FaSave className="mr-1" />
                            {editandoAnotacion ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </dialog>
        </div>
    );
};

export default EntrevistasManager;