<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api';
import BrandFooter from './BrandFooter.vue';

const props = defineProps({
  clientId: { type: String, default: null },
});

const reports = ref([]);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    reports.value = await api.getReports(props.clientId);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-bold text-gray-900">Performance Reports</h2>
      <p class="text-sm text-gray-500">Outcome-based transparency from Raccoon</p>
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
        <!-- Report Header -->
        <div class="border-b border-brand/10 pb-4 mb-5">
          <h3 class="text-xl font-bold text-gray-900 font-display">{{ report.title }}</h3>
          <p v-if="report.period" class="text-sm text-gray-600 mt-1">{{ report.period }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ new Date(report.createdAt).toLocaleDateString() }}</p>
        </div>

        <!-- Positives -->
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
              <svg class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span>{{ item }}</span>
            </li>
            <li v-if="!report.positives.length" class="text-sm text-gray-400 italic">No positives recorded</li>
          </ul>
        </div>

        <!-- Negatives -->
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
              <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
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
