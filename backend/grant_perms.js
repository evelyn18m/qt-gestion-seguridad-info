const mysql = require('mysql2/promise');

async function grantPermissions() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'rootpassword',
  });

  try {
    await connection.query("GRANT ALL PRIVILEGES ON *.* TO 'sgsi_user'@'%';");
    await connection.query('FLUSH PRIVILEGES;');
    console.log('Permissions granted successfully');
  } catch (error) {
    console.error('Error granting permissions:', error);
  } finally {
    await connection.end();
  }
}

grantPermissions();
