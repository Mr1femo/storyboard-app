<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';

const clients = ref([]);
const loading = ref(true);
const error = ref(null);
const saving = ref(false);
const showForm = ref(false);
const editingId = ref(null);

const form = ref({
  clientName: '',
  username: '',
  password: '',
  folderId: '',
});

async function loadClients() {
  loading.value = true;
  error.value = null;
  try {
    clients.value = await api.getClients();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  form.value = { clientName: '', username: '', password: '', folderId: '' };
  showForm.value = true;
}

function openEdit(client) {
  editingId.value = client.clientId;
  form.value = {
    clientName: client.clientName,
    username: client.username,
    password: '',
    folderId: client.folderId,
  };
  showForm.value = true;
}

async function handleSave() {
  saving.value = true;
  error.value = null;
  try {
    if (editingId.value) {
      const payload = { clientId: editingId.value, ...form.value };
      if (!payload.password) delete payload.password;
      await api.updateClient(payload);
    } else {
      await api.createClient(form.value);
    }
    showForm.value = false;
    await loadClients();
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}

async function handleDelete(clientId) {
  if (!confirm('Delete this client account?')) return;
  try {
    await api.deleteClient(clientId);
    await loadClients();
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(loadClients);
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <div>
        <h2 class="text-lg font-bold text-gray-900">Client Accounts</h2>
        <p class="text-sm text-gray-500">Manage client logins and Drive folder isolation</p>
      </div>
      <button @click="openCreate" class="btn-primary">
        + Add Client
      </button>
    </div>

    <div v-if="error" class="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      {{ error }}
    </div>

    <div v-if="loading" class="py-16 text-center text-sm text-gray-500">Loading clients...</div>

    <div v-else-if="clients.length === 0" class="py-16 text-center text-sm text-gray-500">
      No clients yet. Create your first client account.
    </div>

    <div v-else class="divide-y divide-gray-100">
      <div
        v-for="client in clients"
        :key="client.clientId"
        class="px-6 py-4 flex items-center justify-between hover:bg-brand-soft/30 transition-colors"
      >
        <div>
          <p class="font-semibold text-gray-900">{{ client.clientName }}</p>
          <p class="text-sm text-gray-500">{{ client.username }}</p>
          <p class="text-xs text-gray-400 mt-0.5 font-mono">Folder: {{ client.folderId }}</p>
        </div>
        <div class="flex gap-2">
          <button @click="openEdit(client)" class="btn-secondary text-xs">Edit</button>
          <button
            @click="handleDelete(client.clientId)"
            class="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40" @click="showForm = false" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-4">
            {{ editingId ? 'Edit Client' : 'New Client Account' }}
          </h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input v-model="form.clientName" class="input-field" placeholder="Acme Corp" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
              <input v-model="form.username" class="input-field" placeholder="client@email.com" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Password {{ editingId ? '(leave blank to keep)' : '' }}
              </label>
              <input v-model="form.password" type="password" class="input-field" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Google Drive Folder ID</label>
              <input v-model="form.folderId" class="input-field font-mono text-xs" placeholder="1abc..." />
              <p class="text-xs text-gray-400 mt-1">Images & workspace isolated to this folder</p>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <button @click="showForm = false" class="btn-secondary">Cancel</button>
            <button @click="handleSave" :disabled="saving" class="btn-primary">
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
