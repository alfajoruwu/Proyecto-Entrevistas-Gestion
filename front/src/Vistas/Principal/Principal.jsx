import React, { useState, useEffect } from 'react'
import Navbar from '../../Componentes/Navbar'

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useNavigate } from 'react-router-dom';

const Principal = () => {


    const Navigate = useNavigate();

    // ---------- Navegar ----------

    const IrCasos = (id) => { Navigate('/Casos/' + id) }

    //  --------- Variables importantes -------------

    const [date, setDate] = useState(null);
    const [dateFin, setDateFin] = useState(null);
    const [casos, setCasos] = useState([]);

    const [FiltrosActivos, SetFiltrosActivos] = useState(false)
    const CambiarEstado = () => {
        SetFiltrosActivos(!FiltrosActivos)
    }

    // ------------------------------------------------

    // Función que simula una llamada a la base de datos
    const simularLlamadaDB = async () => {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Datos simulados
        const datosSimulados = [
            {
                id: 1,
                Nombre: "Caso A - Discusión con docente",
                Tipo: "Investigación",
                fecha: new Date("2024-01-15T10:30:00"),
                estado: 1
            },
            {
                id: 2,
                Nombre: "Caso B - Problemas con alumnos",
                Tipo: "Técnico",
                fecha: new Date("2024-01-20T14:15:00"),
                estado: 0
            },
            {
                id: 3,
                Nombre: "Caso C - ejemplo de caso",
                Tipo: "Discusión",
                fecha: new Date("2024-01-25T09:45:00"),
                estado: 1
            },
            {
                id: 4,
                Nombre: "Caso D - ejemplo de caso 2",
                Tipo: "Análisis",
                fecha: new Date("2024-02-01T16:20:00"),
                estado: 0
            },
            {
                id: 5,
                Nombre: "Caso E - ejemplo de caso 3",
                Tipo: "Discusión",
                fecha: new Date("2024-02-05T11:00:00"),
                estado: 0
            },
            {
                id: 6,
                Nombre: "Caso F - Pruebas de sistema",
                Tipo: "Técnico",
                fecha: new Date("2024-02-10T08:15:00"),
                estado: 1
            }
        ];

        return datosSimulados;
    };

    const cargarCasos = async () => {
        try {
            console.log('Cargando casos...');
            const casosObtenidos = await simularLlamadaDB();
            setCasos(casosObtenidos);
            console.log('Casos cargados:', casosObtenidos);
        } catch (error) {
            console.error('Error al cargar casos:', error);
        }
    };

    useEffect(() => {
        console.log('Componente montado');
        cargarCasos();
    }, []);

    return (

        <div>
            <Navbar />

            {/* Buscar y crear */}
            <div className='flex flex-col gap-4 p-4'>

                <div className='flex'>
                    <input type="text" className='input flex-1' placeholder='Buscar casos...' />
                </div>

                <div className='flex gap-2'>
                    <button className="flex-1 btn btn-accent" onClick={() => document.getElementById('Crear_nuevo_Caso').showModal()}>Crear nuevo caso</button>

                    <button onClick={CambiarEstado} className='flex-1 btn btn-accent'>Filtros</button>
                </div>

                {FiltrosActivos &&

                    <div className='flex flex-col gap-2'>
                        <label className='text'>Fecha inicio:</label>
                        <DatePicker
                            selected={date}
                            onChange={(d) => setDate(d)}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Selecciona una fecha"
                            className="input input-bordered w-full"
                        />
                        <label className='text'>Fecha fin:</label>
                        <DatePicker
                            selected={dateFin}
                            onChange={(d) => setDateFin(d)}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Selecciona una fecha"
                            className="input input-bordered w-full"
                        />

                        <label className='text'>Tipo:</label>
                        <div className='flex '>
                            <input type="text" className='input flex-1' placeholder='Buscar tipo' />
                        </div>

                    </div>


                }



            </div>

            {/* Lista de casos */}
            <div className="p-4">
                <h2 className="text-xl font-bold mb-4">Casos disponibles: ({casos.length})</h2>

                {casos.length === 0 ? (
                    <div className="text-center text-gray-500">
                        <p>Cargando casos...</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {casos.map((caso, index) => (
                            console.log(caso),
                            <div key={index} className="card bg-base-100 shadow-xl">
                                <div className="card-body">
                                    <h3 className="card-title">{caso.Nombre}</h3>
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2">
                                            <span className="badge badge-outline">{caso.Tipo}</span>
                                            <span className={`badge ${caso.estado === 1 ? 'badge-warning' : 'badge-success'}`}>
                                                {caso.estado === 1 ? 'En proceso' : 'Finalizado'}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            {caso.fecha.toLocaleString('es-ES', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <div className="card-actions justify-end">
                                        <button className="btn btn-primary btn-sm">Editar</button>
                                        <button onClick={() => IrCasos(caso.id)} className="btn btn-accent btn-sm">Ver detalles</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ------------ Modals ------------- */}


            <dialog id="Crear_nuevo_Caso" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Crear nuevo caso</h3>

                    <div className='flex flex-col gap-2 m-4'>
                        <label>Nombre del caso:</label>
                        <div flex className='flex'>
                            <input type="text" className='input flex-1' placeholder='Caso X - Nombre ejemplo' />
                        </div>

                        <label>Tipo:</label>
                        <div flex className='flex'>
                            <input type="text" className='input flex-1' placeholder='Ejemplo: "Discucion"' />
                        </div>

                    </div>


                    <div className="modal-action">
                        <form method="dialog">
                            {/* if there is a button in form, it will close the modal */}
                            <div className='flex gap-2'>
                                <button className="btn btn-error">Cancelar</button>
                                <button className="btn btn-accent">Crear caso</button>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>

        </div>
    )
}


export default Principal