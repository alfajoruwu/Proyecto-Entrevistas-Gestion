const express = require('express');
const router = express.Router();
const pool = require('../../config/DB');

// --- GET ---

router.get('/get', async (req, res) => {
    try {
        const result = await pool.query('SELECT nombre,email FROM usuarios');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

router.get('/get/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    res.status(500).json({ error: 'Error al obtener el usuario' });
  }
});


// --- POST ---

router.post('/post', async (req, res) => {
  const { nombre, email } = req.body;

  if (!nombre || !email) {
    return res.status(400).json({ error: 'Nombre y email son requeridos' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email) VALUES ($1, $2) RETURNING *',
      [nombre, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear el usuario:', error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

// --- PUT ---

router.put('/put/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, email } = req.body;

  if (!nombre || !email) {
    return res.status(400).json({ error: 'Nombre y email son requeridos' });
  }

  try {
    const result = await pool.query(
      'UPDATE usuarios SET nombre = $1, email = $2 WHERE id = $3 RETURNING *',
      [nombre, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});


// --- DELETE ---


router.delete('/delete/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
});


// --- Ejemplos complejos ---

router.post('/usuarios', async (req, res) => {
  const { nombre, email } = req.body;

  if (!nombre || !email) {
    return res.status(400).json({ error: 'Nombre y email son requeridos' });
  }

  try {
    // Consulta 1: Comprobar si el email ya existe
    const checkQuery = 'SELECT * FROM usuarios WHERE email = $1';
    const checkResult = await pool.query(checkQuery, [email]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Consulta 2: Insertar nuevo usuario
    const insertQuery = 'INSERT INTO usuarios (nombre, email) VALUES ($1, $2) RETURNING *';
    const insertResult = await pool.query(insertQuery, [nombre, email]);

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


router.post('/usuarios', async (req, res) => {
  const { nombre, email } = req.body;

  if (!nombre || !email) {
    return res.status(400).json({ error: 'Nombre y email son requeridos' });
  }

  try {
    // Consulta 1: Comprobar si el email ya existe
    const checkQuery = 'SELECT * FROM usuarios WHERE email = $1';
    const checkResult = await pool.query(checkQuery, [email]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Consulta 2: Insertar nuevo usuario
    const insertUsuarioQuery = 'INSERT INTO usuarios (nombre, email) VALUES ($1, $2) RETURNING *';
    const insertUsuarioResult = await pool.query(insertUsuarioQuery, [nombre, email]);

    // Tomamos el ID del nuevo usuario
    const nuevoUsuarioId = insertUsuarioResult.rows[0].id;

    // Consulta 3: Insertar perfil relacionado con el nuevo usuario
    const insertPerfilQuery = 'INSERT INTO perfiles (usuario_id, bio) VALUES ($1, $2) RETURNING *';
    const insertPerfilResult = await pool.query(insertPerfilQuery, [nuevoUsuarioId, 'Perfil por defecto']);

    // Respuesta combinada o solo el usuario + perfil
    res.status(201).json({
      usuario: insertUsuarioResult.rows[0],
      perfil: insertPerfilResult.rows[0]
    });

  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


module.exports = router;

