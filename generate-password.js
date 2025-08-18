const bcrypt = require('bcrypt');

// Cambia 'admin123admin' por la contraseña que quieras
const password = 'admin123admin';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error generando hash:', err);
        return;
    }
    console.log('Contraseña original:', password);
    console.log('Hash generado:', hash);
    console.log('\nCopia este hash y reemplázalo en tu archivo .env:');
    console.log(`DEFAULT_USER_PASSWORD=${hash}`);
});
