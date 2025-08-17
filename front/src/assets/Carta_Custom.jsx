import React from 'react'

import { ImAirplane } from "react-icons/im";


const Carta_Custom = () => {
    return (

        <div className='bg-red-400 shadow-xl rounded'>

            <div className='flex p-4'>
                <ImAirplane style={{ height: '4rem', width: '4rem' }} />
            </div>

            <div className='p-4 font-black text-xl'>
                Titulo de carta
            </div>
            <p className='p-4'>
                Lorem ipsum dolor sit, amet consectetur adipisicing elit. Magnam repudiandae quibusdam repellat officiis laborum esse iure? Ipsum amet,
            </p>

            <div className='flex gap-3 p-2 justify-end'>
                <button className='btn btn-primary'>boton</button>
                <button className='btn btn-primary'>boton 2</button>
            </div>

        </div>
    )
}

export default Carta_Custom