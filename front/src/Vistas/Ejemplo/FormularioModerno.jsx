import React, { useState } from 'react';

const FormularioModerno = () => {
    const [genero, setGenero] = useState('');
    const [aceptaTerminos, setAceptaTerminos] = useState(false);
    const [temasInteres, setTemasInteres] = useState({
        tecnologia: false,
        deportes: false,
        arte: false,
    });

    const handleChangeCheckbox = (e) => {
        setTemasInteres({
            ...temasInteres,
            [e.target.name]: e.target.checked,
        });
    };

    return (
        <div className="p-6 max-w-2xl mx-auto bg-base-100 rounded-box shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Formulario Moderno</h2>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">

                {/* Nombre */}
                <div className="form-control w-full">
                    <label className="label">
                        <span className="label-text">Nombre completo</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Escribe tu nombre"
                        className="input input-bordered w-full"
                    />
                </div>

                {/* Email */}
                <div className="form-control w-full">
                    <label className="label">
                        <span className="label-text">Correo electrónico</span>
                    </label>
                    <input
                        type="email"
                        placeholder="ejemplo@correo.com"
                        className="input input-bordered w-full"
                    />
                </div>

                {/* Barra de búsqueda */}
                <div className="form-control w-full">
                    <label className="label">
                        <span className="label-text">Busca algo interesante</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="input input-bordered w-full"
                    />
                </div>

                {/* Dropdown / Select */}
                <div className="form-control w-full">
                    <label className="label">
                        <span className="label-text">Género</span>
                    </label>
                    <select
                        className="select select-bordered w-full"
                        value={genero}
                        onChange={(e) => setGenero(e.target.value)}
                    >
                        <option disabled value="">Selecciona una opción</option>
                        <option value="femenino">Femenino</option>
                        <option value="masculino">Masculino</option>
                        <option value="otro">Otro / Prefiero no decirlo</option>
                    </select>
                </div>

                {/* Textarea */}
                <div className="form-control w-full">
                    <label className="label">
                        <span className="label-text">Reseña o comentario</span>
                    </label>
                    <textarea
                        className="textarea textarea-bordered w-full"
                        placeholder="Escribe aquí..."
                        rows={4}
                    ></textarea>
                </div>

                {/* Checkboxes */}
                <div className="form-control">
                    <label className="label cursor-pointer gap-2">
                        <input
                            type="checkbox"
                            name="tecnologia"
                            checked={temasInteres.tecnologia}
                            onChange={handleChangeCheckbox}
                            className="checkbox checkbox-primary"
                        />
                        <span className="label-text">Tecnología</span>
                    </label>
                    <label className="label cursor-pointer gap-2">
                        <input
                            type="checkbox"
                            name="deportes"
                            checked={temasInteres.deportes}
                            onChange={handleChangeCheckbox}
                            className="checkbox checkbox-primary"
                        />
                        <span className="label-text">Deportes</span>
                    </label>
                    <label className="label cursor-pointer gap-2">
                        <input
                            type="checkbox"
                            name="arte"
                            checked={temasInteres.arte}
                            onChange={handleChangeCheckbox}
                            className="checkbox checkbox-primary"
                        />
                        <span className="label-text">Arte y Cultura</span>
                    </label>
                </div>

                {/* Radio Buttons */}
                <div className="form-control space-y-2">
                    <label className="label-text">¿Cómo te enteraste de nosotros?</label>
                    <label className="cursor-pointer label gap-2">
                        <input
                            type="radio"
                            name="redes"
                            className="radio radio-primary"
                        />
                        <span>Redes sociales</span>
                    </label>
                    <label className="cursor-pointer label gap-2">
                        <input
                            type="radio"
                            name="amigo"
                            className="radio radio-primary"
                        />
                        <span>Un amigo</span>
                    </label>
                    <label className="cursor-pointer label gap-2">
                        <input
                            type="radio"
                            name="otros"
                            className="radio radio-primary"
                        />
                        <span>Otros</span>
                    </label>
                </div>

                {/* Términos y condiciones */}
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={aceptaTerminos}
                        onChange={() => setAceptaTerminos(!aceptaTerminos)}
                        className="checkbox checkbox-primary checkbox-sm"
                    />
                    <span className="text-sm">Acepto los términos y condiciones</span>
                </label>

                {/* Botón de enviar */}
                <div className="mt-4 flex justify-end">
                    <button type="submit" className="btn btn-primary w-full sm:w-auto">
                        Enviar formulario
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FormularioModerno;