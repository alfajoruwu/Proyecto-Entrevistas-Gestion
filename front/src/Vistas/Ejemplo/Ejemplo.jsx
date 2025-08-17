import React from 'react'
import Navbar from '../../Componentes/Navbar'
import Carta_Custom from '../../assets/Carta_Custom'
//Variables glovales
import { EstadoGlobalContexto } from '../../AuxS/EstadoGlobal'

//Uso de toastys
import { useToast } from '../../Componentes/ToastContext'

//Router
import { useNavigate } from "react-router-dom";

//Modo claro/oscuro
import TemaChanger from '../../Componentes/TemaChanger'




const Ejemplo = () => {


    return (
        <div>
            <Navbar />

            <div className='p-4'>
                Ejemplos de componentes
            </div>

            <div className='p-4'>
                <Carta_Custom />
            </div>

            <div className='bg-red-200 p-4'>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Amet rerum quisquam est ex nihil debitis nostrum, inventore, veniam hic quaerat rem necessitatibus sit voluptatum qui saepe id illum repellat adipisci.
            </div>

            <div className='flex gap-4 p-4'>
                <button className='btn flex-1 btn-primary'>
                    boton 1
                </button>
                <button className='btn flex-1 btn-primary'>
                    boton 2
                </button>
            </div>

            <div className='bg-blue-200 p-4'>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Amet rerum quisquam est ex nihil debitis nostrum, inventore, veniam hic quaerat rem necessitatibus sit voluptatum qui saepe id illum repellat adipisci.
            </div>

            <div className='bg-green-200 p-4'>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Amet rerum quisquam est ex nihil debitis nostrum, inventore, veniam hic quaerat rem necessitatibus sit voluptatum qui saepe id illum repellat adipisci.
            </div>

            <div className='bg-yellow-200 p-4'>
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Amet rerum quisquam est ex nihil debitis nostrum, inventore, veniam hic quaerat rem necessitatibus sit voluptatum qui saepe id illum repellat adipisci.
            </div>

        </div>
    )
}

export default Ejemplo