import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Create React App only exposes variables prefixed with REACT_APP_.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// Analytics is optional and throws where unsupported (tests, SSR, some
// privacy browsers), so only start it when configured and supported.
if (firebaseConfig.measurementId) {
  isSupported().then((ok) => ok && getAnalytics(app)).catch(() => {});
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
