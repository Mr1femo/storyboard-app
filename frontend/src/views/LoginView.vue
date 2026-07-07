<script setup>
import { ref } from 'vue';
import { api } from '../api';
import { useAuth } from '../composables/useAuth';

const emit = defineEmits(['success']);

const { login } = useAuth();

const mode = ref('login'); // login | forgot
const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(null);
const successMessage = ref(null);
const tempPassword = ref('');

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = 'Please enter username and password';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const session = await api.login(username.value, password.value);
    login(session);
    emit('success');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function handleForgotPassword() {
  if (!username.value) {
    error.value = 'Enter your username first';
    return;
  }

  loading.value = true;
  error.value = null;
  successMessage.value = null;
  tempPassword.value = '';

  try {
    const result = await api.forgotPassword(username.value);
    tempPassword.value = result.temporaryPassword;
    successMessage.value = result.message;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function switchToForgot() {
  mode.value = 'forgot';
  error.value = null;
  successMessage.value = null;
  tempPassword.value = '';
  password.value = '';
}

function switchToLogin() {
  mode.value = 'login';
  error.value = null;
  successMessage.value = null;
  tempPassword.value = '';
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-soft via-white to-orange-50 px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand text-white text-3xl font-extrabold font-display shadow-lg mb-4">
          R
        </div>
        <h1 class="text-3xl font-extrabold text-gray-900 font-display tracking-tight">Raccoon</h1>
        <p class="text-brand font-semibold text-sm mt-1 font-display italic">Ideas like a Raccoon!</p>
        <p class="text-gray-500 text-sm mt-4">Welcome to the Raccoon Client Portal</p>
      </div>

      <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <h2 class="text-lg font-bold text-gray-900 mb-6">
          {{ mode === 'login' ? 'Sign in to continue' : 'Reset your password' }}
        </h2>

        <!-- Login -->
        <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input v-model="username" type="text" autocomplete="username" class="input-field" placeholder="your username" />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-sm font-medium text-gray-700">Password</label>
              <button type="button" @click="switchToForgot" class="text-xs text-brand font-medium hover:underline">
                Forgot password?
              </button>
            </div>
            <input v-model="password" type="password" autocomplete="current-password" class="input-field" placeholder="••••••••" />
          </div>

          <div v-if="error" class="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ error }}
          </div>

          <button type="submit" :disabled="loading" class="btn-primary w-full py-3">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <!-- Forgot password -->
        <div v-else class="space-y-4">
          <p class="text-sm text-gray-600">
            Enter your username and we'll generate a temporary password. Sign in with it, then change your password from the dashboard.
          </p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input v-model="username" type="text" class="input-field" placeholder="your username" />
          </div>

          <div v-if="error" class="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ error }}
          </div>

          <div v-if="successMessage" class="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 space-y-2">
            <p>{{ successMessage }}</p>
            <p v-if="tempPassword" class="font-mono font-bold text-base bg-white px-3 py-2 rounded border border-green-300 select-all">
              {{ tempPassword }}
            </p>
            <p class="text-xs text-green-700">Copy this password now — it won't be shown again.</p>
          </div>

          <button @click="handleForgotPassword" :disabled="loading" class="btn-primary w-full py-3">
            {{ loading ? 'Generating...' : 'Generate Temporary Password' }}
          </button>

          <button type="button" @click="switchToLogin" class="w-full text-sm text-gray-500 hover:text-brand py-2">
            ← Back to sign in
          </button>
        </div>

        <p v-if="mode === 'login'" class="text-xs text-gray-400 text-center mt-6">
          Default admin: <span class="font-mono">admin</span> / <span class="font-mono">raccoon2024</span>
        </p>
      </div>

      <p class="text-center text-xs text-gray-400 mt-6">Powered by Raccoon — Ideas like a Raccoon!</p>
    </div>
  </div>
</template>
