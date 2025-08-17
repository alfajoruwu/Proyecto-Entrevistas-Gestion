import React, { useContext, useState } from 'react'
import Navbar from '../../Componentes/Navbar';
import { EstadoGlobalContexto } from '../../AuxS/EstadoGlobal'
import { useToast } from '../../Componentes/ToastContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../AuxS/Axiosinstance';


import TemaChanger from '../../Componentes/TemaChanger'


const Registro = () => {

    const Navigate = useNavigate();
    const { mostrarToast } = useToast();
    const { valorGlobal, setValorGlobal } = useContext(EstadoGlobalContexto)
    const { Nombre: NombreGlobal, SetNombre: SetNombreGlobal } = useContext(EstadoGlobalContexto)
    const { Rol: RolGlobal, SetRol: SetRolGlobal } = useContext(EstadoGlobalContexto)

    // Verificar si hay un usuario invitado activo
    const invitadoId = localStorage.getItem('invitadoId');
    const rolActual = localStorage.getItem('Rol');
    const esInvitado = rolActual === 'invitado' && invitadoId;

    // ---- Navigate ----

    const IrLogin = () => { Navigate('/Login') }

    // ---- Variables ---

    const [Nombre, SetNombre] = useState('')
    const SetterNombre = (event) => {
        SetNombre(event.target.value)
    }

    const [ConfirmaContrasena, SetConfirmaContrasena] = useState('')
    const SetterConfirmaContrasena = (event) => {
        SetConfirmaContrasena(event.target.value)
    }

    const [Contrasena, SetContrasena] = useState('')
    const SetterContrasena = (event) => {
        SetContrasena(event.target.value)
    }

    const [Correo, SetCorreo] = useState('')
    const SetterCorreo = (event) => {
        SetCorreo(event.target.value)
    }

    // ----- Funciones -----

    const CrearCuenta = (Nombre, ConfirmaContrasena, Contrasena, Correo) => {
        // Preparar los datos para el registro
        const datosRegistro = {
            email: Correo,
            password: Contrasena,
            confirmPass: ConfirmaContrasena,
            nombre: Nombre
        };

        // Si es un invitado, incluir el invitadoId para la migración
        if (esInvitado) {
            datosRegistro.invitadoId = invitadoId;
        }

        apiClient.post('/usuarios/register', datosRegistro)
            .then(response => {
                console.log('Usuario registrado:', response.data);

                if (esInvitado) {
                    // Si era invitado, actualizar tokens y datos
                    localStorage.setItem('accessToken', response.data.accessToken);
                    localStorage.setItem('refreshToken', response.data.refreshToken);
                    localStorage.setItem('Nombre', response.data.Usuario.nombre);
                    localStorage.setItem('Rol', response.data.Usuario.ROL);
                    localStorage.removeItem('invitadoId'); // Ya no es invitado

                    // Actualizar estado global
                    SetNombreGlobal(response.data.Usuario.nombre);
                    SetRolGlobal(response.data.Usuario.ROL);

                    mostrarToast('¡Cuenta migrada exitosamente! Ahora eres un usuario registrado.', 'success', 4000);
                    Navigate('/Ejemplo'); // Ir a la página principal
                } else {
                    mostrarToast(response.data.message, 'success', 3000);
                    IrLogin();
                }
            })
            .catch(error => {
                console.error('Error del backend:', error.response?.data?.error || error.message);
                mostrarToast('Error: ' + (error.response?.data?.error || 'Error en el registro'), 'error', 3000);
            });
    }



    return (

        <div className='h-screen w-screen'>

            <Navbar MenuLateral={false} />

            <div className='flex justify-end items-center mr-4 mt-2 gap-2'>
                <label>Modo:</label>
                <TemaChanger />
            </div>

            <div className='flex flex-col items-center justify-center'>

                <div className=' card p-2 w-full sm:max-w-md md:max-w-lg lg:max-w-xl m-12 flex shadow-sm bg-base-200'>

                    <div className='card-body flex flex-col '>

                        <div className='flex '>
                            <h1 className="text-2xl font-bold" >SQL Faciltio</h1>
                        </div>

                        <div class="divider"></div>

                        {esInvitado ? (
                            <>
                                <div className="alert alert-info">
                                    <div>
                                        <span>🔄 Estás registrándote como usuario. Tu progreso como invitado se mantendrá.</span>
                                    </div>
                                </div>
                                <h2 className='card-title'>Migrar cuenta de invitado</h2>
                            </>
                        ) : (
                            <h2 className='card-title'>Crea tu cuenta</h2>
                        )}

                        <label>Crea tu nombre de usuario</label>
                        <input onChange={SetterNombre} className='input w-full' placeholder='Usuario' type="text" />


                        <label>Ingresa tu correo</label>
                        <input onChange={SetterCorreo} className='input w-full' placeholder='Correo' type="mail" />


                        <label>Ingresa tu contraseña</label>
                        <input onChange={SetterContrasena} className='input w-full' placeholder='Crea tu contraseña' type="password" />


                        <label>Confirma tu contraseña</label>
                        <input onChange={SetterConfirmaContrasena} className='input w-full' placeholder='Confirma Contraseña' type="password" />


                        <button onClick={() => CrearCuenta(Nombre, ConfirmaContrasena, Contrasena, Correo)} className="btn btn-primary">
                            {esInvitado ? 'Migrar a cuenta registrada' : 'Crear cuenta'}
                        </button>

                        <div class="divider"></div>

                        <button onClick={() => IrLogin()} className="btn btn-secondary">
                            {esInvitado ? 'Continuar como invitado' : 'Iniciar sesión'}
                        </button>



                    </div>
                </div>

            </div>

        </div>




    )
}

export default Registro