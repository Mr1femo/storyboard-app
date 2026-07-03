<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
  role: { type: String, default: 'admin' },
});

const emit = defineEmits(['day-click', 'item-click']);

const currentDate = ref(new Date());
const today = new Date();

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const currentMonth = computed(() => currentDate.value.getMonth());
const currentYear = computed(() => currentDate.value.getFullYear());

const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days = [];

  for (let i = 0; i < startPadding; i++) {
    days.push({ date: null, items: [], isCurrentMonth: false });
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayItems = props.items.filter((item) => String(item.date || '').slice(0, 10) === dateStr);
    days.push({ date: dateStr, items: dayItems, isCurrentMonth: true });
  }

  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 0; i < remaining; i++) {
      days.push({ date: null, items: [], isCurrentMonth: false });
    }
  }

  return days;
});

function prevMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1);
}

function nextMonth() {
  currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1);
}

function goToToday() {
  currentDate.value = new Date();
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const t = today;
  const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr;
}

function handleDayClick(day) {
  if (!day.date) return;
  emit('day-click', day.date, day.items);
}

function handleItemClick(item, event) {
  event.stopPropagation();
  emit('item-click', item);
}

const platformColors = {
  Instagram: 'bg-pink-100 text-pink-700 border-pink-200',
  TikTok: 'bg-gray-900 text-white border-gray-700',
  YouTube: 'bg-red-100 text-red-700 border-red-200',
  Facebook: 'bg-blue-100 text-blue-700 border-blue-200',
  Twitter: 'bg-sky-100 text-sky-700 border-sky-200',
  LinkedIn: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const statusColors = {
  Pending: 'bg-amber-400',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-red-500',
};

function platformClass(platform) {
  return platformColors[platform] || 'bg-gray-100 text-gray-700 border-gray-200';
}
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
    <!-- Calendar Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <h2 class="text-lg font-semibold text-gray-900">
        {{ monthNames[currentMonth] }} {{ currentYear }}
      </h2>
      <div class="flex items-center gap-2">
        <button
          @click="goToToday"
          class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Today
        </button>
        <button
          @click="prevMonth"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          @click="nextMonth"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Day Labels -->
    <div class="grid grid-cols-7 border-b border-gray-100">
      <div
        v-for="label in dayLabels"
        :key="label"
        class="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
      >
        {{ label }}
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7">
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        class="min-h-[120px] border-b border-r border-gray-100 p-2 transition-colors"
        :class="{
          'bg-gray-50/50': !day.isCurrentMonth,
          'hover:bg-brand-soft/50 cursor-pointer': day.isCurrentMonth && role === 'admin',
          'hover:bg-gray-50': day.isCurrentMonth && role === 'client',
        }"
        @click="handleDayClick(day)"
      >
        <template v-if="day.date">
          <div class="flex items-center justify-between mb-1.5">
            <span
              class="inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full"
              :class="isToday(day.date) ? 'bg-brand text-white' : 'text-gray-700'"
            >
              {{ parseInt(day.date.split('-')[2]) }}
            </span>
            <span
              v-if="day.items.length > 0"
              class="text-[10px] text-gray-400 font-medium"
            >
              {{ day.items.length }}
            </span>
          </div>

          <div class="space-y-1">
            <button
              v-for="item in day.items.slice(0, 3)"
              :key="item.id"
              @click="handleItemClick(item, $event)"
              class="w-full text-left px-1.5 py-1 rounded-md border text-[11px] leading-tight transition-all hover:shadow-sm"
              :class="platformClass(item.platform)"
            >
              <div class="flex items-center gap-1">
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  :class="statusColors[item.status] || statusColors.Pending"
                />
                <span class="truncate font-medium">{{ item.platform }}</span>
              </div>
              <span class="truncate block text-[10px] opacity-75">{{ item.contentType }}</span>
            </button>
            <p
              v-if="day.items.length > 3"
              class="text-[10px] text-gray-400 text-center"
            >
              +{{ day.items.length - 3 }} more
            </p>
          </div>
        </template>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap items-center gap-4 px-6 py-3 bg-gray-50 border-t border-gray-100">
      <span class="text-xs font-medium text-gray-500">Status:</span>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span class="text-xs text-gray-600">Pending</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span class="text-xs text-gray-600">Approved</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-red-500" />
        <span class="text-xs text-gray-600">Rejected</span>
      </div>
    </div>
  </div>
</template>
