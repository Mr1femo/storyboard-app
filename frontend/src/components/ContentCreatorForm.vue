<script setup>
import { ref, reactive, computed } from 'vue';
import { api } from '../api';
import { compressImage } from '../utils/imageCompress';

const props = defineProps({
  initialDate: { type: String, default: null },
  contentId: { type: String, default: null },
});

const emit = defineEmits(['close', 'saved']);

const activeTab = ref(0);
const submitting = ref(false);
const compressingImage = ref(false);
const error = ref(null);

const tabs = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'metadata', label: 'Storyboard Metadata' },
  { id: 'frames', label: 'Frames Builder' },
  { id: 'footer', label: 'Footer Info' },
];

const platforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter', 'LinkedIn'];
const contentTypes = ['Reel', 'Short', 'Ad', 'Post', 'Story', 'Carousel', 'Live'];

const form = reactive({
  date: props.initialDate || new Date().toISOString().slice(0, 10),
  platform: 'Instagram',
  contentType: 'Reel',
  caption: '',
  script: '',
  duration: '',
  castPeople: '',
  mood: '',
  frames: [],
  footer: {
    editingSequence: [''],
    bRollNotes: [''],
    productionNotes: [''],
  },
});

function addFrame() {
  form.frames.push({
    frameNumber: form.frames.length + 1,
    sceneTitle: '',
    arDescription: '',
    lensTechSpecs: '',
    imageBase64: null,
    imagePreview: null,
    fileName: '',
  });
}

function removeFrame(index) {
  form.frames.splice(index, 1);
  form.frames.forEach((f, i) => { f.frameNumber = i + 1; });
}

async function handleImageSelect(event, index) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    error.value = 'Please select a valid image file';
    return;
  }

  compressingImage.value = true;
  error.value = null;

  try {
    const compressed = await compressImage(file);
    form.frames[index].imageBase64 = compressed;
    form.frames[index].imagePreview = compressed;
    form.frames[index].fileName = file.name;
  } catch {
    error.value = 'Failed to process image. Try a different file.';
  } finally {
    compressingImage.value = false;
    event.target.value = '';
  }
}

function addListItem(field) {
  form.footer[field].push('');
}

function removeListItem(field, index) {
  if (form.footer[field].length > 1) {
    form.footer[field].splice(index, 1);
  }
}

const isValid = computed(() => {
  return form.date && form.platform && form.contentType;
});

async function handleSubmit() {
  if (!isValid.value) {
    error.value = 'Please fill in required fields (Date, Platform, Content Type)';
    activeTab.value = 0;
    return;
  }

  submitting.value = true;
  error.value = null;

  try {
    const payload = {
      date: form.date,
      platform: form.platform,
      contentType: form.contentType,
      caption: form.caption,
      script: form.script,
      duration: form.duration,
      castPeople: form.castPeople,
      mood: form.mood,
      frames: form.frames.map((f) => ({
        frameNumber: f.frameNumber,
        sceneTitle: f.sceneTitle,
        arDescription: f.arDescription,
        lensTechSpecs: f.lensTechSpecs,
        imageBase64: f.imageBase64,
      })),
      footer: {
        editingSequence: form.footer.editingSequence.filter(Boolean),
        bRollNotes: form.footer.bRollNotes.filter(Boolean),
        productionNotes: form.footer.productionNotes.filter(Boolean),
      },
    };

    await api.createContent(payload);
    emit('saved');
  } catch (e) {
    error.value = e.message;
  } finally {
    submitting.value = false;
  }
}

if (form.frames.length === 0) addFrame();
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="emit('close')" />

      <div class="relative w-full max-w-4xl mx-4 my-8 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Content & Storyboard Creator</h2>
            <p class="text-sm text-gray-500">Create new scheduled content with storyboard frames</p>
          </div>
          <button
            @click="emit('close')"
            class="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-gray-200 overflow-x-auto">
          <button
            v-for="(tab, index) in tabs"
            :key="tab.id"
            @click="activeTab = index"
            class="flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === index
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            <span class="flex items-center gap-2">
              <span
                class="w-5 h-5 rounded-full text-xs flex items-center justify-center"
                :class="activeTab === index ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'"
              >
                {{ index + 1 }}
              </span>
              {{ tab.label }}
            </span>
          </button>
        </div>

        <!-- Form Body -->
        <div class="px-6 py-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
          <!-- Tab 1: Basic Info -->
          <div v-show="activeTab === 0" class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  v-model="form.date"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Platform *</label>
                <select
                  v-model="form.platform"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option v-for="p in platforms" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Content Type *</label>
                <select
                  v-model="form.contentType"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option v-for="t in contentTypes" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Caption</label>
              <textarea
                v-model="form.caption"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Social media caption..."
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Script</label>
              <textarea
                v-model="form.script"
                rows="4"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Full script or talking points..."
              />
            </div>
          </div>

          <!-- Tab 2: Metadata -->
          <div v-show="activeTab === 1" class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <input
                  v-model="form.duration"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. 60 sec"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Cast / People</label>
                <input
                  v-model="form.castPeople"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Host, Guest"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Mood</label>
                <input
                  v-model="form.mood"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. Energetic, Calm"
                />
              </div>
            </div>
          </div>

          <!-- Tab 3: Frames -->
          <div v-show="activeTab === 2" class="space-y-4">
            <div
              v-for="(frame, index) in form.frames"
              :key="index"
              class="border border-gray-200 rounded-xl p-4 bg-gray-50/50"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-semibold text-gray-700">
                  Frame #{{ frame.frameNumber }}
                </span>
                <button
                  v-if="form.frames.length > 1"
                  @click="removeFrame(index)"
                  class="text-red-500 hover:text-red-700 text-xs font-medium"
                >
                  Remove
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Scene Title (English)</label>
                  <input
                    v-model="frame.sceneTitle"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="INTRO SHOT"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Technical Specs</label>
                  <input
                    v-model="frame.lensTechSpecs"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="LENS: 50mm | SHOT: B-Roll"
                  />
                </div>
              </div>

              <div class="mt-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">Arabic Action Description</label>
                <textarea
                  v-model="frame.arDescription"
                  rows="2"
                  dir="rtl"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-arabic focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  placeholder="وصف المشهد بالعربية..."
                />
              </div>

              <div class="mt-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">Frame Image</label>
                <div class="flex items-start gap-4">
                  <label class="flex-1 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="handleImageSelect($event, index)"
                    />
                    <svg v-if="!frame.imagePreview" class="w-8 h-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span v-if="!frame.imagePreview" class="text-xs text-gray-500">Click to upload image</span>
                    <img
                      v-else
                      :src="frame.imagePreview"
                      :alt="frame.fileName"
                      class="w-full h-full object-cover rounded-lg"
                    />
                  </label>
                </div>
                <p v-if="frame.fileName" class="text-[10px] text-gray-400 mt-1">{{ frame.fileName }}</p>
              </div>
            </div>

            <button
              @click="addFrame"
              class="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-colors"
            >
              + Add New Frame
            </button>
          </div>

          <!-- Tab 4: Footer -->
          <div v-show="activeTab === 3" class="space-y-6">
            <!-- Editing Sequence -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Editing Sequence (Steps)</label>
              <div class="space-y-2">
                <div
                  v-for="(_, index) in form.footer.editingSequence"
                  :key="'edit-' + index"
                  class="flex items-center gap-2"
                >
                  <span class="text-xs text-gray-400 w-6">{{ index + 1 }}.</span>
                  <input
                    v-model="form.footer.editingSequence[index]"
                    type="text"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. Hook, Problem, Solution, CTA"
                  />
                  <button
                    v-if="form.footer.editingSequence.length > 1"
                    @click="removeListItem('editingSequence', index)"
                    class="text-red-400 hover:text-red-600 p-1"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <button
                @click="addListItem('editingSequence')"
                class="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Add Step
              </button>
            </div>

            <!-- B-Roll Notes (Arabic) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">B-Roll Ideas (Arabic)</label>
              <div class="space-y-2">
                <div
                  v-for="(_, index) in form.footer.bRollNotes"
                  :key="'broll-' + index"
                  class="flex items-center gap-2"
                >
                  <span class="text-xs text-gray-400">•</span>
                  <input
                    v-model="form.footer.bRollNotes[index]"
                    type="text"
                    dir="rtl"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-arabic focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="فكرة لقطة إضافية..."
                  />
                  <button
                    v-if="form.footer.bRollNotes.length > 1"
                    @click="removeListItem('bRollNotes', index)"
                    class="text-red-400 hover:text-red-600 p-1"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <button
                @click="addListItem('bRollNotes')"
                class="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Add B-Roll Idea
              </button>
            </div>

            <!-- Production Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Production Notes (English)</label>
              <div class="space-y-2">
                <div
                  v-for="(_, index) in form.footer.productionNotes"
                  :key="'prod-' + index"
                  class="flex items-center gap-2"
                >
                  <span class="text-xs text-gray-400">•</span>
                  <input
                    v-model="form.footer.productionNotes[index]"
                    type="text"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. Use natural lighting"
                  />
                  <button
                    v-if="form.footer.productionNotes.length > 1"
                    @click="removeListItem('productionNotes', index)"
                    class="text-red-400 hover:text-red-600 p-1"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <button
                @click="addListItem('productionNotes')"
                class="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Add Production Note
              </button>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="mx-6 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {{ error }}
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div class="flex gap-2">
            <button
              v-if="activeTab > 0"
              @click="activeTab--"
              class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Previous
            </button>
            <button
              v-if="activeTab < tabs.length - 1"
              @click="activeTab++"
              class="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Next
            </button>
          </div>
          <div class="flex gap-2">
            <button
              @click="emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              @click="handleSubmit"
              :disabled="submitting || compressingImage"
              class="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {{ submitting ? 'Submitting...' : compressingImage ? 'Processing image...' : 'Submit Content' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-in {
  animation: fadeIn 0.2s ease-out;
}
</style>
