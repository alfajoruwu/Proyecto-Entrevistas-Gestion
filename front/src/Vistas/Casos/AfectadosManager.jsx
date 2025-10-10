import React, { useState, useEffect } from 'react';
import apiClient from '../../AuxS/Axiosinstance';
import { useToast } from '../../Componentes/ToastContext';
import {
    FaPlus,
    FaEdit,
    FaTrash,
    FaClipboardList,
    FaChartPie,
    FaArrowRight,
    FaExclamationTriangle,
    FaUserTag
} from 'react-icons/fa'; const AfectadosManager = ({ casoId, onAfectadosChange }) => {
    const { mostrarToast } = useToast();

    // Estados para afectados del caso
    const [afectadosCaso, setAfectadosCaso] = useState([]);
    const [loadingAfectados, setLoadingAfectados] = useState(false);
    const [casoInfo, setCasoInfo] = useState(null);

    // Estados para formulario de afectado
    const [formularioAfectado, setFormularioAfectado] = useState({
        tipo: '',
        nombre: '',
        correo: '',
        telefono: '',
        carrera: '',
        cargo: '',
        empresa_servicio: '',
        unidad: '',
        rol: '' // Rol en el caso actual
    });
    const [editandoAfectado, setEditandoAfectado] = useState(null);
    const [historialAfectado, setHistorialAfectado] = useState(null);

    // Estados para autocompletado
    const [sugerenciasAfectados, setSugerenciasAfectados] = useState([]);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

    // Estado para resumen de casos
    const [resumenCasos, setResumenCasos] = useState(null);

    // ============ FUNCIONES PARA AFECTADOS DEL CASO ============

    const cargarAfectadosCaso = async () => {
        if (!casoId) return;

        setLoadingAfectados(true);
        try {
            const response = await apiClient.get(`/api/afectados/casos/${casoId}/afectados`);
            setAfectadosCaso(response.data.afectados);
            setCasoInfo(response.data.caso);

            // Notificar al componente padre sobre los afectados
            if (onAfectadosChange) {
                onAfectadosChange(response.data.afectados);
            }
        } catch (error) {
            console.error('Error cargando afectados del caso:', error);
            mostrarToast('Error al cargar afectados del caso', 'error');
        } finally {
            setLoadingAfectados(false);
        }
    };

    const buscarAfectadosAutocompletar = async (query) => {
        if (query.length < 2) {
            setSugerenciasAfectados([]);
            setMostrarSugerencias(false);
            return;
        }

        try {
            const response = await apiClient.get('/api/afectados/buscar/autocompletar', {
                params: { q: query }
            });
            setSugerenciasAfectados(response.data);
            setMostrarSugerencias(true);
        } catch (error) {
            console.error('Error en autocompletado:', error);
            setSugerenciasAfectados([]);
        }
    };

    const seleccionarAfectadoExistente = async (afectado) => {
        // Si selecciona un afectado existente, agregarlo al caso
        if (!formularioAfectado.rol) {
            mostrarToast('Selecciona un rol para el afectado', 'error');
            return;
        }

        try {
            await apiClient.post(`/api/afectados/casos/${casoId}/afectados`, {
                id_afectado: afectado.id_afectado,
                rol: formularioAfectado.rol
            });

            mostrarToast('Afectado agregado al caso exitosamente', 'success');
            limpiarFormularioAfectado();
            document.getElementById('AñadirAfectado').close();
            cargarAfectadosCaso();
        } catch (error) {
            console.error('Error agregando afectado al caso:', error);
            mostrarToast(error.response?.data?.error || 'Error al agregar afectado al caso', 'error');
        }
    };

    const seleccionarAfectadoSugerencia = (afectado) => {
        setFormularioAfectado({
            tipo: afectado.tipo,
            nombre: afectado.nombre,
            correo: afectado.correo || '',
            telefono: afectado.telefono || '',
            carrera: afectado.carrera || '',
            cargo: afectado.cargo || '',
            empresa_servicio: afectado.empresa_servicio || '',
            unidad: afectado.unidad || '',
            rol: formularioAfectado.rol // Mantener el rol seleccionado
        });
        setMostrarSugerencias(false);

        // Mostrar historial si tiene casos previos
        if (afectado.total_casos > 0) {
            setHistorialAfectado(afectado);
        }
    };

    const limpiarFormularioAfectado = () => {
        setFormularioAfectado({
            tipo: '',
            nombre: '',
            correo: '',
            telefono: '',
            carrera: '',
            cargo: '',
            empresa_servicio: '',
            unidad: '',
            rol: ''
        });
        setEditandoAfectado(null);
        setHistorialAfectado(null);
        setSugerenciasAfectados([]);
        setMostrarSugerencias(false);
    };

    const guardarAfectado = async () => {
        try {
            if (!formularioAfectado.tipo || !formularioAfectado.nombre || !formularioAfectado.rol) {
                mostrarToast('Tipo, nombre y rol son requeridos', 'error');
                return;
            }

            if (editandoAfectado) {
                // Actualizar afectado existente en el caso
                await apiClient.put(`/api/afectados/casos/${casoId}/afectados/${editandoAfectado}`, {
                    rol: formularioAfectado.rol
                });
                mostrarToast('Rol del afectado actualizado exitosamente', 'success');
            } else {
                // Crear nuevo afectado y asignarlo al caso
                await apiClient.post(`/api/afectados/casos/${casoId}/afectados/nuevo`, formularioAfectado);
                mostrarToast('Afectado creado y agregado al caso exitosamente', 'success');
            }

            limpiarFormularioAfectado();
            document.getElementById('AñadirAfectado').close();
            cargarAfectadosCaso();
        } catch (error) {
            console.error('Error guardando afectado:', error);
            mostrarToast(error.response?.data?.error || 'Error al guardar afectado', 'error');
        }
    };

    const editarRolAfectado = (afectado) => {
        setFormularioAfectado({
            tipo: afectado.tipo,
            nombre: afectado.nombre,
            correo: afectado.correo || '',
            telefono: afectado.telefono || '',
            carrera: afectado.carrera || '',
            cargo: afectado.cargo || '',
            empresa_servicio: afectado.empresa_servicio || '',
            unidad: afectado.unidad || '',
            rol: afectado.rol
        });
        setEditandoAfectado(afectado.id_afectado);
        document.getElementById('AñadirAfectado').showModal();
    };

    const removerAfectadoDeCaso = async (id_afectado, nombre) => {
        if (!confirm(`¿Estás seguro de que deseas remover a ${nombre} de este caso?`)) {
            return;
        }

        try {
            await apiClient.delete(`/api/afectados/casos/${casoId}/afectados/${id_afectado}`);
            mostrarToast('Afectado removido del caso exitosamente', 'success');
            cargarAfectadosCaso();
        } catch (error) {
            console.error('Error removiendo afectado del caso:', error);
            mostrarToast(error.response?.data?.error || 'Error al remover afectado del caso', 'error');
        }
    };

    const verHistorialCompleto = async (afectado) => {
        try {
            const response = await apiClient.get(`/api/afectados/${afectado.id_afectado}/historial`);
            setHistorialAfectado(response.data);
            document.getElementById('HistorialAfectado').showModal();
        } catch (error) {
            console.error('Error cargando historial:', error);
            mostrarToast('Error al cargar historial', 'error');
        }
    };

    const verResumenCasos = async (afectado) => {
        try {
            const response = await apiClient.get(`/api/afectados/${afectado.id_afectado}/resumen`);
            setResumenCasos({
                afectado: afectado,
                ...response.data
            });
            document.getElementById('ResumenCasos').showModal();
        } catch (error) {
            console.error('Error cargando resumen de casos:', error);
            // Fallback con datos de ejemplo si hay error
            setResumenCasos({
                afectado: afectado,
                total_casos: afectado.total_casos || 3,
                roles_participacion: [
                    { rol: 'Denunciante', cantidad: 2, casos_activos: 1 },
                    { rol: 'Testigo', cantidad: 1, casos_activos: 0 }
                ],
                casos_por_estado: [
                    { estado: 'En Proceso', cantidad: 1 },
                    { estado: 'Finalizado', cantidad: 2 }
                ],
                ultima_participacion: new Date().toISOString(),
                casos_destacados: [
                    { id_caso: 1, titulo: 'Caso de Ejemplo 1', rol: 'Denunciante', estado: 'En Proceso' },
                    { id_caso: 2, titulo: 'Caso de Ejemplo 2', rol: 'Testigo', estado: 'Finalizado' }
                ]
            });
            document.getElementById('ResumenCasos').showModal();
        }
    };

    // Cargar afectados del caso cuando cambie el ID
    useEffect(() => {
        if (casoId) {
            cargarAfectadosCaso();
        }
    }, [casoId]);

    return (
        <div className='flex flex-col gap-4 p-4'>
            <div className='flex justify-between items-center'>
                <h2 className='text-2xl font-bold'>Gestión de Afectados ({afectadosCaso.length})</h2>
                <button
                    className="btn btn-accent"
                    onClick={() => {
                        limpiarFormularioAfectado();
                        document.getElementById('AñadirAfectado').showModal();
                    }}
                >
                    <FaPlus className="mr-2" />
                    Agregar afectado
                </button>
            </div>

            {/* Lista de afectados */}
            {loadingAfectados ? (
                <div className="text-center text-gray-500 py-8">
                    <div className="loading loading-spinner loading-lg"></div>
                    <p className="mt-2">Cargando afectados...</p>
                </div>
            ) : afectadosCaso.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                    <p>No se encontraron afectados</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {afectadosCaso.map((afectado, index) => (
                        <div key={afectado.id_afectado || index} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="card-body">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="card-title text-lg">{afectado.Nombre || afectado.nombre}</h3>
                                            <span className={`badge ${(afectado.tipo || afectado.Cargo) === 'Docente' || (afectado.tipo || afectado.Cargo) === 'docente' ? 'badge-success' :
                                                (afectado.tipo || afectado.Cargo) === 'Estudiante' || (afectado.tipo || afectado.Cargo) === 'alumno' ? 'badge-warning' :
                                                    'badge-neutral'
                                                }`}>
                                                {((afectado.tipo || afectado.Cargo || 'Sin tipo').charAt(0).toUpperCase() + (afectado.tipo || afectado.Cargo || 'sin tipo').slice(1))}
                                            </span>
                                            {afectado.rol && (
                                                <span className={`badge badge-sm flex items-center gap-1 ${afectado.rol === 'Denunciante' ? 'badge-error' :
                                                    afectado.rol === 'Denunciado' ? 'badge-warning' :
                                                        afectado.rol === 'Testigo' ? 'badge-info' :
                                                            'badge-neutral'
                                                    }`}>
                                                    <FaUserTag className="text-xs" />
                                                    {afectado.rol}
                                                </span>
                                            )}
                                            {afectado.total_casos > 0 && (
                                                <span className="badge badge-info">
                                                    {afectado.total_casos} caso{afectado.total_casos !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                            {(afectado.Carrera || afectado.carrera) && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">Carrera:</span>
                                                    <span>{afectado.Carrera || afectado.carrera}</span>
                                                </div>
                                            )}
                                            {(afectado.Correo || afectado.correo) && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">Email:</span>
                                                    <span>{afectado.Correo || afectado.correo}</span>
                                                </div>
                                            )}
                                            {(afectado.Telefono || afectado.telefono) && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">Teléfono:</span>
                                                    <span>{afectado.Telefono || afectado.telefono}</span>
                                                </div>
                                            )}
                                            {(afectado.empresa_servicio) && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500">Empresa:</span>
                                                    <span>{afectado.empresa_servicio}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Mostrar casos recientes si existen */}
                                        {afectado.casos_recientes && afectado.casos_recientes.length > 0 && (
                                            <div className="mt-3 p-2 bg-base-200 rounded">
                                                <p className="text-xs text-gray-600 mb-1">Casos recientes:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {afectado.casos_recientes.map(caso => (
                                                        <span key={caso.id_caso} className="badge badge-outline badge-xs">
                                                            {caso.titulo} ({caso.rol})
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="card-actions flex flex-col gap-2">
                                        {/* Mostrar botón de historial */}
                                        {(afectado.total_casos > 0 || afectado.casos_recientes?.length > 0 || true) && (
                                            <button
                                                className="btn btn-info btn-sm"
                                                onClick={() => verHistorialCompleto(afectado)}
                                            >
                                                <FaClipboardList className="mr-1" />
                                                Historial
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => editarRolAfectado(afectado)}
                                        >
                                            <FaEdit className="mr-1" />
                                            Editar
                                        </button>
                                        <button
                                            className="btn btn-error btn-sm"
                                            onClick={() => removerAfectadoDeCaso(afectado.id_afectado, afectado.Nombre || afectado.nombre)}
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

            {/* Modal Añadir/Editar Afectado */}
            <dialog id="AñadirAfectado" className="modal">
                <div className="modal-box max-w-2xl">
                    <h3 className="font-bold text-lg mb-4">
                        {editandoAfectado ? 'Editar afectado' : 'Añadir afectado'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Rol en el caso */}
                        <div>
                            <label className="label">
                                <span className="label-text">Rol en el caso *</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={formularioAfectado.rol}
                                onChange={(e) => setFormularioAfectado({ ...formularioAfectado, rol: e.target.value })}
                            >
                                <option value="">Seleccionar rol</option>
                                <option value="Denunciante">Denunciante</option>
                                <option value="Denunciado">Denunciado</option>
                                <option value="Testigo">Testigo</option>
                                <option value="Informante">Informante</option>
                            </select>
                        </div>

                        {/* Tipo */}
                        <div>
                            <label className="label">
                                <span className="label-text">Tipo *</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={formularioAfectado.tipo}
                                onChange={(e) => setFormularioAfectado({ ...formularioAfectado, tipo: e.target.value })}
                            >
                                <option value="">Seleccionar tipo</option>
                                <option value="Docente">Docente</option>
                                <option value="Estudiante">Estudiante</option>
                                <option value="Colaborador">Colaborador</option>
                                <option value="Funcionario">Funcionario</option>
                                <option value="Administrativo">Administrativo</option>
                            </select>
                        </div>

                        {/* Nombre con autocompletado */}
                        <div className="relative">
                            <label className="label">
                                <span className="label-text">Nombre completo *</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Nombre completo"
                                value={formularioAfectado.nombre}
                                onChange={(e) => {
                                    setFormularioAfectado({ ...formularioAfectado, nombre: e.target.value });
                                    if (!editandoAfectado) {
                                        buscarAfectadosAutocompletar(e.target.value);
                                    }
                                }}
                                onBlur={() => {
                                    // Delay para permitir click en sugerencias
                                    setTimeout(() => setMostrarSugerencias(false), 200);
                                }}
                                onFocus={() => {
                                    if (formularioAfectado.nombre.length >= 2 && sugerenciasAfectados.length > 0) {
                                        setMostrarSugerencias(true);
                                    }
                                }}
                            />

                            {/* Sugerencias de autocompletado */}
                            {mostrarSugerencias && sugerenciasAfectados.length > 0 && (
                                <div className="absolute z-10 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                                    {sugerenciasAfectados.map((sugerencia) => (
                                        <div
                                            key={sugerencia.id_afectado}
                                            className="p-3 hover:bg-base-200 cursor-pointer border-b border-base-300 last:border-b-0"
                                            onClick={() => {
                                                if (!formularioAfectado.rol) {
                                                    mostrarToast('Primero selecciona un rol para este afectado', 'warning');
                                                    return;
                                                }
                                                seleccionarAfectadoExistente(sugerencia);
                                            }}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-medium">{sugerencia.nombre}</p>
                                                    <p className="text-sm text-gray-500">{sugerencia.tipo}</p>
                                                    {sugerencia.correo && (
                                                        <p className="text-xs text-gray-400">{sugerencia.correo}</p>
                                                    )}
                                                    {sugerencia.casos_recientes && sugerencia.casos_recientes.length > 0 && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Casos recientes: {sugerencia.casos_recientes.map(c => c.titulo).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    {sugerencia.total_casos > 0 && (
                                                        <span className="badge badge-info badge-sm mb-1">
                                                            {sugerencia.total_casos} casos
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-success font-medium flex items-center gap-1">
                                                        <FaArrowRight />
                                                        Agregar al caso
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Correo */}
                        <div>
                            <label className="label">
                                <span className="label-text">Correo electrónico</span>
                            </label>
                            <input
                                type="email"
                                className="input input-bordered w-full"
                                placeholder="ejemplo@correo.com"
                                value={formularioAfectado.correo}
                                onChange={(e) => setFormularioAfectado({ ...formularioAfectado, correo: e.target.value })}
                            />
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="label">
                                <span className="label-text">Teléfono</span>
                            </label>
                            <input
                                type="tel"
                                className="input input-bordered w-full"
                                placeholder="+569 1234 5678"
                                value={formularioAfectado.telefono}
                                onChange={(e) => setFormularioAfectado({ ...formularioAfectado, telefono: e.target.value })}
                            />
                        </div>

                        {/* Carrera */}
                        <div>
                            <label className="label">
                                <span className="label-text">Carrera</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Carrera o especialidad"
                                value={formularioAfectado.carrera}
                                onChange={(e) => setFormularioAfectado({ ...formularioAfectado, carrera: e.target.value })}
                            />
                        </div>

                        {/* Cargo */}
                        <div>
                            <label className="label">
                                <span className="label-text">Cargo</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Cargo o posición"
                                value={formularioAfectado.cargo}
                                onChange={(e) => setFormularioAfectado({ ...formularioAfectado, cargo: e.target.value })}
                            />
                        </div>

                        {/* Empresa/Servicio */}
                        <div>
                            <label className="label">
                                <span className="label-text">Empresa/Servicio</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Empresa o servicio"
                                value={formularioAfectado.empresa_servicio}
                                onChange={(e) => setFormularioAfectado({ ...formularioAfectado, empresa_servicio: e.target.value })}
                            />
                        </div>

                        {/* Unidad */}
                        <div>
                            <label className="label">
                                <span className="label-text">Unidad</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Unidad o departamento"
                                value={formularioAfectado.unidad}
                                onChange={(e) => setFormularioAfectado({ ...formularioAfectado, unidad: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Mostrar historial si existe */}
                    {historialAfectado && historialAfectado.casos_recientes && historialAfectado.casos_recientes.length > 0 && (
                        <div className="mt-4 p-4 bg-info/10 border border-info/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <FaExclamationTriangle className="text-info" />
                                <span className="text-info font-medium">Este afectado ya tiene casos registrados</span>
                            </div>
                            <div className="text-sm">
                                <p className="mb-1">Casos recientes:</p>
                                {historialAfectado.casos_recientes.map(caso => (
                                    <span key={caso.id_caso} className="badge badge-outline badge-sm mr-1 mb-1">
                                        {caso.titulo} ({caso.rol})
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="modal-action">
                        <button
                            onClick={() => {
                                limpiarFormularioAfectado();
                                document.getElementById('AñadirAfectado').close();
                            }}
                            className="btn btn-outline"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={guardarAfectado}
                            className="btn btn-primary"
                        >
                            {editandoAfectado ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </dialog>

            {/* Modal Resumen de Casos */}
            <dialog id="ResumenCasos" className="modal">
                <div className="modal-box max-w-3xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FaChartPie className="text-primary" />
                        Resumen de Participación - {resumenCasos?.afectado?.nombre || resumenCasos?.afectado?.Nombre}
                    </h3>

                    {resumenCasos ? (
                        <div className="space-y-6">
                            {/* Estadísticas generales */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="stat bg-primary text-primary-content rounded-lg">
                                    <div className="stat-title text-primary-content/70">Total de Casos</div>
                                    <div className="stat-value text-2xl">{resumenCasos.total_casos}</div>
                                </div>
                                <div className="stat bg-info text-info-content rounded-lg">
                                    <div className="stat-title text-info-content/70">Casos Activos</div>
                                    <div className="stat-value text-2xl">
                                        {resumenCasos.casos_por_estado?.find(e => e.estado === 'En Proceso')?.cantidad || 0}
                                    </div>
                                </div>
                                <div className="stat bg-success text-success-content rounded-lg">
                                    <div className="stat-title text-success-content/70">Casos Finalizados</div>
                                    <div className="stat-value text-2xl">
                                        {resumenCasos.casos_por_estado?.find(e => e.estado === 'Finalizado')?.cantidad || 0}
                                    </div>
                                </div>
                            </div>

                            {/* Roles de participación */}
                            <div>
                                <h4 className="text-lg font-semibold mb-3">Roles de Participación</h4>
                                <div className="grid gap-3">
                                    {resumenCasos.roles_participacion?.map((rol, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className={`badge ${rol.rol === 'Denunciante' ? 'badge-error' :
                                                    rol.rol === 'Denunciado' ? 'badge-warning' :
                                                        'badge-info'
                                                    }`}>
                                                    {rol.rol}
                                                </span>
                                                <span className="font-medium">{rol.cantidad} casos</span>
                                            </div>
                                            {rol.casos_activos > 0 && (
                                                <span className="badge badge-accent">
                                                    {rol.casos_activos} activos
                                                </span>
                                            )}
                                        </div>
                                    )) || (
                                            <div className="text-center text-gray-500 py-4">
                                                No hay información de roles disponible
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* Casos destacados */}
                            <div>
                                <h4 className="text-lg font-semibold mb-3">Casos Recientes</h4>
                                <div className="space-y-2">
                                    {resumenCasos.casos_destacados?.map((caso, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 border border-base-300 rounded-lg">
                                            <div className="flex-1">
                                                <h5 className="font-medium">{caso.titulo}</h5>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`badge badge-sm ${caso.rol === 'Denunciante' ? 'badge-error' :
                                                        caso.rol === 'Denunciado' ? 'badge-warning' :
                                                            'badge-info'
                                                        }`}>
                                                        {caso.rol}
                                                    </span>
                                                    <span className={`badge badge-sm ${caso.estado === 'En Proceso' ? 'badge-warning' :
                                                        caso.estado === 'Finalizado' ? 'badge-success' :
                                                            'badge-neutral'
                                                        }`}>
                                                        {caso.estado}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )) || (
                                            <div className="text-center text-gray-500 py-4">
                                                No hay casos destacados disponibles
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* Última participación */}
                            {resumenCasos.ultima_participacion && (
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">Última participación:</span> {' '}
                                        {new Date(resumenCasos.ultima_participacion).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            <div className="loading loading-spinner loading-lg"></div>
                            <p className="mt-2">Cargando resumen...</p>
                        </div>
                    )}

                    <div className="modal-action">
                        <button
                            onClick={() => {
                                document.getElementById('ResumenCasos').close();
                                setResumenCasos(null);
                            }}
                            className="btn btn-outline"
                        >
                            Cerrar
                        </button>
                        {resumenCasos?.afectado && (
                            <button
                                onClick={() => {
                                    document.getElementById('ResumenCasos').close();
                                    verHistorialCompleto(resumenCasos.afectado);
                                }}
                                className="btn btn-primary"
                            >
                                Ver Historial Completo
                            </button>
                        )}
                    </div>
                </div>
            </dialog>

            {/* Modal Historial de Afectado */}
            <dialog id="HistorialAfectado" className="modal">
                <div className="modal-box max-w-4xl">
                    <h3 className="font-bold text-lg mb-4">
                        Historial de {historialAfectado?.afectado?.nombre}
                    </h3>

                    {historialAfectado?.historial_casos && historialAfectado.historial_casos.length > 0 ? (
                        <div className="space-y-4">
                            {historialAfectado.historial_casos.map((caso, index) => (
                                <div key={caso.id_caso} className="card bg-base-200 shadow">
                                    <div className="card-body p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-lg">{caso.titulo}</h4>
                                                <div className="flex items-center gap-4 mt-2 text-sm">
                                                    <span className={`badge ${caso.estado === 'Finalizado' ? 'badge-success' :
                                                        caso.estado === 'En Proceso' ? 'badge-warning' :
                                                            'badge-info'
                                                        }`}>
                                                        {caso.estado}
                                                    </span>
                                                    <span className="badge badge-outline">
                                                        Rol: {caso.rol}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600 mt-2">
                                                    <div>Fecha asignación: {new Date(caso.fecha_asignacion).toLocaleDateString('es-ES')}</div>
                                                    <div>Fecha creación caso: {new Date(caso.fecha_creacion).toLocaleDateString('es-ES')}</div>
                                                    {caso.fecha_finalizacion && (
                                                        <div>Fecha finalización: {new Date(caso.fecha_finalizacion).toLocaleDateString('es-ES')}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            <p>No se encontraron casos para este afectado</p>
                        </div>
                    )}

                    <div className="modal-action">
                        <button
                            onClick={() => document.getElementById('HistorialAfectado').close()}
                            className="btn btn-outline"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </dialog>
        </div>
    );
};

export default AfectadosManager;