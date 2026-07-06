<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { api } from '../api';
import { compressImage } from '../utils/imageCompress';

const props = defineProps({
  initialDate: { type: String, default: null },
  initialClientId: { type: String, default: '' },
  contentId: { type: String, default: null },
  clients: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'saved']);

const isEdit = computed(() => !!props.contentId);
const activeTab = ref(0);
const submitting = ref(false);
const loadingEdit = ref(false);
const compressingImage = ref(false);
const error = ref(null);
const existingStatus = ref('Pending');
const existingFeedback = ref('');

const tabs = [
  { id: 'planning', label: 'Planning' },
  { id: 'messaging', label: 'Messaging' },
  { id: 'creative', label: 'Creative' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'frames', label: 'Frames' },
  { id: 'footer', label: 'Footer' },
];

const platforms = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter', 'LinkedIn', 'Snapchat'];
const formats = ['Reel', 'Short', 'Ad', 'Post', 'Story', 'Carousel', 'Live', 'Video', 'Static'];
const contentPillars = ['Brand Awareness', 'Education', 'Entertainment', 'Promotion', 'Community', 'Product', 'Other'];
const campaignTypes = ['Always-on', 'Launch', 'Seasonal', 'Paid', 'Organic', 'Partnership', 'Other'];
const productionTypes = ['In-house', 'UGC', 'Studio', 'AI-generated', 'Hybrid', 'Other'];
const priorities = ['Low', 'Medium', 'High', 'Urgent'];

const form = reactive({
  clientId: props.initialClientId || props.clients[0]?.clientId || '',
  contentPillar: '',
  campaignType: '',
  platform: 'Instagram',
  format: 'Reel',
  productionType: '',
  priority: 'Medium',
  headline: '',
  contentTopic: '',
  contentGoal: '',
  targetAudience: '',
  referenceLink: '',
  creativeConcept: '',
  sceneScript: '',
  caption: '',
  aiPrompt: '',
  deadline: '',
  publishDate: props.initialDate || new Date().toISOString().slice(0, 10),
  publishTime: '',
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
    imageUrl: '',
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
  if (form.footer[field].length > 1) form.footer[field].splice(index, 1);
}

const isValid = computed(() => {
  return form.clientId && form.platform && form.format && form.publishDate;
});

function buildPayload() {
  return {
    clientId: form.clientId,
    contentPillar: form.contentPillar,
    campaignType: form.campaignType,
    platform: form.platform,
    format: form.format,
    contentType: form.format,
    productionType: form.productionType,
    priority: form.priority,
    headline: form.headline,
    contentTopic: form.contentTopic,
    contentGoal: form.contentGoal,
    targetAudience: form.targetAudience,
    referenceLink: form.referenceLink,
    creativeConcept: form.creativeConcept,
    sceneScript: form.sceneScript,
    script: form.sceneScript,
    caption: form.caption,
    aiPrompt: form.aiPrompt,
    deadline: form.deadline,
    publishDate: form.publishDate,
    date: form.publishDate,
    publishTime: form.publishTime,
    duration: form.duration,
    castPeople: form.castPeople,
    mood: form.mood,
    frames: form.frames.map((f) => ({
      frameId: f.frameId,
      frameNumber: f.frameNumber,
      sceneTitle: f.sceneTitle,
      arDescription: f.arDescription,
      lensTechSpecs: f.lensTechSpecs,
      imageUrl: f.imageUrl || '',
      imageBase64: f.imageBase64,
    })),
    footer: {
      editingSequence: form.footer.editingSequence.filter(Boolean),
      bRollNotes: form.footer.bRollNotes.filter(Boolean),
      productionNotes: form.footer.productionNotes.filter(Boolean),
    },
  };
}

async function loadForEdit() {
  if (!props.contentId) return;
  loadingEdit.value = true;
  error.value = null;
  try {
    const data = await api.getStoryboard(props.contentId);
    const c = data.content;
    form.clientId = c.clientId || form.clientId;
    form.contentPillar = c.contentPillar || '';
    form.campaignType = c.campaignType || '';
    form.platform = c.platform || form.platform;
    form.format = c.format || c.contentType || form.format;
    form.productionType = c.productionType || '';
    form.priority = c.priority || 'Medium';
    form.headline = c.headline || '';
    form.contentTopic = c.contentTopic || '';
    form.contentGoal = c.contentGoal || '';
    form.targetAudience = c.targetAudience || '';
    form.referenceLink = c.referenceLink || '';
    form.creativeConcept = c.creativeConcept || '';
    form.sceneScript = c.sceneScript || c.script || '';
    form.caption = c.caption || '';
    form.aiPrompt = c.aiPrompt || '';
    form.deadline = c.deadline || '';
    form.publishDate = c.publishDate || c.date || form.publishDate;
    form.publishTime = c.publishTime || '';
    form.duration = c.duration || '';
    form.castPeople = c.castPeople || '';
    form.mood = c.mood || '';
    existingStatus.value = c.status || 'Pending';
    existingFeedback.value = c.clientFeedback || '';

    form.frames = (data.frames || []).map((f) => ({
      frameId: f.frameId,
      frameNumber: f.frameNumber,
      sceneTitle: f.sceneTitle || '',
      arDescription: f.arDescription || '',
      lensTechSpecs: f.lensTechSpecs || '',
      imageUrl: f.imageUrl || '',
      imageBase64: null,
      imagePreview: f.imageUrl || null,
      fileName: f.imageUrl ? 'Existing image' : '',
    }));

    form.footer.editingSequence = data.footer?.editingSequence?.length ? [...data.footer.editingSequence] : [''];
    form.footer.bRollNotes = data.footer?.bRollNotes?.length ? [...data.footer.bRollNotes] : [''];
    form.footer.productionNotes = data.footer?.productionNotes?.length ? [...data.footer.productionNotes] : [''];

    if (!form.frames.length) addFrame();
  } catch (e) {
    error.value = e.message;
  } finally {
    loadingEdit.value = false;
  }
}

async function handleSubmit() {
  if (!isValid.value) {
    error.value = 'Please fill required fields: Client, Platform, Format, Publish Date';
    activeTab.value = 0;
    return;
  }

  submitting.value = true;
  error.value = null;
  try {
    const payload = buildPayload();
    if (isEdit.value) {
      payload.contentId = props.contentId;
      payload.status = existingStatus.value;
      payload.clientFeedback = existingFeedback.value;
      await api.updateContent(payload);
    } else {
      await api.createContent(payload);
    }
    emit('saved');
  } catch (e) {
    error.value = e.message;
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  if (props.contentId) loadForEdit();
  else if (!form.frames.length) addFrame();
});
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="emit('close')" />

      <div class="relative w-full max-w-4xl mx-4 my-8 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 class="text-lg font-bold text-gray-900">
              {{ isEdit ? 'Edit Content Brief' : 'New Content Brief' }}
            </h2>
            <p class="text-sm text-gray-500">Planning fields + storyboard production details</p>
          </div>
          <button @click="emit('close')" class="p-2 hover:bg-gray-200 rounded-lg text-gray-500">&times;</button>
        </div>

        <div class="flex border-b border-gray-200 overflow-x-auto">
          <button
            v-for="(tab, index) in tabs"
            :key="tab.id"
            @click="activeTab = index"
            class="flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === index ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            <span class="flex items-center gap-2">
              <span
                class="w-5 h-5 rounded-full text-xs flex items-center justify-center"
                :class="activeTab === index ? 'bg-brand text-white' : 'bg-gray-200 text-gray-600'"
              >{{ index + 1 }}</span>
              {{ tab.label }}
            </span>
          </button>
        </div>

        <div class="px-6 py-6 max-h-[60vh] overflow-y-auto space-y-5">
          <!-- Planning -->
          <div v-show="activeTab === 0" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select v-model="form.clientId" class="input-field">
                <option v-for="c in clients" :key="c.clientId" :value="c.clientId">{{ c.clientName }}</option>
              </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Content Pillar</label>
                <select v-model="form.contentPillar" class="input-field">
                  <option value="">Select...</option>
                  <option v-for="p in contentPillars" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Campaign Type</label>
                <select v-model="form.campaignType" class="input-field">
                  <option value="">Select...</option>
                  <option v-for="p in campaignTypes" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Platform *</label>
                <select v-model="form.platform" class="input-field">
                  <option v-for="p in platforms" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Format *</label>
                <select v-model="form.format" class="input-field">
                  <option v-for="p in formats" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Production Type</label>
                <select v-model="form.productionType" class="input-field">
                  <option value="">Select...</option>
                  <option v-for="p in productionTypes" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select v-model="form.priority" class="input-field">
                  <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Messaging -->
          <div v-show="activeTab === 1" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Headline</label>
              <input v-model="form.headline" class="input-field" placeholder="Main headline / hook" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Content Topic</label>
              <input v-model="form.contentTopic" class="input-field" placeholder="What is this content about?" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Content Goal</label>
              <textarea v-model="form.contentGoal" rows="2" class="input-field resize-none" placeholder="Awareness, leads, engagement..." />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <input v-model="form.targetAudience" class="input-field" placeholder="Who is this for?" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Reference Link</label>
              <input v-model="form.referenceLink" type="url" class="input-field" placeholder="https://..." />
            </div>
          </div>

          <!-- Creative -->
          <div v-show="activeTab === 2" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Creative Concept</label>
              <textarea v-model="form.creativeConcept" rows="3" class="input-field resize-none" placeholder="Big idea / visual direction..." />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Scene Script</label>
              <textarea v-model="form.sceneScript" rows="4" class="input-field resize-none" placeholder="Full scene-by-scene script..." />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Caption</label>
              <textarea v-model="form.caption" rows="3" class="input-field resize-none" placeholder="Social caption..." />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">AI Prompt</label>
              <textarea v-model="form.aiPrompt" rows="3" class="input-field resize-none" placeholder="Prompt used for AI visuals / copy..." />
            </div>
          </div>

          <!-- Schedule -->
          <div v-show="activeTab === 3" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <input v-model="form.deadline" type="date" class="input-field" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Publish Date *</label>
                <input v-model="form.publishDate" type="date" class="input-field" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Publish Time</label>
                <input v-model="form.publishTime" type="time" class="input-field" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <input v-model="form.duration" class="input-field" placeholder="e.g. 30 sec" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Cast / People</label>
                <input v-model="form.castPeople" class="input-field" placeholder="Host, talent..." />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Mood</label>
                <input v-model="form.mood" class="input-field" placeholder="Energetic, calm..." />
              </div>
            </div>
          </div>

          <!-- Frames -->
          <div v-show="activeTab === 4" class="space-y-4">
            <div v-for="(frame, index) in form.frames" :key="index" class="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-semibold text-gray-700">Frame #{{ frame.frameNumber }}</span>
                <button v-if="form.frames.length > 1" @click="removeFrame(index)" class="text-red-500 text-xs font-medium">Remove</button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Scene Title</label>
                  <input v-model="frame.sceneTitle" class="input-field text-sm" placeholder="INTRO SHOT" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Technical Specs</label>
                  <input v-model="frame.lensTechSpecs" class="input-field text-sm" placeholder="LENS: 50mm | SHOT: B-Roll" />
                </div>
              </div>
              <div class="mt-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">Arabic Action Description</label>
                <textarea v-model="frame.arDescription" rows="2" dir="rtl" class="input-field text-sm font-arabic resize-none" placeholder="وصف المشهد..." />
              </div>
              <div class="mt-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">Frame Image</label>
                <label class="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand hover:bg-brand-soft transition-colors overflow-hidden">
                  <input type="file" accept="image/*" class="hidden" @change="handleImageSelect($event, index)" />
                  <img v-if="frame.imagePreview" :src="frame.imagePreview" class="w-full h-full object-cover" />
                  <span v-else class="text-xs text-gray-500">Click to upload</span>
                </label>
              </div>
            </div>
            <button @click="addFrame" class="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-brand hover:text-brand hover:bg-brand-soft">
              + Add New Frame
            </button>
          </div>

          <!-- Footer -->
          <div v-show="activeTab === 5" class="space-y-6">
            <div v-for="field in [
              { key: 'editingSequence', label: 'Editing Sequence', placeholder: 'Hook, Problem, CTA' },
              { key: 'bRollNotes', label: 'B-Roll Ideas (Arabic)', placeholder: 'فكرة لقطة...', rtl: true },
              { key: 'productionNotes', label: 'Production Notes', placeholder: 'Natural lighting' },
            ]" :key="field.key">
              <label class="block text-sm font-medium text-gray-700 mb-2">{{ field.label }}</label>
              <div class="space-y-2">
                <div v-for="(_, index) in form.footer[field.key]" :key="field.key + index" class="flex items-center gap-2">
                  <input
                    v-model="form.footer[field.key][index]"
                    class="input-field text-sm"
                    :class="field.rtl ? 'font-arabic' : ''"
                    :dir="field.rtl ? 'rtl' : 'ltr'"
                    :placeholder="field.placeholder"
                  />
                  <button v-if="form.footer[field.key].length > 1" @click="removeListItem(field.key, index)" class="text-red-400 px-2">×</button>
                </div>
              </div>
              <button @click="addListItem(field.key)" class="mt-2 text-xs text-brand font-medium">+ Add</button>
            </div>
          </div>
        </div>

        <div v-if="error" class="mx-6 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ error }}</div>

        <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div class="flex gap-2">
            <button v-if="activeTab > 0" @click="activeTab--" class="btn-secondary">Previous</button>
            <button v-if="activeTab < tabs.length - 1" @click="activeTab++" class="text-sm font-medium text-brand hover:bg-brand-soft px-4 py-2 rounded-lg">Next</button>
          </div>
          <div class="flex gap-2">
            <button @click="emit('close')" class="btn-secondary">Cancel</button>
            <button @click="handleSubmit" :disabled="submitting || compressingImage || loadingEdit" class="btn-primary">
              {{
                submitting ? 'Saving...'
                : compressingImage ? 'Processing image...'
                : loadingEdit ? 'Loading...'
                : isEdit ? 'Update Content' : 'Submit Content'
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
