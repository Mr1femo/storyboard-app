<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';
import BrandFooter from './BrandFooter.vue';

const props = defineProps({
  clientId: { type: String, default: null },
  canManage: { type: Boolean, default: false },
});

const emit = defineEmits(['edit', 'changed']);

const reports = ref([]);
const loading = ref(true);
const error = ref(null);
const busyId = ref(null);

async function loadReports() {
  loading.value = true;
  error.value = null;
  try {
    reports.value = await api.getReports(props.clientId);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function handleDelete(reportId) {
  if (!confirm('Delete this report permanently?')) return;
  busyId.value = reportId;
  try {
    await api.deleteReport(reportId);
    await loadReports();
    emit('changed');
  } catch (e) {
    error.value = e.message;
  } finally {
    busyId.value = null;
  }
}

onMounted(loadReports);

defineExpose({ reload: loadReports });
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-gray-900">Performance Reports</h2>
        <p class="text-sm text-gray-500">Outcome-based transparency from Raccoon</p>
      </div>
      <button v-if="canManage" @click="loadReports" class="btn-secondary text-xs">Refresh</button>
    </div>

    <div v-if="loading" class="py-16 text-center text-sm text-gray-500">Loading reports...</div>

    <div v-else-if="error" class="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
      {{ error }}
    </div>

    <div v-else-if="reports.length === 0" class="card-brand text-center py-12">
      <p class="text-gray-600">No reports yet. Your agency will publish performance summaries here.</p>
    </div>

    <div v-else class="space-y-6">
      <article
        v-for="report in reports"
        :key="report.reportId"
        class="card-brand shadow-sm overflow-hidden"
      >
        <div class="border-b border-brand/10 pb-4 mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 class="text-xl font-bold text-gray-900 font-display">{{ report.title }}</h3>
            <p v-if="report.period" class="text-sm text-gray-600 mt-1">{{ report.period }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ new Date(report.createdAt).toLocaleDateString() }}</p>
          </div>
          <div v-if="canManage" class="flex gap-2 flex-shrink-0">
            <button @click="emit('edit', report)" class="btn-secondary text-xs">Edit</button>
            <button
              @click="handleDelete(report.reportId)"
              :disabled="busyId === report.reportId"
              class="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg"
            >
              {{ busyId === report.reportId ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>

        <p
          v-if="report.contributors"
          class="mb-5 text-sm text-gray-700 leading-relaxed whitespace-pre-line px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg"
        >
          {{ report.contributors }}
        </p>

        <div class="mb-5">
          <h4 class="text-sm font-bold text-green-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Positives & Strengths
          </h4>
          <ul class="space-y-2">
            <li
              v-for="(item, i) in report.positives"
              :key="'p-' + i"
              class="flex items-start gap-3 px-4 py-3 bg-green-50 border-l-4 border-green-400 text-green-800 rounded-r-lg text-sm"
            >
              <span>{{ item }}</span>
            </li>
            <li v-if="!report.positives.length" class="text-sm text-gray-400 italic">No positives recorded</li>
          </ul>
        </div>

        <div>
          <h4 class="text-sm font-bold text-red-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Areas for Improvement
          </h4>
          <ul class="space-y-2">
            <li
              v-for="(item, i) in report.negatives"
              :key="'n-' + i"
              class="flex items-start gap-3 px-4 py-3 bg-red-50 border-l-4 border-red-400 text-red-800 rounded-r-lg text-sm"
            >
              <span>{{ item }}</span>
            </li>
            <li v-if="!report.negatives.length" class="text-sm text-gray-400 italic">No improvement areas recorded</li>
          </ul>
        </div>

        <BrandFooter class="mt-6 pt-4 border-t border-brand/10" />
      </article>
    </div>
  </div>
</template>
