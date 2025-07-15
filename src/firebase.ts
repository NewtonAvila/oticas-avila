import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyArRxjDwQAogFM3118Xk-ivDy480a8ue20",
  authDomain: "smartbudgetnew.firebaseapp.com",
  projectId: "smartbudgetnew",
  storageBucket: "smartbudgetnew.firebasestorage.app",
  messagingSenderId: "398200258617",
  appId: "1:398200258617:web:1e039a8a9cc82369cfcde8",
  measurementId: "G-S4JR021D2R"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("Firebase inicializado, conectado ao projeto:", firebaseConfig.projectId);

export { db };