
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  ref,
  set,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { auth, db } from "../firebase-config.js";

// HTML Elements
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const loginPanel = document.getElementById("loginPanel");
const signupPanel = document.getElementById("signupPanel");

const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");

const authMessage = document.getElementById("authMessage");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");

// Show Message
function showMessage(message, type = "error") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

// Hide Message
function hideMessage() {
  authMessage.textContent = "";
  authMessage.className = "auth-message";
}

// Loading Button
function setLoading(button, text) {
  button.disabled = true;
  button.innerHTML = `
    <span class="spinner-border spinner-border-sm"></span>
    ${text}
  `;
}

// Restore Button
function removeLoading(button, html) {
  button.disabled = false;
  button.innerHTML = html;
}

// Original Button Text
const loginButtonHTML = loginBtn.innerHTML;
const signupButtonHTML = signupBtn.innerHTML;

// Switch to Signup
showSignup.addEventListener("click", () => {
  loginPanel.classList.add("hidden");
  signupPanel.classList.remove("hidden");
  hideMessage();
});

// Switch to Login
showLogin.addEventListener("click", () => {
  signupPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  hideMessage();
});

// SIGNUP FUNCTION
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  if (!name || !email || !password) {
    showMessage("Please fill in all fields.");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.");
    return;
  }

  setLoading(signupBtn, "Creating Account...");
  hideMessage();

  try {
    // Create Firebase Authentication Account
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // Save user's name in Firebase Authentication profile
    await updateProfile(user, {
      displayName: name
    });

    // Save user information in Realtime Database
    await set(ref(db, "users/" + user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      createdAt: serverTimestamp(),
      status: "online"
    });

    showMessage("Account created successfully!", "success");

    // Redirect to Dashboard
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1000);

  } catch (error) {
    console.error("Signup Error:", error);

    let message = "Something went wrong. Please try again.";

    if (error.code === "auth/email-already-in-use") {
      message = "This email is already registered.";
    } else if (error.code === "auth/invalid-email") {
      message = "Please enter a valid email address.";
    } else if (error.code === "auth/weak-password") {
      message = "Please choose a stronger password.";
    } else if (error.code === "auth/network-request-failed") {
      message = "Network error. Check your internet connection.";
    } else if (error.code === "PERMISSION_DENIED" ||
               error.code === "database/permission-denied") {
      message = "Database permission denied. Check Firebase rules.";
    }

    showMessage(message);

  } finally {
    removeLoading(signupBtn, signupButtonHTML);
  }
});

// LOGIN FUNCTION
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showMessage("Please enter your email and password.");
    return;
  }

  setLoading(loginBtn, "Signing In...");
  hideMessage();

  try {
    await signInWithEmailAndPassword(auth, email, password);

    showMessage("Login successful! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);

  } catch (error) {
    console.error("Login Error:", error);

    let message = "Login failed. Please try again.";

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      message = "Incorrect email or password.";
    } else if (error.code === "auth/invalid-email") {
      message = "Please enter a valid email address.";
    } else if (error.code === "auth/too-many-requests") {
      message = "Too many attempts. Please try again later.";
    } else if (error.code === "auth/network-request-failed") {
      message = "Network error. Check your internet connection.";
    }

    showMessage(message);

  } finally {
    removeLoading(loginBtn, loginButtonHTML);
  }
});

// Redirect already logged-in users
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.endsWith("/index.html")) {
    window.location.href = "dashboard.html";
  }
});
