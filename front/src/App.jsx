import './App.css'
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { ProveedorEstadoGlobal } from './AuxS/EstadoGlobal';

import { ToastProvider } from './Componentes/ToastContext';
import Login from './Vistas/Login/Login';
import Registro from './Vistas/Login/Registro';
import Ejemplo from './Vistas/Ejemplo/Ejemplo';
import Principal from './Vistas/Principal/Principal';
import Casos from './Vistas/Casos/Casos';
function App() {

  return (
    <ToastProvider>

      <ProveedorEstadoGlobal>
        <BrowserRouter>
          <Routes>

            <Route path="/" element={<Login />} />

            {/* Inicio de seccion */}
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />

            <Route path="/Ejemplo" element={<Ejemplo />} />
            <Route path='/Principal' element={<Principal />} />

            {/* Rutas de casos */}
            <Route path='/Casos/:id' element={<Casos />} />

          </Routes>
        </BrowserRouter>
      </ProveedorEstadoGlobal>


    </ToastProvider>
  )
}


export default App
