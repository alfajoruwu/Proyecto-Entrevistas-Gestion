import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '../../Componentes/Navbar'
import AfectadosManager from './AfectadosManager'
import EntrevistasManager from './EntrevistasManager'
import BitacoraManager from './BitacoraManager'
import { useToast } from '../../Componentes/ToastContext'
import { FaUsers, FaStickyNote, FaClipboardList } from 'react-icons/fa'

const Casos = () => {
    const { id: casoId } = useParams(); // Obtener ID del caso desde la URL
    const { mostrarToast } = useToast();

    // Estados para navegación
    const [Seleccionado, SetSeleccionado] = useState('afectados');

    // Estado para compartir afectados con EntrevistasManager
    const [afectadosCaso, setAfectadosCaso] = useState([]);

    // Función para actualizar afectados desde AfectadosManager
    const actualizarAfectados = (nuevosAfectados) => {
        setAfectadosCaso(nuevosAfectados);
    };

    const SetterSeleccionado = (value) => {
        SetSeleccionado(value);
    };

    useEffect(() => {
        console.log('Componente Casos montado con ID:', casoId);
    }, [casoId]);

    return (
        <div>
            <Navbar />
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
        </div>
    )
}

export default Casos