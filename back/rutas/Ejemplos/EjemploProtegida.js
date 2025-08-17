const express = require('express');
const router = express.Router();

const { authMiddleware, Verifica } = require('../../middleware/TipoUsuario.js');

router.get('/protected', authMiddleware, Verifica("admin", "usuario"), (req, res) => {
  res.json({ message: 'Acceso permitido', usuario: req.user });
});


router.get('/protected2', authMiddleware, Verifica("admin", "usuario"), (req, res) => {
    // Aquí puedes acceder a los datos del usuario autenticado
    console.log("Usuario autenticado:", req.user.id);
    console.log("Rol del usuario:", req.user.rol);
    res.json({ message: 'Acceso permitido a la ruta protegida', usuario: req.user });
});



module.exports = router;

