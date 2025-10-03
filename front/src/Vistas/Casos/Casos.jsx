import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '../../Componentes/Navbar'
import AfectadosManager from './AfectadosManager'
import EntrevistasManager from './EntrevistasManager'
import BitacoraManager from './BitacoraManager'
import { useToast } from '../../Componentes/ToastContext'
import apiClient from '../../AuxS/Axiosinstance'
import { FaUsers, FaStickyNote, FaClipboardList, FaComments, FaEye, FaTimes } from 'react-icons/fa'

const Casos = () => {
    const { id: casoId } = useParams(); // Obtener ID del caso desde la URL
    const { mostrarToast } = useToast();

    // Estados para navegación
    const [Seleccionado, SetSeleccionado] = useState('afectados');

    // Estado para compartir afectados con EntrevistasManager
    const [afectadosCaso, setAfectadosCaso] = useState([]);

    // Estado para información del caso
    const [casoDatos, setCasoDatos] = useState(null);
    const [loadingCaso, setLoadingCaso] = useState(true);

    // Función para actualizar afectados desde AfectadosManager
    const actualizarAfectados = (nuevosAfectados) => {
        setAfectadosCaso(nuevosAfectados);
    };

    // Función para cargar datos del caso
    const cargarCaso = async () => {
        try {
            setLoadingCaso(true);
            const response = await apiClient.get(`/api/casos/${casoId}`);
            setCasoDatos(response.data);
        } catch (error) {
            console.error('Error cargando caso:', error);
            mostrarToast('Error al cargar información del caso', 'error');
        } finally {
            setLoadingCaso(false);
        }
    };

    const SetterSeleccionado = (value) => {
        SetSeleccionado(value);
    };

    useEffect(() => {
        console.log('Componente Casos montado con ID:', casoId);
        if (casoId) {
            cargarCaso();
        }
    }, [casoId]);

    return (
        <div>
            <Navbar />

            {/* Información del caso y entrevista preliminar */}
            {!loadingCaso && casoDatos && (
                <div className="p-4 bg-base-200">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-2xl font-bold mb-2">{casoDatos.titulo}</h1>
                        <div className="flex gap-4 items-center text-sm text-gray-600 mb-4">
                            <span>Estado: <span className="font-semibold">{casoDatos.estado}</span></span>
                            <span>•</span>
                            <span>Tipo: <span className="font-semibold">{casoDatos.tipo_fuente?.replace('_', ' ')}</span></span>
                            <span>•</span>
                            <span>Creado: {new Date(casoDatos.fecha_creacion).toLocaleDateString('es-ES')}</span>
                        </div>

                        {/* Información de entrevista preliminar si existe */}
                        {casoDatos.tipo_fuente === 'entrevista_preliminar' && casoDatos.entrevista_persona && (
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FaComments className="text-blue-600" />
                                        <span className="font-semibold text-blue-800">
                                            Originado desde entrevista preliminar con {casoDatos.entrevista_persona}
                                        </span>
                                        {casoDatos.entrevista_fecha && (
                                            <span className="text-blue-600 text-sm">
                                                • {new Date(casoDatos.entrevista_fecha).toLocaleDateString('es-ES')}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => document.getElementById('modal_entrevista_preliminar').showModal()}
                                        className="btn btn-sm btn-outline btn-primary flex items-center gap-1"
                                    >
                                        <FaEye /> Ver detalles
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className='flex gap-3 p-3'>
                {/* Botón: Afectados */}
                <button
                    className={`flex-1 btn ${Seleccionado === 'afectados' ? 'btn-primary' : 'btn-accent'}`}
                    onClick={() => SetterSeleccionado('afectados')}
                >
                    <FaUsers className="mr-2" />
                    Afectados
                </button>

                <button
                    className={`flex-1 btn ${Seleccionado === 'entrevistas' ? 'btn-primary' : 'btn-accent'}`}
                    onClick={() => SetterSeleccionado('entrevistas')}
                >
                    <FaStickyNote className="mr-2" />
                    Entrevistas
                </button>

                {/* Botón: Bitácora */}
                <button
                    className={`flex-1 btn ${Seleccionado === 'bitacora' ? 'btn-primary' : 'btn-accent'}`}
                    onClick={() => SetterSeleccionado('bitacora')}
                >
                    <FaClipboardList className="mr-2" />
                    Bitácora
                </button>
            </div>

            {/* Renderizar componentes según selección */}
            {Seleccionado === 'afectados' && (
                <AfectadosManager
                    casoId={casoId}
                    onAfectadosChange={actualizarAfectados}
                />
            )}

            {Seleccionado === 'entrevistas' && (
                <EntrevistasManager
                    casoId={casoId}
                    afectadosCaso={afectadosCaso}
                />
            )}

            {Seleccionado === 'bitacora' && (
                <BitacoraManager
                    casoId={casoId}
                />
            )}

            {/* Modal para mostrar detalles de entrevista preliminar */}
            <dialog id="modal_entrevista_preliminar" className="modal">
                <div className="modal-box max-w-2xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FaComments className="text-blue-600" />
                        Detalles de Entrevista Preliminar
                    </h3>

                    {casoDatos && casoDatos.tipo_fuente === 'entrevista_preliminar' && (
                        <div className='flex flex-col gap-4'>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-blue-700">Información de la Persona</h4>
                                    <p><strong>Nombre:</strong> {casoDatos.entrevista_persona}</p>
                                </div>

                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-blue-700">Información de la Entrevista</h4>
                                    {casoDatos.entrevista_fecha && (
                                        <p><strong>Fecha:</strong> {new Date(casoDatos.entrevista_fecha).toLocaleString('es-ES')}</p>
                                    )}
                                </div>
                            </div>

                            {casoDatos.entrevista_resumen && (
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-blue-700">Resumen de la Conversación</h4>
                                    <p className="text-sm whitespace-pre-wrap">{casoDatos.entrevista_resumen}</p>
                                </div>
                            )}

                            {casoDatos.entrevista_notas && (
                                <div className="bg-base-200 p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2 text-blue-700">Notas Adicionales</h4>
                                    <p className="text-sm whitespace-pre-wrap">{casoDatos.entrevista_notas}</p>
                                </div>
                            )}

                            <div className="bg-success/10 border border-success/20 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2 text-success">Estado de Evolución</h4>
                                <p className="text-sm text-success">
                                    ✅ Esta entrevista preliminar evolucionó exitosamente al caso actual: <strong>"{casoDatos.titulo}"</strong>
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
        </div>
    )
}

export default Casos