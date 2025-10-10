import React, { useContext, useState } from 'react'
import Navbar from '../../Componentes/Navbar';
import { EstadoGlobalContexto } from '../../AuxS/EstadoGlobal'
import { useToast } from '../../Componentes/ToastContext'
import { useNavigate } from 'react-router-dom';
import apiClient from '../../AuxS/Axiosinstance';

//Modo claro/oscuro
import TemaChanger from '../../Componentes/TemaChanger'


const Login = () => {

    const Navigate = useNavigate();
    const { mostrarToast } = useToast();
    const { valorGlobal, setValorGlobal } = useContext(EstadoGlobalContexto)

    const { Nombre, SetNombre } = useContext(EstadoGlobalContexto)
    const { Rol, SetRol } = useContext(EstadoGlobalContexto)


    // ----- Navegar Rutas -----

    const IrRegistro = () => { Navigate('/Registro') }
    const IrLogin = () => { Navigate('/Login') }
    const Irprincipal = () => { Navigate('/estadisticas') }
    // ----- Variables -------

    const [Usuario, SetUsuario] = useState("")
    const seterUsuario = (event) => {
        SetUsuario(event.target.value)
    }

    const [Contrasna, SetContrasena] = useState("")
    const seterContrasena = (event) => {
        SetContrasena(event.target.value)
    }

    // ----- Funciones ------

    const EnvioLogin = (Usuario, Contrasena) => {
        apiClient.post('/api/usuarios/login', { email: Usuario, password: Contrasena })

            .then(response => {
                console.log('Usuarios:', response.data);
                localStorage.setItem('accessToken', response.data.accessToken);
                localStorage.setItem('refreshToken', response.data.refreshToken);
                // Setear datos usuario
                localStorage.setItem('Nombre', response.data.Usuario.nombre);
                localStorage.setItem('Rol', response.data.Usuario.ROL);

                SetRol(response.data.Usuario.ROL)
                SetNombre(response.data.Usuario.nombre)
                Irprincipal();
            })

            .catch(error => {
                console.error('Error del backend:', error.response.data.error);
                mostrarToast("Error: " + error.response.data.error, 'error', 3000);
            });
    }

    const IngresarComoInvitado = () => {
        apiClient.post('/api/usuarios/invitado')
            .then(response => {
                console.log('Usuario invitado creado:', response.data);
                localStorage.setItem('accessToken', response.data.accessToken);
                localStorage.setItem('invitadoId', response.data.invitadoId);
                // Setear datos de invitado
                localStorage.setItem('Nombre', 'Invitado');
                localStorage.setItem('Rol', 'invitado');

                SetRol('invitado')
                SetNombre('Invitado')
                mostrarToast('Ingresaste como invitado', 'success', 3000);
                Irprincipal();
            })
            .catch(error => {
                console.error('Error al ingresar como invitado:', error.response?.data?.error || error.message);
                mostrarToast("Error: " + (error.response?.data?.error || 'No se pudo ingresar como invitado'), 'error', 3000);
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

                    <div className='card-body flex flex-col gap-2'>

                        <div className='flex '>
                            <h1 className="text-2xl font-bold" >Registro de entrevistas</h1>
                        </div>

                        <div class="divider"></div>

                        <h2 className='card-title'>Iniciar Sesión</h2>

                        <label>Ingresa tu correo</label>
                        <input onChange={seterUsuario} className='input w-full' placeholder='Correo' type="text" />

                        <label>Ingresa tu contraseña</label>
                        <input onChange={seterContrasena} className='input w-full' placeholder='Contraseña' type="password" />

                        <button onClick={() => EnvioLogin(Usuario, Contrasna)} className="btn btn-primary">Iniciar sesión</button>

                        {/* 
                        <button onClick={() => IrRegistro()} className="btn btn-secondary">Crear cuenta</button>
                        <button onClick={() => IngresarComoInvitado()} className="btn btn-accent">Ingresar como invitado</button>
 */}

                    </div>
                </div>

            </div>

        </div>
    )
}

export default Login