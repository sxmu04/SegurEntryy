const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCWz9VC7N4V9l0Fh2eMfYLp4tduWeOziH8",
  authDomain: "segurentry-b16a3.firebaseapp.com",
  projectId: "segurentry-b16a3",
  storageBucket: "segurentry-b16a3.firebasestorage.app",
  messagingSenderId: "921321157085",
  appId: "1:921321157085:web:e59f70dd09ac76a822c634",
  measurementId: "G-74JJ3QYBNE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = db;