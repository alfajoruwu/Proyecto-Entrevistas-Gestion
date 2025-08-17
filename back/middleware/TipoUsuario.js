const jwt = require('jsonwebtoken');
require('dotenv').config();
const { randomUUID } = require('crypto');
const pool = require('../config/DB');


const JWT_SECRET = process.env.JWT_SECRET;

//
// --------------------------------------------------
// |  Proteccion de rutas - simple + modo invitado  |
// --------------------------------------------------
//
//  Importa:
//  
//  const { authMiddleware, Verifica } = require('../../middleware/TipoUsuario.js');
//
//  Ejemplo de ruta:
//
//  router.get('/ruta_ejemplo', authMiddleware, Verifica("rol1", "rol2"), (req, res) => {}
//  
//  [Extrae desde el token el rol del usuario]
//
//  Extra - Guarda de forma automatica - usuarios registrados: 
//  id:  req.user.id
//  rol: req.user.rol
//

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    // No generamos invitado automático ahora
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificar blacklist si el token tiene jti
    if (decoded.jti) {
      const tokenCheck = await pool.query(
        'SELECT revoked FROM Tokens WHERE jti = $1',
        [decoded.jti]
      );

      if (tokenCheck.rows.length === 0 || tokenCheck.rows[0].revoked) {
        console.log('Token revocado o no encontrado en blacklist');
        return res.status(401).json({ error: 'Token revocado o inválido' });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.log('Token inválido o expirado');
    res.status(402).json({ error: 'Token inválido o expirado' });
  }
};


const Verifica = (...rolesPermitidos) => {
  return (req, res, next) => {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (user.rol && rolesPermitidos.includes(user.rol)) {
      return next();
    }

    return res.status(403).json({ error: 'Acceso denegado. No tienes permiso suficiente.' });
  };
};

module.exports = { authMiddleware, Verifica };