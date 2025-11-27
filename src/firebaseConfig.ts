// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
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

// Initialize Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Export instances to be used in other files
export { app, analytics, auth, db };