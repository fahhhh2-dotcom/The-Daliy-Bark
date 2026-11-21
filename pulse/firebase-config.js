// Pulse — Firebase settings for the "pulse-d6322" project.
// These values are safe to put on a public website — your
// security rules (firestore.rules / storage.rules) protect the data.
export const firebaseConfig = {
  apiKey: "AIzaSyARAjw_9Ve5vnNlvaBqToDpfxO9TAqTmfY",
  authDomain: "pulse-d6322.firebaseapp.com",
  projectId: "pulse-d6322",
  storageBucket: "pulse-d6322.firebasestorage.app",
  messagingSenderId: "267062353045",
  appId: "1:267062353045:web:4a49b79fce609bcd0f8f9c",
  measurementId: "G-T2G1C4YJ62"
};

// Photos & videos need Firebase Storage (SETUP-GUIDE.md, step 6).
// Leave this false until Storage is turned on: photos will still work
// (saved small, inside the database) and the Video button is hidden.
export const storageEnabled = false;
