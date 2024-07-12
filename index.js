const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

const PORT = 3000;

// Configura la conexión a la base de datos
const pool = new Pool({
  connectionString: 'postgresql://prueba_ti_user:LY08Nn14YpGr4CS7uBrqB7GY5byp3kiE@dpg-cq8bm4cs1f4s73ciebhg-a.oregon-postgres.render.com/prueba_ti_db_ha82',
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.json());
app.use(cors()); // Agregar middleware de CORS

app.use(bodyParser.json());

// Endpoint para obtener todas las ordenes de venta
app.get('/sales', async (req, res) => {
  try {
    const { rows } = await pool.query(`
    SELECT 
    o.id_orden as num_orden,
    u.nombre AS cliente,
    p.nombre AS producto,
    o.piezas_ordenadas piezas,
	CASE 
        WHEN o.estatus THEN 'Activo'
        ELSE 'Inactivo'
    END AS estado
		
FROM 
    ordenes_de_venta o
JOIN 
    usuarios u ON o.id_cliente = u.id_cliente
JOIN 
    productos p ON o.clave_producto = p.clave_producto;
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener las carreras:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para obtener todos los productos
app.get('/items', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT nombre, existencias,
                CASE 
                    WHEN estatus THEN 'Activo'
                    ELSE 'Inactivo'
                END AS estado
            FROM productos
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener los productos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});



// Endpoint para insertar productos
app.post('/productos', async (req, res) => {
    const { nombre, existencias, estatus } = req.body;
    
    try {
      const query = `
        INSERT INTO productos (nombre, existencias, estatus)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const values = [nombre, existencias, estatus];
      const result = await pool.query(query, values);
    
      res.json(result.rows[0]); // Devolvemos el producto insertado
    } catch (error) {
      console.error('Error al insertar producto:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  });
  
  // Endpoint para insertar órdenes de venta
  app.post('/newsale', async (req, res) => {
    const { clave_producto, piezas_ordenadas, id_cliente, estatus } = req.body;
  
    try {
      const query = `
        INSERT INTO ordenes_de_venta (clave_producto, piezas_ordenadas, id_cliente, estatus)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const values = [clave_producto, piezas_ordenadas, id_cliente, estatus];
      const result = await pool.query(query, values);
  
      res.json(result.rows[0]); // Devolvemos la orden insertada
    } catch (error) {
      console.error('Error al insertar orden de venta:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  });
  

// Endpoint para registrar un nuevo usuario
app.post('/registro', async (req, res) => {
  const { name, last_name, email, password, phone} = req.body;

  try {
    // Verificar si el correo ya está registrado
    const correoExistente = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [email]);
    if (correoExistente.rows.length > 0) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
    }

    // Insertar el nuevo usuario en la base de datos
    const query = `
        INSERT INTO usuarios (nombre, apellido, correo, contraseña, telefono)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`;
    const values = [name, last_name, email, password, phone];

    const nuevoUsuario = await pool.query(query, values);

    res.status(201).json({ message: 'Usuario registrado correctamente', usuario: nuevoUsuario.rows[0] });
  } catch (error) {
    console.error('Error al registrar el usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para iniciar sesión
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar al usuario en la base de datos por correo electrónico
    const result = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [email]);

    if (result.rows.length === 0) {
      // El usuario no fue encontrado
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    // Verificar la contraseña
    if (user.contraseña !== password) {
        
      // La contraseña no coincide
      return res.status(401).json({ message: 'Credenciales inválidas' });;
    }

    // Las credenciales son válidas, inicio de sesión exitoso
    const { nombre } = user;
    res.status(200).json({ message: 'Inicio de sesión exitoso', nombre});
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor en funcionamiento en http://localhost:${PORT}`);
});
