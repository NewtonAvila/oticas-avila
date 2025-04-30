// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADdvO-Mcb7ksuNlSw-jbdfyEwIPth9Tuw",
  authDomain: "oticasavila-c113b.firebaseapp.com",
  projectId: "oticasavila-c113b",
  storageBucket: "oticasavila-c113b.firebasestorage.app",
  messagingSenderId: "2148042014",
  appId: "1:2148042014:web:26857111a4a5c9b427f50f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
