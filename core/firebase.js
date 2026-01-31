import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword, // NEW: For Sign Up
    signInWithEmailAndPassword       // NEW: For Login
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6mNchoC1RTtivY7E3yjRezREa5dKhxzg",
  authDomain: "inloop-00.firebaseapp.com",
  projectId: "inloop-00",
  storageBucket: "inloop-00.firebasestorage.app",
  messagingSenderId: "517677803897",
  appId: "1:517677803897:web:b4369035514a1dc4f867a8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { 
    auth, db, provider, 
    signInWithPopup, signOut, onAuthStateChanged,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, // Exporting the new tools
    collection, addDoc, getDocs 
};