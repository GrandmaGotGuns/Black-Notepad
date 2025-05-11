// Import only what you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "secret",
  authDomain: "the-notepad-2e341.firebaseapp.com",
  projectId: "the-notepad-2e341",
  storageBucket: "the-notepad-2e341.appspot.com", // Fixed storageBucket format
  messagingSenderId: "..",
  appId: ".."
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Export only what you'll use
export { auth, db };
