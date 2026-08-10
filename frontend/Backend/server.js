const express = require('express');
const cors = require('cors');

// 🔥 IMPORTAR FIREBASE
const db = require('./firebase');
const { collection, addDoc } = require('firebase/firestore');

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor funcionando 🚀');
});

// POST → guardar en Firestore
app.post('/api/acceso', async (req, res) => {
  try {
    const datos = req.body;

    const docRef = await addDoc(collection(db, 'accesos'), {
      usuario: datos.usuario,
      metodo: datos.metodo,
      estado: datos.estado,
      fecha: new Date()
    });

    res.json({
      mensaje: 'Guardado en Firestore',
      id: docRef.id
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error al guardar');
  }
});

// Puerto
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});