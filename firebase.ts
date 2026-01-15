import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import * as firestore from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZd4uNUeh2YBddmLbwuX2NjNAGq6L4HOc",
  authDomain: "smart-money-114b7.firebaseapp.com",
  projectId: "smart-money-114b7",
  storageBucket: "smart-money-114b7.firebasestorage.app",
  messagingSenderId: "822348606798",
  appId: "1:822348606798:web:18cb548f8ff284a07b421f",
  measurementId: "G-1G0Y3BWGWJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Firestore services
export const auth = getAuth(app);
export const db = firestore.getFirestore(app);
