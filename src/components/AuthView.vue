<template>
  <div class="app-container" :class="{ 'light-mode': isLightMode }">
    <div class="notepad-container">
      <div class="notepad-content">
        <!-- Centered Header -->
        <div class="title-container">
          <h1 class="title">Black Notes</h1>
          <p class="subtitle">
            by <span class="editable-link">0fRedesign.tech</span>
          </p>
          <div class="tagline-container">
            <span class="tagline">#MinimalDistractions</span>
            <span class="tagline">#ClutterFree</span>
            <span class="tagline">#PureProductivity</span>
          </div>
        </div>

        <!-- Auth Form with Consistent Widths -->
        <div class="auth-form-container">
          <form @submit.prevent="handleSubmit" class="auth-form">
            <div class="form-group">
              <input 
                type="email" 
                v-model="email" 
                required 
                placeholder="your@email.com"
                class="auth-input"
              >
            </div>
            
            <div class="form-group">
              <input 
                type="password" 
                v-model="password" 
                required 
                placeholder="••••••••"
                minlength="6"
                class="auth-input"
              >
            </div>
            
            <div v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>
            
            <div class="auth-actions">
              <button 
                type="submit" 
                class="auth-btn"
                :disabled="isLoading"
              >
                {{ isLoginMode ? 'Login' : 'Sign Up' }}
              </button>
              
              <div class="divider">or</div>
              
              <button 
                class="google-btn"
                @click="signInWithGoogle"
                :disabled="isLoading"
              >
                <svg class="google-icon" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              
              <button 
                type="button" 
                class="auth-toggle" 
                @click="toggleMode"
                :disabled="isLoading"
              >
                {{ isLoginMode ? 'Create account' : 'Already have an account?' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../firebase';

export default {
  name: 'AuthView',
  emits: ['login'],
  setup(props, { emit }) {
    const email = ref('');
    const password = ref('');
    const isLoginMode = ref(true);
    const isLoading = ref(false);
    const errorMessage = ref('');
    const isLightMode = ref(false);
    
    const toggleMode = () => {
      isLoginMode.value = !isLoginMode.value;
      errorMessage.value = '';
    };
    
    const handleSubmit = async () => {
      isLoading.value = true;
      errorMessage.value = '';
      
      try {
        if (isLoginMode.value) {
          const userCredential = await signInWithEmailAndPassword(
            auth, 
            email.value, 
            password.value
          );
          emit('login', userCredential.user);
        } else {
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            email.value, 
            password.value
          );
          emit('login', userCredential.user);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        errorMessage.value = getErrorMessage(error.code);
      } finally {
        isLoading.value = false;
      }
    };

    const signInWithGoogle = async () => {
      isLoading.value = true;
      errorMessage.value = '';
      
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        emit('login', result.user);
      } catch (error) {
        console.error("Google sign-in error:", error);
        errorMessage.value = getErrorMessage(error.code);
      } finally {
        isLoading.value = false;
      }
    };
    
    const getErrorMessage = (code) => {
      switch (code) {
        case 'auth/email-already-in-use':
          return 'Email already in use';
        case 'auth/invalid-email':
          return 'Invalid email';
        case 'auth/weak-password':
          return 'Password should be at least 6 characters';
        case 'auth/user-not-found':
          return 'User not found';
        case 'auth/wrong-password':
          return 'Wrong password';
        case 'auth/operation-not-allowed':
          return 'Google sign-in is not enabled';
        case 'auth/popup-blocked':
          return 'Popup was blocked by your browser';
        case 'auth/popup-closed-by-user':
          return 'Sign in cancelled';
        default:
          return 'Authentication failed. Please try again.';
      }
    };
    
    return {
      email,
      password,
      isLoginMode,
      isLoading,
      errorMessage,
      isLightMode,
      toggleMode,
      handleSubmit,
      signInWithGoogle
    };
  }
}
</script>

<style scoped>
/* Base Styles */
.app-container {
  width: 100%;
  height: 100vh;
  background-color: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.2s ease;
}

.app-container.light-mode {
  background-color: #f5f5f5;
}

.notepad-container {
  background-color: #000;
  color: #fff;
  font-family: 'Product Sans', sans-serif;
  width: 100%;
  max-width: 600px; /* Constrain width */
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.app-container.light-mode .notepad-container {
  background-color: #fff;
  color: #333;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

.notepad-content {
  width: 100%;
}

/* Centered Header */
.title-container {
  text-align: center;
  margin-bottom: 2rem;
}

.title {
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.subtitle {
  font-size: clamp(1rem, 4vw, 1.25rem);
  margin: 0.5rem 0 0 0;
  color: rgba(255, 255, 255, 0.6);
}

.app-container.light-mode .subtitle {
  color: rgba(0, 0, 0, 0.6);
}

.editable-link {
  background-image: linear-gradient(to right, #4facfe, #a83279, #fc00ff);
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
}

.tagline-container {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.tagline {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
  font-family: 'Inter', sans-serif;
}

.app-container.light-mode .tagline {
  color: rgba(0, 0, 0, 0.4);
}

/* Auth Form */
.auth-form-container {
  width: 100%;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  width: 100%;
}

.auth-input {
  width: 100%;
  padding: 0.8rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  box-sizing: border-box;
}

.app-container.light-mode .auth-input {
  border: 1px solid rgba(0, 0, 0, 0.3);
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.auth-input:focus {
  outline: none;
  border-color: #4facfe;
}

/* Buttons */
.auth-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.auth-btn, .google-btn {
  width: 100%;
  padding: 0.8rem;
  border-radius: 4px;
  font-family: 'Product Sans', sans-serif;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.auth-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.app-container.light-mode .auth-btn {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.3);
}

.auth-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.app-container.light-mode .auth-btn:hover {
  background: rgba(0, 0, 0, 0.2);
}

.google-btn {
  background: #4285F4;
  color: white;
}

.google-btn:hover {
  background: #3367D6;
}

.google-icon {
  width: 20px;
  height: 20px;
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.6);
  margin: 0.5rem 0;
}

.app-container.light-mode .divider {
  color: rgba(0, 0, 0, 0.6);
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  margin: 0 0.5rem;
}

.app-container.light-mode .divider::before,
.app-container.light-mode .divider::after {
  border-bottom: 1px solid rgba(0, 0, 0, 0.3);
}

/* Toggle Link */
.auth-toggle {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: underline;
  padding: 0.5rem;
  margin-top: 0.5rem;
}

.app-container.light-mode .auth-toggle {
  color: rgba(0, 0, 0, 0.7);
}

.auth-toggle:hover {
  color: rgba(255, 255, 255, 1);
}

.app-container.light-mode .auth-toggle:hover {
  color: rgba(0, 0, 0, 1);
}

/* Error Message */
.error-message {
  color: #ff6b6b;
  font-size: 0.9rem;
  text-align: center;
  margin: 0.5rem 0;
}

/* Responsive */
@media (max-width: 600px) {
  .notepad-container {
    padding: 1.5rem;
    margin: 0 1rem;
  }
  
  .tagline-container {
    flex-direction: column;
    gap: 0.3rem;
  }
}
</style>