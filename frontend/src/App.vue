<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuth } from './composables/useAuth';
import { api } from './api';
import AppNavbar from './components/AppNavbar.vue';
import LoginView from './views/LoginView.vue';
import CalendarView from './components/CalendarView.vue';
import ContentCreatorForm from './components/ContentCreatorForm.vue';
import StoryboardViewer from './components/StoryboardViewer.vue';
import ClientManagement from './components/ClientManagement.vue';
import ReportGenerator from './components/ReportGenerator.vue';
import ChangePasswordModal from './components/ChangePasswordModal.vue';

const { user, isAuthenticated, isAdmin, isClient, logout } = useAuth();

const adminTab = ref('calendar');
const clientTab = ref('calendar');

const calendarItems = ref([]);
const clients = ref([]);
const loading = ref(false);
const error = ref(null);

const showCreator = ref(false);
const showViewer = ref(false);
const showReportGen = ref(false);
const selectedDate = ref(null);
const selectedContentId = ref(null);
const editingContentId = ref(null);
const editingReport = ref(null);
const reportsKey = ref(0);
const selectedClientFilter = ref('');
const showChangePassword = ref(false);

const subtitle = computed(() => {
  if (isAdmin.value) return 'Creator Dashboard';
  return `Welcome, ${user.value?.clientName || 'Client'}`;
});

async function loadClients() {
  if (!isAdmin.value) return;
  try {
    clients.value = await api.getClients();
  } catch { /* non-critical */ }
}

async function loadCalendar() {
  loading.value = true;
  error.value = null;
  try {
    const filterId = isAdmin.value ? selectedClientFilter.value || undefined : undefined;
    calendarItems.value = await api.getCalendar(filterId);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function handleDayClick(date, items) {
  if (isAdmin.value && items.length === 0) {
    selectedDate.value = date;
    showCreator.value = true;
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

function handleEditContent(contentId) {
  editingContentId.value = contentId;
  showViewer.value = false;
  showCreator.value = true;
}

function handleContentSaved() {
  showCreator.value = false;
  editingContentId.value = null;
  selectedContentId.value = null;
  loadCalendar();
}

function handleContentDeleted() {
  showViewer.value = false;
  selectedContentId.value = null;
  loadCalendar();
}

function openNewReport() {
  editingReport.value = null;
  showReportGen.value = true;
}

function openEditReport(report) {
  editingReport.value = report;
  showReportGen.value = true;
}

function handleLogout() {
  logout();
}

onMounted(() => {
  if (isAuthenticated.value) {
    loadClients();
    loadCalendar();
  }
});

watch(isAuthenticated, (val) => {
  if (val) {
    loadClients();
    loadCalendar();
  }
});

watch(selectedClientFilter, () => {
  if (isAdmin.value) loadCalendar();
});
</script>

<template>
  <LoginView v-if="!isAuthenticated" @success="loadCalendar" />

  <div v-else class="min-h-screen bg-gray-50">
    <AppNavbar :subtitle="subtitle" @logout="handleLogout">
      <template #actions>
        <!-- Admin tabs -->
        <template v-if="isAdmin">
          <button
            v-for="tab in ['calendar', 'clients', 'reports']"
            :key="tab"
            @click="adminTab = tab"
            class="text-sm px-3 py-1.5 rounded-lg capitalize transition-colors"
            :class="adminTab === tab ? 'bg-brand text-white' : 'text-gray-600 hover:bg-brand-soft'"
          >
            {{ tab }}
          </button>
          <button v-if="adminTab === 'calendar'" @click="handleAddNew" class="btn-primary text-xs ml-1">+ Add New</button>
          <button v-if="adminTab === 'reports'" @click="openNewReport" class="btn-primary text-xs ml-1">+ Report</button>
        </template>

        <!-- Client tabs -->
        <template v-if="isClient">
          <button
            @click="clientTab = 'calendar'"
            class="text-sm px-3 py-1.5 rounded-lg transition-colors"
            :class="clientTab === 'calendar' ? 'bg-brand text-white' : 'text-gray-600 hover:bg-brand-soft'"
          >
            Calendar
          </button>
          <button
            @click="clientTab = 'reports'"
            class="text-sm px-3 py-1.5 rounded-lg transition-colors"
            :class="clientTab === 'reports' ? 'bg-brand text-white' : 'text-gray-600 hover:bg-brand-soft'"
          >
            Reports
          </button>
        </template>

        <button @click="showChangePassword = true" class="text-sm text-gray-500 hover:text-brand px-3 py-1.5 rounded-lg hover:bg-brand-soft">
          Password
        </button>
        <button @click="loadCalendar" class="p-2 text-gray-400 hover:text-brand rounded-lg" title="Refresh">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </template>
    </AppNavbar>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Admin: Calendar -->
      <template v-if="isAdmin && adminTab === 'calendar'">
        <div v-if="clients.length" class="mb-4 flex items-center gap-3">
          <label class="text-sm text-gray-600">Filter by client:</label>
          <select v-model="selectedClientFilter" class="input-field w-auto text-sm">
            <option value="">All clients</option>
            <option v-for="c in clients" :key="c.clientId" :value="c.clientId">{{ c.clientName }}</option>
          </select>
        </div>

        <div v-if="loading" class="py-24 text-center text-sm text-gray-500">Loading...</div>
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">{{ error }}</div>
        <CalendarView v-else :items="calendarItems" role="admin" @day-click="handleDayClick" @item-click="handleItemClick" />
      </template>

      <!-- Admin: Clients -->
      <ClientManagement v-if="isAdmin && adminTab === 'clients'" />

      <!-- Admin: Reports list -->
      <ClientReportsView
        v-if="isAdmin && adminTab === 'reports'"
        :key="reportsKey"
        :can-manage="true"
        @edit="openEditReport"
        @changed="reportsKey++"
      />

      <!-- Client: Calendar -->
      <template v-if="isClient && clientTab === 'calendar'">
        <div v-if="loading" class="py-24 text-center text-sm text-gray-500">Loading...</div>
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">{{ error }}</div>
        <CalendarView v-else :items="calendarItems" role="client" @item-click="handleItemClick" />
      </template>

      <!-- Client: Reports -->
      <ClientReportsView v-if="isClient && clientTab === 'reports'" :client-id="user?.clientId" />
    </main>

    <ContentCreatorForm
      v-if="showCreator && isAdmin"
      :initial-date="selectedDate"
      :initial-client-id="selectedClientFilter"
      :content-id="editingContentId"
      :clients="clients"
      @close="showCreator = false; editingContentId = null"
      @saved="handleContentSaved"
    />

    <StoryboardViewer
      v-if="showViewer"
      :content-id="selectedContentId"
      @close="showViewer = false; selectedContentId = null"
      @status-updated="showViewer = false; selectedContentId = null; loadCalendar()"
      @edit="handleEditContent"
      @deleted="handleContentDeleted"
    />

    <ReportGenerator
      v-if="showReportGen"
      :report="editingReport"
      @close="showReportGen = false; editingReport = null"
      @saved="showReportGen = false; editingReport = null; adminTab = 'reports'; reportsKey++"
    />

    <ChangePasswordModal
      v-if="showChangePassword"
      @close="showChangePassword = false"
      @success="showChangePassword = false"
    />
  </div>
</template>
