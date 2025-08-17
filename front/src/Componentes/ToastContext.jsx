// ToastContext.js
import React, { createContext, useContext, useState } from 'react';
import ReactDOM from 'react-dom'; // 👈 1. Importa ReactDOM

// Tipos de toast
// mostrarToast(mensaje, 'success', duracion);
// mostrarToast(mensaje, 'error', duracion);
// mostrarToast(mensaje, 'warning', duracion);

// Crear el contexto
const ToastContext = createContext();

// Crear el proveedor del contexto
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    // Función para agregar un nuevo toast
    const mostrarToast = (mensaje, tipo = 'warning', duracion = 3000) => {
        const id = Date.now(); // Generar un ID único para el toast
        setToasts((prevToasts) => [...prevToasts, { id, mensaje, tipo, duracion }]);

        // Eliminar el toast después de la duración especificada
        setTimeout(() => {
            setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
        }, duracion);
    };

    return (
        <ToastContext.Provider value={{ mostrarToast }}>
            {children}

            {/* Renderizar todos los toasts */}
            {ReactDOM.createPortal(
                <div className="toast toast-end">
                    {toasts.map(({ id, mensaje, tipo }) => (
                        <div
                            key={id}
                            className={`alert shadow-lg ${tipo === 'success'
                                ? 'alert-success'
                                : tipo === 'error'
                                    ? 'alert-error'
                                    : 'alert-warning'
                                }`}
                        >
                            <span>{mensaje}</span>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
};

// Hook personalizado para usar el contexto
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast debe usarse dentro de un ToastProvider');
    }
    return context;
};