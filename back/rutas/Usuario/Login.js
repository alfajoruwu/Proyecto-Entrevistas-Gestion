const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');
const pool = require('../../config/DB');
const { randomUUID } = require('crypto');

JWT_SECRET = process.env.JWT_SECRET

// Nueva ruta: crear invitado (token sin expiración + jti para posible blacklist)
router.post('/invitado', async (req, res) => {
  try {
    const guestId = randomUUID();
    const jti = randomUUID(); // identificador único del token
    await pool.query('INSERT INTO Invitados (id) VALUES ($1)', [guestId]);
    // Registrar token en tabla Tokens
    await pool.query(
      'INSERT INTO Tokens (jti, invitado_id, token_type, expires_at) VALUES ($1, $2, $3, $4)',
      [jti, guestId, 'access', null]
    );
    // Token sin expiresIn (no expira automáticamente) => controlar por blacklist o invalidación manual
    const accessToken = jwt.sign({ invitadoId: guestId, rol: 'invitado', tipo: 'guest', jti }, JWT_SECRET);
    res.json({ invitadoId: guestId, accessToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo crear invitado' });
  }
});

router.post('/register', async (req, res) => {
  let { nombre, email, password, confirmPass, invitadoId } = req.body;

  let rol = 'usuario'

  if (!nombre || !email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos' });

  email = email.toLowerCase();

  if (password != confirmPass) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'El email no es válido' });
  }

  const checkUser = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  if (checkUser.rows.length > 0) return res.status(400).json({ error: 'El email ya está registrado' });

  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.query(
    'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($4, $1, $2, $3)',
    [email, hashedPassword, rol, nombre]
  );

  // Si viene invitadoId, marcar upgrade
  if (invitadoId) {
    try {
      await pool.query('UPDATE Invitados SET upgraded = TRUE WHERE id = $1', [invitadoId]);
    } catch (e) {
      console.warn('No se pudo marcar upgrade de invitado:', e.message);
    }
  }
  res.status(201).json({ message: 'Usuario creado correctamente' });
});


router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos' });

  const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  if (result.rows.length === 0) return res.status(400).json({ error: 'Correo no registrado' });

  const usuario = result.rows[0];
  const esValida = await bcrypt.compare(password, usuario.password);

  if (!esValida) return res.status(400).json({ error: 'Contraseña incorrecta' });

  const accessJti = randomUUID();
  const refreshJti = randomUUID();
  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3h
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

  // Registrar tokens en tabla Tokens
  await pool.query(
    'INSERT INTO Tokens (jti, user_id, token_type, expires_at) VALUES ($1, $2, $3, $4)',
    [accessJti, usuario.id, 'access', expiresAt]
  );
  await pool.query(
    'INSERT INTO Tokens (jti, user_id, token_type, expires_at) VALUES ($1, $2, $3, $4)',
    [refreshJti, usuario.id, 'refresh', refreshExpiresAt]
  );

  const accessToken = jwt.sign({ id: usuario.id, rol: usuario.rol, jti: accessJti }, JWT_SECRET, { expiresIn: '3h' });
  const refreshToken = jwt.sign({ id: usuario.id, rol: usuario.rol, jti: refreshJti }, JWT_SECRET, { expiresIn: '7d' });
  const usuarioDatos = { ID: usuario.id, nombre: usuario.nombre }
  res.json({ Usuario: usuarioDatos, accessToken, refreshToken });
});


router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token requerido' });

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // Verificar que el token no esté revocado
    const tokenCheck = await pool.query(
      'SELECT revoked FROM Tokens WHERE jti = $1',
      [decoded.jti]
    );

    if (tokenCheck.rows.length === 0 || tokenCheck.rows[0].revoked) {
      return res.status(403).json({ error: 'Refresh token inválido o revocado' });
    }

    // Generar nuevo access token
    const newAccessJti = randomUUID();
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3h

    // Registrar nuevo access token
    if (decoded.id) {
      // Usuario registrado
      await pool.query(
        'INSERT INTO Tokens (jti, user_id, token_type, expires_at) VALUES ($1, $2, $3, $4)',
        [newAccessJti, decoded.id, 'access', expiresAt]
      );
      const accessToken = jwt.sign({ id: decoded.id, rol: decoded.rol, jti: newAccessJti }, JWT_SECRET, { expiresIn: '3h' });
      res.json({ accessToken });
    } else if (decoded.invitadoId) {
      // Usuario invitado
      await pool.query(
        'INSERT INTO Tokens (jti, invitado_id, token_type, expires_at) VALUES ($1, $2, $3, $4)',
        [newAccessJti, decoded.invitadoId, 'access', null]
      );
      const accessToken = jwt.sign({ invitadoId: decoded.invitadoId, rol: decoded.rol, tipo: decoded.tipo, jti: newAccessJti }, JWT_SECRET);
      res.json({ accessToken });
    }
  } catch (err) {
    return res.status(403).json({ error: 'Refresh token inválido o expirado' });
  }
});

// Nuevo endpoint: logout (revocar token)
router.post('/logout', async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(400).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Revocar el token actual
    await pool.query(
      'UPDATE Tokens SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP WHERE jti = $1',
      [decoded.jti]
    );

    res.json({ message: 'Logout exitoso' });
  } catch (err) {
    return res.status(400).json({ error: 'Token inválido' });
  }
});

// Nuevo endpoint: logout global (revocar todos los tokens del usuario)
router.post('/logout-all', async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(400).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Revocar todos los tokens del usuario
    if (decoded.id) {
      await pool.query(
        'UPDATE Tokens SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked = FALSE',
        [decoded.id]
      );
    } else if (decoded.invitadoId) {
      await pool.query(
        'UPDATE Tokens SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP WHERE invitado_id = $1 AND revoked = FALSE',
        [decoded.invitadoId]
      );
    }

    res.json({ message: 'Logout global exitoso' });
  } catch (err) {
    return res.status(400).json({ error: 'Token inválido' });
  }
});

module.exports = router;