// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWSaEDzHKUKvIPyk-8eu17-LhvKYGecXw",
  authDomain: "ai-project-3d64e.firebaseapp.com",
  projectId: "ai-project-3d64e",
  storageBucket: "ai-project-3d64e.appspot.com",
  messagingSenderId: "722511559358",
  appId: "1:722511559358:web:43e1c663e948cedd333cef",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
