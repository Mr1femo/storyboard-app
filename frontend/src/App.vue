<script setup>
import { ref, computed, onMounted } from 'vue';
import CalendarView from './components/CalendarView.vue';
import ContentCreatorForm from './components/ContentCreatorForm.vue';
import StoryboardViewer from './components/StoryboardViewer.vue';
import { api } from './api';

const role = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('role') === 'client' ? 'client' : 'admin';
});

const calendarItems = ref([]);
const loading = ref(true);
const error = ref(null);

const showCreator = ref(false);
const showViewer = ref(false);
const selectedDate = ref(null);
const selectedContentId = ref(null);
const editingContentId = ref(null);

async function loadCalendar() {
  loading.value = true;
  error.value = null;
  try {
    calendarItems.value = await api.getCalendar();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function handleDayClick(date, items) {
  if (role.value === 'admin') {
    if (items.length === 0) {
      selectedDate.value = date;
      editingContentId.value = null;
      showCreator.value = true;
    }
  }
}

function handleItemClick(item) {
  selectedContentId.value = item.id;
  showViewer.value = true;
}

function handleAddNew() {
  selectedDate.value = new Date().toISOString().slice(0, 10);
  editingContentId.value = null;
  showCreator.value = true;
}

function handleCreatorClose() {
  showCreator.value = false;
  selectedDate.value = null;
  editingContentId.value = null;
}

function handleCreatorSaved() {
  showCreator.value = false;
  selectedDate.value = null;
  editingContentId.value = null;
  loadCalendar();
}

function handleViewerClose() {
  showViewer.value = false;
  selectedContentId.value = null;
}

function handleStatusUpdated() {
  showViewer.value = false;
  selectedContentId.value = null;
  loadCalendar();
}

onMounted(loadCalendar);
</script>

<template>
  <div class="min-h-screen">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900 tracking-tight">
            Content Calendar & Storyboard
          </h1>
          <p class="text-sm text-gray-500 mt-0.5">
            {{ role === 'admin' ? 'Creator Dashboard' : 'Client Review Portal' }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
            :class="role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'"
          >
            {{ role === 'admin' ? 'Admin' : 'Client' }}
          </span>
          <button
            v-if="role === 'admin'"
            @click="handleAddNew"
            class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add New
          </button>
          <button
            @click="loadCalendar"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="loading" class="flex items-center justify-center py-24">
        <div class="flex flex-col items-center gap-3">
          <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p class="text-sm text-gray-500">Loading calendar...</p>
        </div>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p class="text-red-700 font-medium">Failed to load data</p>
        <p class="text-red-600 text-sm mt-1">{{ error }}</p>
        <button
          @click="loadCalendar"
          class="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>

      <CalendarView
        v-else
        :items="calendarItems"
        :role="role"
        @day-click="handleDayClick"
        @item-click="handleItemClick"
      />
    </main>

    <!-- Modals -->
    <ContentCreatorForm
      v-if="showCreator && role === 'admin'"
      :initial-date="selectedDate"
      :content-id="editingContentId"
      @close="handleCreatorClose"
      @saved="handleCreatorSaved"
    />

    <StoryboardViewer
      v-if="showViewer"
      :content-id="selectedContentId"
      :role="role"
      @close="handleViewerClose"
      @status-updated="handleStatusUpdated"
    />
  </div>
</template>
