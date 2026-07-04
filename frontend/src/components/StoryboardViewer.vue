<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../api';
import { getDriveImageUrl } from '../utils/driveImage';
import BrandFooter from './BrandFooter.vue';
import { useAuth } from '../composables/useAuth';

const props = defineProps({
  contentId: { type: String, required: true },
});

const emit = defineEmits(['close', 'status-updated', 'edit', 'deleted']);
const { isClient, isAdmin } = useAuth();
const canReview = computed(() => isClient.value || isAdmin.value);

const loading = ref(true);
const error = ref(null);
const storyboard = ref(null);
const showRejectForm = ref(false);
const rejectFeedback = ref('');
const submitting = ref(false);
const actionError = ref(null);
const editingFeedback = ref(false);
const feedbackDraft = ref('');

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

function startEditFeedback() {
  feedbackDraft.value = storyboard.value?.content?.clientFeedback || '';
  editingFeedback.value = true;
}

async function saveFeedback() {
  submitting.value = true;
  actionError.value = null;
  try {
    await api.updateFeedback({
      contentId: props.contentId,
      clientFeedback: feedbackDraft.value.trim(),
      status: feedbackDraft.value.trim() ? 'Rejected' : 'Pending',
      resetToPending: !feedbackDraft.value.trim(),
    });
    editingFeedback.value = false;
    await loadStoryboard();
  } catch (e) {
    actionError.value = e.message;
  } finally {
    submitting.value = false;
  }
}

async function clearFeedback() {
  if (!confirm('Clear client feedback and set status to Pending?')) return;
  submitting.value = true;
  actionError.value = null;
  try {
    await api.updateFeedback({
      contentId: props.contentId,
      clientFeedback: '',
      status: 'Pending',
      resetToPending: true,
    });
    await loadStoryboard();
  } catch (e) {
    actionError.value = e.message;
  } finally {
    submitting.value = false;
  }
}

async function handleDelete() {
  if (!confirm('Delete this content and its storyboard permanently?')) return;
  submitting.value = true;
  actionError.value = null;
  try {
    await api.deleteContent(props.contentId);
    emit('deleted');
  } catch (e) {
    actionError.value = e.message;
  } finally {
    submitting.value = false;
  }
}

const statusBadge = computed(() => {
  if (!storyboard.value) return {};
  const map = {
    Pending: 'bg-amber-100 text-amber-800 border-amber-200',
    Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Rejected: 'bg-red-100 text-red-800 border-red-200',
  };
  return map[storyboard.value.content.status] || map.Pending;
});

function frameImageSrc(url) {
  return getDriveImageUrl(url);
}

function onImageError(event, frame) {
  const idMatch = frame.imageUrl?.match(/[?&]id=([^&]+)/) || frame.imageUrl?.match(/\/d\/([^/]+)/);
  if (idMatch && !event.target.src.includes('uc?export=view')) {
    event.target.src = `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  }
}

onMounted(loadStoryboard);
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex flex-col bg-gray-50">
      <!-- Top Bar -->
      <div class="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-gray-200 shadow-sm gap-3">
        <button @click="emit('close')" class="flex items-center gap-2 text-sm text-gray-600 hover:text-brand transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Calendar
        </button>
        <div class="flex items-center gap-2">
          <template v-if="isAdmin && storyboard">
            <button @click="emit('edit', props.contentId)" class="btn-secondary text-xs">Edit</button>
            <button @click="handleDelete" :disabled="submitting" class="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg">
              Delete
            </button>
          </template>
          <span v-if="storyboard" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border" :class="statusBadge">
            {{ storyboard.content.status }}
          </span>
        </div>
      </div>

      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>

      <div v-else-if="error" class="flex-1 flex items-center justify-center p-6">
        <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <p class="text-red-700 font-medium">{{ error }}</p>
          <button @click="loadStoryboard" class="mt-4 btn-primary">Retry</button>
        </div>
      </div>

      <div v-else-if="storyboard" class="flex-1 overflow-y-auto pb-28">
        <div class="max-w-7xl mx-auto">

          <!-- ═══ TOP: Idea Details ═══ -->
          <section class="bg-white border-b border-gray-200 px-4 sm:px-8 py-8">
            <p class="text-xs font-bold text-brand uppercase tracking-widest mb-3">Content Concept</p>

            <div class="flex flex-wrap gap-3 mb-6">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-brand text-white">
                {{ storyboard.content.platform }}
              </span>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-soft text-gray-900 border border-brand/20">
                {{ storyboard.content.contentType }}
              </span>
              <span v-if="storyboard.content.duration" class="text-sm text-gray-500">
                Duration: {{ storyboard.content.duration }}
              </span>
              <span v-if="storyboard.content.castPeople" class="text-sm text-gray-500">
                Cast: {{ storyboard.content.castPeople }}
              </span>
              <span v-if="storyboard.content.mood" class="text-sm text-gray-500">
                Mood: {{ storyboard.content.mood }}
              </span>
            </div>

            <div class="space-y-6">
              <div>
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Caption</h3>
                <p class="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">{{ storyboard.content.caption || '—' }}</p>
              </div>
              <div>
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Script</h3>
                <p class="text-base text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">{{ storyboard.content.script || '—' }}</p>
              </div>
            </div>
          </section>

          <!-- ═══ BOTTOM: Storyboard ═══ -->
          <section class="mt-2">
            <div class="bg-brand-soft px-4 sm:px-8 py-3 border-b border-brand/10">
              <h2 class="text-sm font-bold text-gray-900 uppercase tracking-wider">Visual Storyboard</h2>
            </div>

            <div v-if="storyboard.frames.length === 0" class="bg-white px-6 py-16 text-center">
              <p class="text-gray-500 text-sm">No storyboard frames found.</p>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 border-b border-gray-200">
              <div
                v-for="frame in storyboard.frames"
                :key="frame.frameId || frame.frameNumber"
                class="border-r border-b border-gray-200 bg-white flex flex-col"
              >
                <div class="px-3 py-2 border-b border-gray-200">
                  <span class="text-xs font-bold text-brand">#{{ String(frame.frameNumber).padStart(2, '0') }}</span>
                </div>
                <div class="px-3 py-2 border-b border-gray-200 text-center">
                  <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide">{{ frame.sceneTitle || 'UNTITLED' }}</h3>
                </div>
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
                  <div v-else class="text-gray-300 text-center p-4 text-[10px]">No image</div>
                </div>
                <div class="px-3 py-3 flex-1 border-b border-gray-200" dir="rtl">
                  <p class="text-sm text-gray-700 font-arabic leading-relaxed">{{ frame.arDescription || '—' }}</p>
                </div>
                <div class="px-3 py-2 bg-gray-50">
                  <p class="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{{ frame.lensTechSpecs || 'N/A' }}</p>
                </div>
              </div>
            </div>

            <!-- Footer columns -->
            <div class="grid grid-cols-1 md:grid-cols-3 bg-white border-b border-gray-200">
              <div class="p-4 sm:p-6 border-r border-b md:border-b-0 border-gray-200">
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Editing Sequence</h4>
                <div class="flex flex-wrap items-center gap-1">
                  <template v-for="(step, index) in storyboard.footer.editingSequence" :key="'step-' + index">
                    <span class="inline-flex items-center px-2.5 py-1 bg-brand-soft text-brand text-xs font-medium rounded-md border border-brand/20">{{ step }}</span>
                    <svg v-if="index < storyboard.footer.editingSequence.length - 1" class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </template>
                  <span v-if="!storyboard.footer.editingSequence.length" class="text-sm text-gray-400">No steps defined</span>
                </div>
              </div>
              <div class="p-4 sm:p-6 border-r border-b md:border-b-0 border-gray-200" dir="rtl">
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-left" dir="ltr">Important B-Roll Ideas</h4>
                <ul class="space-y-2">
                  <li v-for="(note, index) in storyboard.footer.bRollNotes" :key="'b-' + index" class="flex items-start gap-2 text-sm text-gray-700 font-arabic">
                    <span class="text-brand mt-1">•</span><span>{{ note }}</span>
                  </li>
                </ul>
              </div>
              <div class="p-4 sm:p-6">
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Production Notes</h4>
                <ul class="space-y-2">
                  <li v-for="(note, index) in storyboard.footer.productionNotes" :key="'p-' + index" class="flex items-start gap-2 text-sm text-gray-700">
                    <span class="text-brand mt-1">•</span><span>{{ note }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <!-- Feedback section -->
          <div class="mx-4 sm:mx-8 my-4 p-4 bg-white border border-gray-200 rounded-xl">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Feedback</p>
              <div v-if="canReview" class="flex gap-2">
                <button v-if="!editingFeedback" @click="startEditFeedback" class="text-xs text-brand font-medium">Edit</button>
                <button
                  v-if="storyboard.content.clientFeedback && isAdmin"
                  @click="clearFeedback"
                  class="text-xs text-red-600 font-medium"
                >
                  Clear
                </button>
              </div>
            </div>

            <div v-if="editingFeedback" class="space-y-3">
              <textarea v-model="feedbackDraft" rows="3" class="input-field resize-none" placeholder="Client feedback / required changes..." />
              <div class="flex justify-end gap-2">
                <button @click="editingFeedback = false" class="btn-secondary text-xs">Cancel</button>
                <button @click="saveFeedback" :disabled="submitting" class="btn-primary text-xs">Save Feedback</button>
              </div>
            </div>
            <p v-else-if="storyboard.content.clientFeedback" class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {{ storyboard.content.clientFeedback }}
            </p>
            <p v-else class="text-sm text-gray-400 italic">No feedback yet.</p>

            <p v-if="actionError" class="mt-2 text-sm text-red-600">{{ actionError }}</p>
          </div>

          <BrandFooter class="py-6" />
        </div>
      </div>

      <!-- Sticky Action Bar -->
      <div
        v-if="storyboard && canReview && storyboard.content.status === 'Pending'"
        class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div v-if="actionError" class="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ actionError }}</div>
          <div v-if="!showRejectForm" class="flex items-center justify-end gap-3">
            <button @click="showRejectForm = true" :disabled="submitting" class="px-6 py-2.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50">Reject</button>
            <button @click="handleApprove" :disabled="submitting" class="px-8 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
              {{ submitting ? 'Processing...' : 'Approve' }}
            </button>
          </div>
          <div v-else class="space-y-3">
            <label class="block text-sm font-medium text-gray-700">Required Modifications</label>
            <textarea v-model="rejectFeedback" rows="3" class="input-field resize-none" placeholder="Describe the changes you'd like..." />
            <div class="flex justify-end gap-3">
              <button @click="showRejectForm = false; rejectFeedback = ''; actionError = null" class="btn-secondary">Cancel</button>
              <button @click="handleReject" :disabled="submitting" class="px-6 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {{ submitting ? 'Submitting...' : 'Submit Rejection' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
