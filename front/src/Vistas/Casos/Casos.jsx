import React, { useState, useRef, useEffect } from 'react'
import Navbar from '../../Componentes/Navbar'
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';



const Casos = () => {

    // -------- Manejo de modals ------------

    // --------- Modal Añadir integrantes
    const CerrarModalAñadirIntegrantes = () => {
        document.getElementById('AñadirIntegrantes').close()
    }

    const GuardarAñadirIntegrantes = () => {
        // Enviar al backend el guardar integrantes
        document.getElementById('AñadirIntegrantes').close()
    }

    // --------------------------------------

    // --------- Modal Crear nueva entrevista
    const CancelarModalEntrevista = () => {
        document.getElementById('CrearEntrevistas').close()
    }

    const GuardarModalEntrevista = () => {
        document.getElementById('CrearEntrevistas').close()
    }


    // Modal Entrevistas
    const [date, setDate] = useState(new Date());
    const [Integrantes, SetIntegrantes] = useState([])
    const SetterIntegrantes = (event) => {
        SetIntegrantes(event.target.value)
    }

    const AñadirIntegrante = (Integrante) => {
        SetIntegrantes([...Integrantes, Integrante])
        console.log("Añadido")
    }

    const RetirarIntegrante = (Integrante) => {
        SetIntegrantes(Integrantes.filter(item => item !== Integrante))
        console.log("Eliminado")
    }

    // Variables
    const [Seleccionado, SetSeleccionado] = useState('entrevistas')
    const [entrevistas, setEntrevistas] = useState([])
    const [afectados, setAfectados] = useState([])
    const [bitacora, setBitacora] = useState([])

    const SetterSeleccionado = (value) => {
        SetSeleccionado(value);
    };

    // Función que simula una llamada a la base de datos para entrevistas
    const simularLlamadaEntrevistas = async () => {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 800));

        // Datos simulados de entrevistas
        const entrevistasSimuladas = [
            {
                id: 1,
                hora: new Date("2024-02-15T09:00:00"),
                lugar: "Sala de conferencias A",
                id_integrantes: ["Ana García", "Carlos López", "María Rodríguez"]
            },
            {
                id: 2,
                hora: new Date("2024-02-15T14:30:00"),
                lugar: "Oficina principal - Piso 2",
                id_integrantes: ["José Martínez", "Laura Hernández"]
            },
            {
                id: 3,
                hora: new Date("2024-02-16T10:15:00"),
                lugar: "Sala virtual - Zoom",
                id_integrantes: ["Pedro Sánchez", "Sofia Morales"]
            },
            {
                id: 4,
                hora: new Date("2024-02-16T16:00:00"),
                lugar: "Sala de juntas B",
                id_integrantes: ["Roberto Jiménez", "Elena Vargas"]
            },
            {
                id: 5,
                hora: new Date("2024-02-17T11:30:00"),
                lugar: "Cafetería - Mesa 5",
                id_integrantes: ["Fernando Castro", "Isabel Romero", "Alejandro Peña"]
            }
        ];

        return entrevistasSimuladas;
    };

    // Función que simula una llamada a la base de datos para afectados
    const simularLlamadaAfectados = async () => {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 600));

        // Datos simulados de afectados
        const afectadosSimulados = [
            {
                id: 1,
                Nombre: "Ana Gabriela Martínez",
                Carrera: "Ingeniería en Sistemas",
                Correo: "ana.martinez@universidad.edu",
                Telefono: "+52 555-1234-567",
                Cargo: "alumno"
            },
            {
                id: 2,
                Nombre: "Dr. Carlos Roberto Vega",
                Carrera: "Ciencias de la Computación",
                Correo: "carlos.vega@universidad.edu",
                Telefono: "+52 555-2345-678",
                Cargo: "docente"
            },
            {
                id: 3,
                Nombre: "María Elena Rodríguez",
                Carrera: "Administración",
                Correo: "maria.rodriguez@universidad.edu",
                Telefono: "+52 555-3456-789",
                Cargo: "funcionario"
            },
            {
                id: 4,
                Nombre: "Luis Fernando Herrera",
                Carrera: "Derecho",
                Correo: "luis.herrera@universidad.edu",
                Telefono: "+52 555-4567-890",
                Cargo: "alumno"
            },
            {
                id: 5,
                Nombre: "Dra. Patricia Sánchez",
                Carrera: "Psicología",
                Correo: "patricia.sanchez@universidad.edu",
                Telefono: "+52 555-5678-901",
                Cargo: "docente"
            },
            {
                id: 6,
                Nombre: "Jorge Alberto Morales",
                Carrera: "Recursos Humanos",
                Correo: "jorge.morales@universidad.edu",
                Telefono: "+52 555-6789-012",
                Cargo: "funcionario"
            },
            {
                id: 7,
                Nombre: "Isabella Torres López",
                Carrera: "Medicina",
                Correo: "isabella.torres@universidad.edu",
                Telefono: "+52 555-7890-123",
                Cargo: "alumno"
            }
        ];

        return afectadosSimulados;
    };

    // Función que simula una llamada a la base de datos para bitácora
    const simularLlamadaBitacora = async () => {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500));

        // Datos simulados de bitácora
        const bitacoraSimulada = [
            {
                id: 1,
                texto: "Se realizó la primera reunión con el equipo de investigación para definir los objetivos del caso. Se establecieron los protocolos de entrevista y se asignaron responsabilidades."
            },
            {
                id: 2,
                texto: "Entrevista completada con Ana Gabriela Martínez (alumno). Se documentaron sus declaraciones sobre los eventos ocurridos el 15 de febrero. Información relevante sobre horarios y ubicaciones."
            },
            {
                id: 3,
                texto: "Revisión de documentos administrativos relacionados con el caso. Se encontraron inconsistencias en los registros de acceso al edificio que requieren investigación adicional."
            },
            {
                id: 4,
                texto: "Entrevista con Dr. Carlos Roberto Vega (docente). Proporcionó contexto académico importante y confirmó varios detalles mencionados por otros entrevistados."
            },
            {
                id: 5,
                texto: "Análisis de evidencia física recolectada. Se enviaron muestras al laboratorio para análisis forense. Resultados esperados en 5-7 días hábiles."
            },
            {
                id: 6,
                texto: "Reunión de seguimiento con el equipo legal. Se discutieron las implicaciones legales de los hallazgos y se definió la estrategia para las próximas entrevistas."
            },
            {
                id: 7,
                texto: "Entrevista grupal con funcionarios de administración. Se obtuvieron perspectivas diferentes sobre los procedimientos institucionales y posibles mejoras."
            }
        ];

        return bitacoraSimulada;
    };

    const cargarEntrevistas = async () => {
        try {
            console.log('Cargando entrevistas...');
            const entrevistasObtenidas = await simularLlamadaEntrevistas();
            setEntrevistas(entrevistasObtenidas);
            console.log('Entrevistas cargadas:', entrevistasObtenidas);
        } catch (error) {
            console.error('Error al cargar entrevistas:', error);
        }
    };

    const cargarAfectados = async () => {
        try {
            console.log('Cargando afectados...');
            const afectadosObtenidos = await simularLlamadaAfectados();
            setAfectados(afectadosObtenidos);
            console.log('Afectados cargados:', afectadosObtenidos);
        } catch (error) {
            console.error('Error al cargar afectados:', error);
        }
    };

    const cargarBitacora = async () => {
        try {
            console.log('Cargando bitácora...');
            const bitacoraObtenida = await simularLlamadaBitacora();
            setBitacora(bitacoraObtenida);
            console.log('Bitácora cargada:', bitacoraObtenida);
        } catch (error) {
            console.error('Error al cargar bitácora:', error);
        }
    };

    useEffect(() => {
        console.log('Componente Casos montado');
        cargarEntrevistas();
        cargarAfectados();
        cargarBitacora();
    }, []);




    return (
        <div>
            <Navbar />
            <div className='flex gap-3 p-3'>
                <button
                    className={`flex-1 btn ${Seleccionado === 'entrevistas' ? 'btn-primary' : 'btn-accent'}`}
                    onClick={() => SetterSeleccionado('entrevistas')}
                >
                    Entrevistas
                </button>

                {/* Botón: Afectados */}
                <button
                    className={`flex-1 btn ${Seleccionado === 'afectados' ? 'btn-primary' : 'btn-accent'}`}
                    onClick={() => SetterSeleccionado('afectados')}
                >
                    Afectados
                </button>

                {/* Botón: Bitácora */}
                <button
                    className={`flex-1 btn ${Seleccionado === 'bitacora' ? 'btn-primary' : 'btn-accent'}`}
                    onClick={() => SetterSeleccionado('bitacora')}
                >
                    Bitácora
                </button>
            </div>

            {
                Seleccionado === 'entrevistas' && (
                    <div className='flex flex-col gap-2 p-3'>
                        <div className='flex justify-between'>
                            <h2 className='text-2xl font-bold'>Entrevistas ({entrevistas.length})</h2>
                            <button className="btn btn-accent" onClick={() => document.getElementById('CrearEntrevistas').showModal()}>Crear nueva entrevista</button>
                        </div>

                        <div className='flex gap-2 p-3'>
                            <input type="text" className='input flex-1' placeholder='Buscar entrevista...' />
                        </div>

                        {entrevistas.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                <p>Cargando entrevistas...</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 mt-4">
                                {entrevistas.map((entrevista) => (
                                    <div key={entrevista.id} className="card bg-base-100 shadow-lg">
                                        <div className="card-body">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="card-title text-lg">Entrevista #{entrevista.id}</h3>
                                                    <div className="flex flex-col gap-2 mt-2">
                                                        <div className="flex items-center gap-2">

                                                            <span className="text-sm">
                                                                {entrevista.hora.toLocaleString('es-ES', {
                                                                    year: 'numeric',
                                                                    month: '2-digit',
                                                                    day: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{entrevista.lugar}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">

                                                            <span className="text-sm">
                                                                Integrantes: {entrevista.id_integrantes.join(', ')}
                                                            </span>

                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="card-actions">
                                                    <button className="btn btn-primary btn-sm">Ver detalles</button>
                                                    <button className="btn btn-secondary btn-sm">Editar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>
                )
            }

            {
                Seleccionado === 'afectados' && (
                    <div className='flex flex-col gap-2 p-3'>
                        <div className='flex justify-between'>
                            <h2 className='text-2xl font-bold'>Afectados ({afectados.length})</h2>
                            <button className="btn btn-accent" onClick={() => document.getElementById('AñadirAfectado').showModal()}>Agregar afectado</button>
                        </div>

                        <div className='flex gap-2 p-3'>
                            <input type="text" className='input flex-1' placeholder='Buscar afectado...' />
                        </div>

                        {afectados.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                <p>Cargando afectados...</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 mt-4">
                                {afectados.map((afectado, index) => (
                                    <div key={index} className="card bg-base-100 shadow-lg">
                                        <div className="card-body">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h3 className="card-title text-lg">{afectado.Nombre}</h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{afectado.Carrera}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{afectado.Correo}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{afectado.Telefono}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`badge ${afectado.Cargo === 'docente' ? 'badge-success' :
                                                                afectado.Cargo === 'alumno' ? 'badge-warning' :
                                                                    'badge-neutral'
                                                                }`}>
                                                                {afectado.Cargo.charAt(0).toUpperCase() + afectado.Cargo.slice(1)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="card-actions">
                                                    <button className="btn btn-primary btn-sm">Ver perfil</button>
                                                    <button className="btn btn-secondary btn-sm">Editar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            {
                Seleccionado === 'bitacora' && (
                    <div className='flex flex-col gap-2 p-3'>
                        <div className='flex justify-between'>
                            <h2 className='text-2xl font-bold'>Bitácora ({bitacora.length})</h2>
                            <button className='btn btn-accent'>Nueva entrada</button>
                        </div>

                        <div className='flex gap-2 p-3'>
                            <input type="text" className='input flex-1' placeholder='Buscar en bitácora...' />
                        </div>

                        {bitacora.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                <p>Cargando bitácora...</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 mt-4">
                                {bitacora.map((entrada) => (
                                    <div key={entrada.id} className="card bg-base-100 shadow-lg">
                                        <div className="card-body">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="badge badge-primary">#{entrada.id}</span>
                                                        <h3 className="text-lg font-semibold">Entrada de Bitácora</h3>
                                                    </div>
                                                    <p className="text-sm text-gray-700 leading-relaxed">
                                                        {entrada.texto}
                                                    </p>
                                                </div>
                                                <div className="card-actions flex flex-col gap-2">
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => console.log('Ver resultados de entrada:', entrada.id)}
                                                    >
                                                        Resultados
                                                    </button>
                                                    <button className="btn btn-secondary btn-sm">Editar</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }


            {/* --------------- MODAL ------------------- */}



            {/* ENTREVISTAS */}

            <dialog id="CrearEntrevistas" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Crear nueva entrevista</h3>

                    <p className="pt-4">Fecha:</p>
                    <div className='flex'>
                        <input className='flex-1 input input-bordered' type="date" id="date" name="date"></input>
                    </div>

                    <p className="pt-4">Hora:</p>
                    <div className='flex'>
                        <input className='flex-1 input input-bordered' type="time" id="time" name="time"></input>
                    </div>

                    <p className="pt-4">Lugar:</p>
                    <div className='flex'>
                        <input className='flex-1 input input-bordered' type="text" id="lugar" name="lugar"></input>
                    </div>
                    <div className='flex justify-between pt-3'>
                        <p className="">Integrantes:</p>
                        <button className="btn btn-accent" onClick={() => document.getElementById('AñadirIntegrantes').showModal()}>Añadir integrante</button>
                    </div>
                    <div className="flex flex-col shadow-md p-3">
                        {Integrantes.length === 0 ? (
                            <span>Añade nuevos integrantes</span>
                        ) : (
                            <div className="flex max-h-[20vh] overflow-auto flex-wrap gap-2">
                                {Integrantes.map((integrante) => (
                                    <div key={integrante} className="bg-gray-100 p-2 rounded shadow-sm">
                                        {afectados.find(item => item.id === integrante).Nombre}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="modal-action">
                        <button onClick={() => CancelarModalEntrevista()} className='btn btn-error'>Cancelar</button>
                        <button onClick={() => GuardarModalEntrevista} className='btn btn-success'>Guardar</button>
                    </div>
                </div>
            </dialog>

            {/* Modal de integrantes */}


            <dialog id="AñadirIntegrantes" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Integrantes</h3>


                    <div className='pb-3'>
                        <p className="py-4">Selecciona a quien añadir</p>
                        <div className='flex'>
                            <input type="text" className='flex-1 input' placeholder='Buscar' />
                        </div>
                    </div>

                    {/* Cartas de integrantes */}

                    {afectados.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            <p>Cargando afectados...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
                            {afectados.map((afectado, index) => (
                                <div key={index} className='flex items-center rounded-2xl bg-base-200'>
                                    <div className='flex flex-1 flex-col p-3'>
                                        <p className='text-xl'>{afectado.Nombre}</p>
                                        <p className='text-xs'>Carrera: {afectado.Carrera}</p>
                                        <p className='text-xs'>Rol: {afectado.Cargo.charAt(0).toUpperCase() + afectado.Cargo.slice(1)}</p>
                                    </div>
                                    <div className='flex'>
                                        {!Integrantes.includes(afectado.id) && <button onClick={() => AñadirIntegrante(afectado.id)} className='btn m-4 btn-accent'>Añadir</button>}
                                        {Integrantes.includes(afectado.id) && <button onClick={() => RetirarIntegrante(afectado.id)} className='btn m-4 btn-error'>Retirar</button>}

                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="modal-action">
                        <div className='flex gap-3'>
                            <button onClick={() => GuardarAñadirIntegrantes()} className='btn btn-success'>Aceptar</button>
                        </div>
                    </div>
                </div>
            </dialog>


            {/* Integrantes */}

            <dialog id="AñadirAfectado" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Añadir afectado</h3>
                    <p className="py-4">Nombre</p>

                    <p className="py-4">Carrera</p>

                    <p className="py-4">Correo</p>

                    <p className="py-4">Telefono</p>

                    <p className="py-4">Cargo</p>

                    <div className="modal-action">
                        <form method="dialog">
                            {/* if there is a button in form, it will close the modal */}
                            <button className="btn">Close</button>
                        </form>
                    </div>
                </div>
            </dialog>

            {/* Bitacora */}






        </div>
    )
}

export default Casos