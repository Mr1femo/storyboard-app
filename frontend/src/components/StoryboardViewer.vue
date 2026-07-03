<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../api';
import { getDriveImageUrl } from '../utils/driveImage';

const props = defineProps({
  contentId: { type: String, required: true },
  role: { type: String, default: 'client' },
});

const emit = defineEmits(['close', 'status-updated']);

const loading = ref(true);
const error = ref(null);
const storyboard = ref(null);

const showRejectForm = ref(false);
const rejectFeedback = ref('');
const submitting = ref(false);
const actionError = ref(null);

const projectTitle = computed(() => {
  if (!storyboard.value) return '';
  const c = storyboard.value.content;
  return `${c.platform} — ${c.caption?.slice(0, 40) || c.contentType}${c.caption?.length > 40 ? '...' : ''}`;
});

async function loadStoryboard() {
  loading.value = true;
  error.value = null;
  try {
    storyboard.value = await api.getStoryboard(props.contentId);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function handleApprove() {
  submitting.value = true;
  actionError.value = null;
  try {
    await api.updateStatus(props.contentId, 'Approved');
    emit('status-updated');
  } catch (e) {
    actionError.value = e.message;
  } finally {
    submitting.value = false;
  }
}

async function handleReject() {
  if (!rejectFeedback.value.trim()) {
    actionError.value = 'Please provide feedback for the rejection';
    return;
  }
  submitting.value = true;
  actionError.value = null;
  try {
    await api.updateStatus(props.contentId, 'Rejected', rejectFeedback.value.trim());
    emit('status-updated');
  } catch (e) {
    actionError.value = e.message;
  } finally {
    submitting.value = false;
  }
}

const statusBadge = computed(() => {
  if (!storyboard.value) return {};
  const status = storyboard.value.content.status;
  const map = {
    Pending: 'bg-amber-100 text-amber-800 border-amber-200',
    Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Rejected: 'bg-red-100 text-red-800 border-red-200',
  };
  return map[status] || map.Pending;
});

onMounted(loadStoryboard);

function frameImageSrc(url) {
  return getDriveImageUrl(url);
}

function onImageError(event, frame) {
  const src = event.target.src;
  const idMatch = frame.imageUrl?.match(/[?&]id=([^&]+)/) || frame.imageUrl?.match(/\/d\/([^/]+)/);
  if (idMatch && !src.includes('uc?export=view')) {
    event.target.src = `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex flex-col bg-gray-100">
      <!-- Top Bar -->
      <div class="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <button
          @click="emit('close')"
          class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Calendar
        </button>
        <span
          v-if="storyboard"
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
          :class="statusBadge"
        >
          {{ storyboard.content.status }}
        </span>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
          <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p class="text-sm text-gray-500">Loading storyboard...</p>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex-1 flex items-center justify-center p-6">
        <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <p class="text-red-700 font-medium">Failed to load storyboard</p>
          <p class="text-red-600 text-sm mt-1">{{ error }}</p>
          <button
            @click="loadStoryboard"
            class="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>

      <!-- Storyboard Content -->
      <div v-else-if="storyboard" class="flex-1 overflow-y-auto pb-28">
        <div class="max-w-7xl mx-auto">
          <!-- Header Section -->
          <div class="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <h1 class="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              {{ projectTitle }}
            </h1>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-gray-600">
              <span class="font-medium">{{ storyboard.content.contentType }}</span>
              <span class="text-gray-300">|</span>
              <span>{{ storyboard.content.duration || 'N/A' }}</span>
              <span class="text-gray-300">|</span>
              <span>{{ storyboard.content.castPeople || 'N/A' }}</span>
              <span class="text-gray-300">|</span>
              <span>{{ storyboard.content.mood || 'N/A' }}</span>
            </div>
          </div>

          <!-- Storyboard Grid -->
          <div
            v-if="storyboard.frames.length === 0"
            class="bg-white border-b border-gray-200 px-6 py-16 text-center"
          >
            <p class="text-gray-500 text-sm">No storyboard frames found for this content.</p>
          </div>
          <div
            v-else
            class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 border-b border-gray-200"
          >
            <div
              v-for="frame in storyboard.frames"
              :key="frame.frameId || frame.frameNumber"
              class="border-r border-b border-gray-200 bg-white flex flex-col"
            >
              <!-- Frame Number -->
              <div class="px-3 py-2 border-b border-gray-200">
                <span class="text-xs font-bold text-gray-500">
                  #{{ String(frame.frameNumber).padStart(2, '0') }}
                </span>
              </div>

              <!-- Scene Title -->
              <div class="px-3 py-2 border-b border-gray-200 text-center">
                <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  {{ frame.sceneTitle || 'UNTITLED' }}
                </h3>
              </div>

              <!-- Image -->
              <div class="aspect-[4/3] border-b border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                <img
                  v-if="frame.imageUrl"
                  :src="frameImageSrc(frame.imageUrl)"
                  :alt="frame.sceneTitle"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  @error="onImageError($event, frame)"
                />
                <div v-else class="text-gray-300 text-center p-4">
                  <svg class="w-12 h-12 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-[10px]">No image</span>
                </div>
              </div>

              <!-- Arabic Description -->
              <div class="px-3 py-3 flex-1 border-b border-gray-200" dir="rtl">
                <p class="text-sm text-gray-700 font-arabic leading-relaxed">
                  {{ frame.arDescription || '—' }}
                </p>
              </div>

              <!-- Lens/Shot Specs -->
              <div class="px-3 py-2 bg-gray-50">
                <p class="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                  {{ frame.lensTechSpecs || 'N/A' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Footer Section (3 Columns) -->
          <div class="grid grid-cols-1 md:grid-cols-3 bg-white">
            <!-- Editing Sequence Timeline -->
            <div class="p-4 sm:p-6 border-r border-b md:border-b-0 border-gray-200">
              <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Editing Sequence
              </h4>
              <div class="flex flex-wrap items-center gap-1">
                <template v-for="(step, index) in storyboard.footer.editingSequence" :key="'step-' + index">
                  <span class="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100">
                    {{ step }}
                  </span>
                  <svg
                    v-if="index < storyboard.footer.editingSequence.length - 1"
                    class="w-4 h-4 text-gray-300 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </template>
                <span v-if="!storyboard.footer.editingSequence.length" class="text-sm text-gray-400">No steps defined</span>
              </div>
            </div>

            <!-- B-Roll Ideas (Arabic) -->
            <div class="p-4 sm:p-6 border-r border-b md:border-b-0 border-gray-200" dir="rtl">
              <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-left" dir="ltr">
                Important B-Roll Ideas
              </h4>
              <ul class="space-y-2">
                <li
                  v-for="(note, index) in storyboard.footer.bRollNotes"
                  :key="'broll-' + index"
                  class="flex items-start gap-2 text-sm text-gray-700 font-arabic"
                >
                  <span class="text-indigo-400 mt-1 flex-shrink-0">•</span>
                  <span>{{ note }}</span>
                </li>
                <li v-if="!storyboard.footer.bRollNotes.length" class="text-sm text-gray-400 font-sans" dir="ltr">
                  No B-Roll notes
                </li>
              </ul>
            </div>

            <!-- Production Notes -->
            <div class="p-4 sm:p-6">
              <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Production Notes
              </h4>
              <ul class="space-y-2">
                <li
                  v-for="(note, index) in storyboard.footer.productionNotes"
                  :key="'prod-' + index"
                  class="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span class="text-indigo-400 mt-1 flex-shrink-0">•</span>
                  <span>{{ note }}</span>
                </li>
                <li v-if="!storyboard.footer.productionNotes.length" class="text-sm text-gray-400">
                  No production notes
                </li>
              </ul>
            </div>
          </div>

          <!-- Existing Client Feedback -->
          <div
            v-if="storyboard.content.clientFeedback"
            class="mx-4 sm:mx-6 my-4 p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <p class="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Previous Feedback</p>
            <p class="text-sm text-red-600">{{ storyboard.content.clientFeedback }}</p>
          </div>
        </div>
      </div>

      <!-- Client Action Bar (Sticky Footer) -->
      <div
        v-if="storyboard && role === 'client' && storyboard.content.status === 'Pending'"
        class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div v-if="actionError" class="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {{ actionError }}
          </div>

          <div v-if="!showRejectForm" class="flex items-center justify-end gap-3">
            <button
              @click="showRejectForm = true"
              :disabled="submitting"
              class="px-6 py-2.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
            <button
              @click="handleApprove"
              :disabled="submitting"
              class="px-8 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {{ submitting ? 'Processing...' : 'Approve' }}
            </button>
          </div>

          <div v-else class="space-y-3">
            <label class="block text-sm font-medium text-gray-700">
              Required Modifications
            </label>
            <textarea
              v-model="rejectFeedback"
              rows="3"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              placeholder="Please describe the changes you'd like..."
            />
            <div class="flex items-center justify-end gap-3">
              <button
                @click="showRejectForm = false; rejectFeedback = ''; actionError = null"
                class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                @click="handleReject"
                :disabled="submitting"
                class="px-6 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {{ submitting ? 'Submitting...' : 'Submit Rejection' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
