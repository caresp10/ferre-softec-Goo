// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDZ0TPW2Ir1bznNi_f1nDTSnFwhIALzybk",
  authDomain: "softec-ferre.firebaseapp.com",
  projectId: "softec-ferre",
  storageBucket: "softec-ferre.firebasestorage.app",
  messagingSenderId: "48843118454",
  appId: "1:48843118454:web:105feb33b9de9aa3120c57",
  measurementId: "G-03PVJ0F2R4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };