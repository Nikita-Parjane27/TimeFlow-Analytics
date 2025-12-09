/**
 * Authentication Module
 * Handles user authentication with Firebase
 */

const Auth = {
    currentUser: null,

    /**
     * Initialize authentication state listener
     */
    init() {
        firebaseAuth.onAuthStateChanged((user) => {
            this.currentUser = user;
            App.handleAuthStateChange(user);
        });
    },

    /**
     * Sign in with email and password
     */
    async signInWithEmail(email, password) {
        try {
            const result = await firebaseAuth.signInWithEmailAndPassword(email, password);
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    /**
     * Register with email and password
     */
    async registerWithEmail(email, password, displayName) {
        try {
            const result = await firebaseAuth.createUserWithEmailAndPassword(email, password);
            
            // Update profile with display name
            await result.user.updateProfile({ displayName });
            
            // Create user document in Firestore
            await firebaseDB.collection('users').doc(result.user.uid).set({
                displayName,
                email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        try {
            const result = await firebaseAuth.signInWithPopup(googleProvider);
            
            // Check if user document exists, if not create one
            const userDoc = await firebaseDB.collection('users').doc(result.user.uid).get();
            if (!userDoc.exists) {
                await firebaseDB.collection('users').doc(result.user.uid).set({
                    displayName: result.user.displayName,
                    email: result.user.email,
                    photoURL: result.user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Google sign in error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    /**
     * Sign out
     */
    async signOut() {
        try {
            await firebaseAuth.signOut();
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get user-friendly error message
     */
    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'This email is already registered. Try signing in.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/operation-not-allowed': 'This sign-in method is not enabled.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
            'auth/invalid-credential': 'Invalid credentials. Please try again.'
        };
        return errorMessages[errorCode] || 'An error occurred. Please try again.';
    }
};