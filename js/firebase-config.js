// Firebase Configuration
// Replace with your own Firebase project credentials
// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCmXdjKaTMf3aLz7I6InKpOGRAwz06WNYk",
    authDomain: "timetracker-8db3e.firebaseapp.com",
    projectId: "timetracker-8db3e",
    storageBucket: "timetracker-8db3e.appspot.com",
    messagingSenderId: "915436160430",
    appId: "1:915436160430:web:12df08c8cbc06e384c343f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Export for use in other modules
window.firebaseAuth = auth;
window.firebaseDB = db;
window.googleProvider = googleProvider;