<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../api';

const props = defineProps({
  report: { type: Object, default: null },
});

const emit = defineEmits(['close', 'saved']);

const isEdit = computed(() => !!props.report?.reportId);
const clients = ref([]);
const loading = ref(true);
const saving = ref(false);
const error = ref(null);

const form = ref({
  clientId: '',
  title: '',
  contributors: '',
  period: '',
  positives: [''],
  negatives: [''],
});

onMounted(async () => {
  try {
    clients.value = await api.getClients();
    if (props.report) {
      form.value = {
        clientId: props.report.clientId,
        title: props.report.title,
        contributors: props.report.contributors || '',
        period: props.report.period || '',
        positives: props.report.positives?.length ? [...props.report.positives] : [''],
        negatives: props.report.negatives?.length ? [...props.report.negatives] : [''],
      };
    } else if (clients.value.length) {
      form.value.clientId = clients.value[0].clientId;
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});

function addItem(field) {
  form.value[field].push('');
}

function removeItem(field, index) {
  if (form.value[field].length > 1) form.value[field].splice(index, 1);
}

async function handleSubmit() {
  if (!form.value.clientId || !form.value.title) {
    error.value = 'Client and report title are required';
    return;
  }

  saving.value = true;
  error.value = null;
  try {
    const payload = {
      clientId: form.value.clientId,
      title: form.value.title,
      contributors: form.value.contributors.trim(),
      period: form.value.period,
      positives: form.value.positives.filter(Boolean),
      negatives: form.value.negatives.filter(Boolean),
    };

    if (isEdit.value) {
      payload.reportId = props.report.reportId;
      await api.updateReport(payload);
    } else {
      await api.createReport(payload);
    }
    emit('saved');
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div class="fixed inset-0 bg-black/40" @click="emit('close')" />
      <div class="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-900">
              {{ isEdit ? 'Edit Performance Report' : 'Generate Performance Report' }}
            </h2>
            <p class="text-sm text-gray-500">Monthly or campaign outcome summary for a client</p>
          </div>
          <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div class="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select v-model="form.clientId" class="input-field" :disabled="loading">
                <option v-for="c in clients" :key="c.clientId" :value="c.clientId">
                  {{ c.clientName }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <input v-model="form.period" class="input-field" placeholder="March 2026" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Report Title</label>
            <input v-model="form.title" class="input-field" placeholder="Q1 Campaign Performance" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contributors / Collaboration</label>
            <textarea
              v-model="form.contributors"
              rows="3"
              class="input-field resize-none"
              placeholder="Who collaborated on writing this report (e.g. account manager, creative team, client stakeholders)..."
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-green-800 mb-2">✓ Positives / Strengths</label>
            <div class="space-y-2">
              <div v-for="(_, i) in form.positives" :key="'p-' + i" class="flex gap-2">
                <input
                  v-model="form.positives[i]"
                  class="input-field border-green-200 focus:border-green-400"
                  placeholder="High engagement on Reels..."
                />
                <button v-if="form.positives.length > 1" @click="removeItem('positives', i)" class="text-red-400 px-2">×</button>
              </div>
            </div>
            <button @click="addItem('positives')" class="text-xs text-green-700 font-medium mt-2">+ Add positive</button>
          </div>

          <div>
            <label class="block text-sm font-semibold text-red-800 mb-2">△ Areas for Improvement</label>
            <div class="space-y-2">
              <div v-for="(_, i) in form.negatives" :key="'n-' + i" class="flex gap-2">
                <input
                  v-model="form.negatives[i]"
                  class="input-field border-red-200 focus:border-red-400"
                  placeholder="Lower reach on static posts..."
                />
                <button v-if="form.negatives.length > 1" @click="removeItem('negatives', i)" class="text-red-400 px-2">×</button>
              </div>
            </div>
            <button @click="addItem('negatives')" class="text-xs text-red-700 font-medium mt-2">+ Add improvement area</button>
          </div>

          <div v-if="error" class="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ error }}
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button @click="emit('close')" class="btn-secondary">Cancel</button>
          <button @click="handleSubmit" :disabled="saving || loading" class="btn-primary">
            {{ saving ? 'Saving...' : isEdit ? 'Update Report' : 'Generate Report' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
