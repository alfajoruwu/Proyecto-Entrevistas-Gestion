import React, { createContext, useState } from 'react';
export const EstadoGlobalContexto = createContext();
export const ProveedorEstadoGlobal = ({ children }) => {

  const [valorGlobal, setValorGlobal] = useState('Valor inicial');

  // Datos usuario
  const [Logeado, SetLogedao] = useState(false)
  const [Nombre, SetNombre] = useState('')
  const [Rol, SetRol] = useState('')

  return (
    // Variables
    <EstadoGlobalContexto.Provider value={
      {
        valorGlobal, setValorGlobal,
        Logeado, SetLogedao,
        Nombre, SetNombre,
        Rol, SetRol,

      }}>
      {children}
    </EstadoGlobalContexto.Provider>
  );
};