<script setup>
import { ref } from 'vue';
import { api } from '../api';

const emit = defineEmits(['close', 'success']);

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref(null);

async function handleSubmit() {
  if (!currentPassword.value || !newPassword.value) {
    error.value = 'Please fill in all fields';
    return;
  }
  if (newPassword.value.length < 6) {
    error.value = 'New password must be at least 6 characters';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'New passwords do not match';
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    await api.changePassword(currentPassword.value, newPassword.value);
    emit('success');
    emit('close');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/40" @click="emit('close')" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 class="text-lg font-bold text-gray-900 mb-1">Change Password</h2>
        <p class="text-sm text-gray-500 mb-5">Update your account password</p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input v-model="currentPassword" type="password" class="input-field" autocomplete="current-password" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input v-model="newPassword" type="password" class="input-field" autocomplete="new-password" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input v-model="confirmPassword" type="password" class="input-field" autocomplete="new-password" />
          </div>

          <div v-if="error" class="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ error }}
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <button @click="emit('close')" class="btn-secondary">Cancel</button>
          <button @click="handleSubmit" :disabled="loading" class="btn-primary">
            {{ loading ? 'Saving...' : 'Update Password' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
