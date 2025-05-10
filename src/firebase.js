// Import only what you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQ6fTUAHkr0rfc_1HLiqso3wycPiN6h50",
  authDomain: "the-notepad-2e341.firebaseapp.com",
  projectId: "the-notepad-2e341",
  storageBucket: "the-notepad-2e341.appspot.com", // Fixed storageBucket format
  messagingSenderId: "228673451214",
  appId: "1:228673451214:web:d73c4a5d0df9b4a7dc8c9f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Export only what you'll use
export { auth, db };
