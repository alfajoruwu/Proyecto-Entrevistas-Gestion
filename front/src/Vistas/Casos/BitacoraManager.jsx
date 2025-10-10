import React, { useState, useEffect } from 'react';
import apiClient from '../../AuxS/Axiosinstance';
import { useToast } from '../../Componentes/ToastContext';
import {
    FaPlus,
    FaEdit,
    FaTrash,
    FaSearch,
    FaFileAlt,
    FaTimes,
    FaSave,
    FaCalendarAlt,
    FaClock
} from 'react-icons/fa';

const BitacoraManager = ({ casoId }) => {
    const { mostrarToast } = useToast();

    // Estados para bitácora
    const [bitacora, setBitacora] = useState([]);
    const [loadingBitacora, setLoadingBitacora] = useState(false);
    const [busquedaBitacora, setBusquedaBitacora] = useState('');

    // Estados para formulario de nueva entrada
    const [nuevaEntrada, setNuevaEntrada] = useState({
        titulo: '',
        descripcion: '',
        color: 'bg-primary'
    });
    const [editandoEntrada, setEditandoEntrada] = useState(null);

    const cargarBitacora = async () => {
        if (!casoId) return;

        setLoadingBitacora(true);
        try {
            const response = await apiClient.get(`/api/acciones/casos/${casoId}/acciones`);

            // Mapear las acciones del backend al formato que necesitamos
            const accionesFormateadas = response.data.acciones.map(accion => ({
                id: accion.id_accion,
                descripcion: accion.descripcion,
                fecha: new Date(accion.fecha).toISOString().split('T')[0],
                hora: new Date(accion.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                autor: accion.usuario_nombre || 'Usuario desconocido',
                color: accion.color || 'bg-primary' // Color por defecto si no existe
            }));

            setBitacora(accionesFormateadas);
        } catch (error) {
            console.error('Error al cargar bitácora:', error);
            mostrarToast('Error al cargar la bitácora', 'error');
        } finally {
            setLoadingBitacora(false);
        }
    };

    const limpiarFormulario = () => {
        setNuevaEntrada({
            titulo: '',
            descripcion: '',
            color: 'bg-primary'
        });
        setEditandoEntrada(null);
    };

    const agregarEntrada = async () => {
        if (!nuevaEntrada.titulo.trim() || !nuevaEntrada.descripcion.trim()) {
            mostrarToast('Título y descripción son requeridos', 'error');
            return;
        }

        try {
            const response = await apiClient.post(`/api/acciones/casos/${casoId}/acciones`, {
                descripcion: `${nuevaEntrada.titulo}: ${nuevaEntrada.descripcion}`,
                color: nuevaEntrada.color
            });

            mostrarToast('Entrada agregada exitosamente', 'success');
            limpiarFormulario();
            document.getElementById('modalNuevaEntrada').close();
            cargarBitacora(); // Recargar la bitácora
        } catch (error) {
            console.error('Error al agregar entrada:', error);
            mostrarToast('Error al agregar la entrada', 'error');
        }
    };

    const editarEntrada = (entrada) => {
        // Si la descripción tiene el formato "titulo: descripcion", separarlos
        const match = entrada.descripcion.match(/^(.+?):\s*(.+)$/);
        if (match) {
            setNuevaEntrada({
                titulo: match[1],
                descripcion: match[2],
                color: entrada.color || 'bg-primary'
            });
        } else {
            // Si no tiene formato de titulo:descripcion, usar toda la descripción como titulo
            setNuevaEntrada({
                titulo: entrada.descripcion,
                descripcion: '',
                color: entrada.color || 'bg-primary'
            });
        }
        setEditandoEntrada(entrada);
        document.getElementById('modalNuevaEntrada').showModal();
    };

    const actualizarEntrada = async () => {
        if (!nuevaEntrada.titulo.trim() || !nuevaEntrada.descripcion.trim()) {
            mostrarToast('Título y descripción son requeridos', 'error');
            return;
        }

        try {
            await apiClient.put(`/api/acciones/${editandoEntrada.id}`, {
                descripcion: `${nuevaEntrada.titulo}: ${nuevaEntrada.descripcion}`,
                color: nuevaEntrada.color
            });

            mostrarToast('Entrada actualizada exitosamente', 'success');
            limpiarFormulario();
            document.getElementById('modalNuevaEntrada').close();
            cargarBitacora(); // Recargar la bitácora
        } catch (error) {
            console.error('Error al actualizar entrada:', error);
            mostrarToast('Error al actualizar la entrada', 'error');
        }
    };

    const eliminarEntrada = async (id, titulo) => {
        if (window.confirm(`¿Estás seguro de eliminar la entrada "${titulo}"?`)) {
            try {
                await apiClient.delete(`/api/acciones/${id}`);
                mostrarToast('Entrada eliminada exitosamente', 'success');
                cargarBitacora(); // Recargar la bitácora
            } catch (error) {
                console.error('Error al eliminar entrada:', error);
                mostrarToast('Error al eliminar la entrada', 'error');
            }
        }
    };

    // Filtrar bitácora según búsqueda
    const bitacoraFiltrada = bitacora.filter(entrada =>
        entrada.descripcion.toLowerCase().includes(busquedaBitacora.toLowerCase()) ||
        entrada.autor.toLowerCase().includes(busquedaBitacora.toLowerCase())
    );

    useEffect(() => {
        cargarBitacora();
    }, [casoId]);

    return (
        <div className='flex flex-col gap-4 p-4'>
            {/* Header */}
            <div className='flex justify-between items-center'>
                <h2 className='text-2xl font-bold flex items-center gap-2'>
                    <FaFileAlt className="text-primary" />
                    Bitácora ({bitacoraFiltrada.length})
                </h2>
                <button
                    className='btn btn-accent flex items-center gap-2'
                    onClick={() => {
                        limpiarFormulario();
                        document.getElementById('modalNuevaEntrada').showModal();
                    }}
                >
                    <FaPlus />
                    Nueva entrada
                </button>
            </div>

            {/* Búsqueda */}
            <div className='flex gap-2'>
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        className='input input-bordered w-full pl-10'
                        placeholder='Buscar en bitácora...'
                        value={busquedaBitacora}
                        onChange={(e) => setBusquedaBitacora(e.target.value)}
                    />
                </div>
            </div>

            {/* Loading */}
            {loadingBitacora ? (
                <div className="text-center text-gray-500 py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="mt-2">Cargando bitácora...</p>
                </div>
            ) : bitacoraFiltrada.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                    <FaFileAlt className="mx-auto text-4xl mb-4 opacity-50" />
                    <p className="text-lg">No hay entradas en la bitácora</p>
                    <p className="text-sm">Agrega la primera entrada para comenzar</p>
                </div>
            ) : (
                /* Lista de entradas */
                <div className="grid gap-4">
                    {bitacoraFiltrada.map((entrada) => (
                        <div key={entrada.id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                            <div className="card-body">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className={`${entrada.color} text-white rounded-lg px-4 py-2 text-sm font-medium mb-3 inline-block max-w-fit`}>
                                            {entrada.descripcion}
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <FaCalendarAlt />
                                                {entrada.fecha}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FaClock />
                                                {entrada.hora}
                                            </span>
                                            <span>Por: {entrada.autor}</span>
                                        </div>
                                    </div>

                                    <div className="card-actions flex gap-2">
                                        <button
                                            className="btn btn-primary btn-sm flex items-center gap-1"
                                            onClick={() => editarEntrada(entrada)}
                                        >
                                            <FaEdit />
                                            Editar
                                        </button>
                                        <button
                                            className="btn btn-error btn-sm flex items-center gap-1"
                                            onClick={() => eliminarEntrada(entrada.id, entrada.titulo)}
                                        >
                                            <FaTrash />
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal para nueva entrada / editar entrada */}
            <dialog id="modalNuevaEntrada" className="modal">
                <div className="modal-box w-11/12 max-w-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <FaFileAlt className="text-primary" />
                            {editandoEntrada ? 'Editar Entrada' : 'Nueva Entrada de Bitácora'}
                        </h3>
                        <button
                            className="btn btn-sm btn-circle btn-ghost"
                            onClick={() => document.getElementById('modalNuevaEntrada').close()}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="label">
                                <span className="label-text font-medium">Título *</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Título de la entrada..."
                                value={nuevaEntrada.titulo}
                                onChange={(e) => setNuevaEntrada(prev => ({ ...prev, titulo: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="label">
                                <span className="label-text font-medium">Color</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={nuevaEntrada.color}
                                onChange={(e) => setNuevaEntrada(prev => ({ ...prev, color: e.target.value }))}
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

                        <div>
                            <label className="label">
                                <span className="label-text font-medium">Descripción *</span>
                            </label>
                            <textarea
                                className="textarea textarea-bordered w-full h-32"
                                placeholder="Describe los detalles de esta entrada de bitácora..."
                                value={nuevaEntrada.descripcion}
                                onChange={(e) => setNuevaEntrada(prev => ({ ...prev, descripcion: e.target.value }))}
                            ></textarea>
                        </div>
                    </div>

                    <div className="modal-action mt-6">
                        <button
                            className="btn btn-ghost"
                            onClick={() => document.getElementById('modalNuevaEntrada').close()}
                        >
                            <FaTimes className="mr-2" />
                            Cancelar
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={editandoEntrada ? actualizarEntrada : agregarEntrada}
                        >
                            <FaSave className="mr-2" />
                            {editandoEntrada ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
};

export default BitacoraManager;