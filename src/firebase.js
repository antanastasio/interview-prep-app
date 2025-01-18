// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCi6kaFhkc5CzH7rWsy0sWiNtRZNiO-TKA",
  authDomain: "interview-app-c5296.firebaseapp.com",
  projectId: "interview-app-c5296",
  storageBucket: "interview-app-c5296.firebasestorage.app",
  messagingSenderId: "953388623587",
  appId: "1:953388623587:web:06c36d5de28acd125ec7d6",
  measurementId: "G-YX9X8HJBE6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export the services
export { auth, db, storage }; 