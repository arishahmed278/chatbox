
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAlcgdkcPp0RwZTNvgGMyDg6_HBdsjUcj4",
  authDomain: "chatbox-8c129.firebaseapp.com",
  databaseURL: "https://chatbox-8c129-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "chatbox-8c129",
  storageBucket: "chatbox-8c129.firebasestorage.app",
  messagingSenderId: "443508010368",
  appId: "1:443508010368:web:17bb76a4e2a2b24807a565"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getDatabase(app);

export { app, auth, db };
