<script setup>
import { ref } from 'vue';
import { api } from '../api';
import { useAuth } from '../composables/useAuth';

const emit = defineEmits(['success']);

const { login } = useAuth();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(null);

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
        <h2 class="text-lg font-bold text-gray-900 mb-6">Sign in to continue</h2>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input v-model="username" type="text" autocomplete="username" class="input-field" placeholder="your username" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input v-model="password" type="password" autocomplete="current-password" class="input-field" placeholder="••••••••" />
          </div>

          <div v-if="error" class="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ error }}
          </div>

          <button type="submit" :disabled="loading" class="btn-primary w-full py-3">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
      </div>

      <p class="text-center text-xs text-gray-400 mt-6">Powered by Raccoon — Ideas like a Raccoon!</p>
    </div>
  </div>
</template>
