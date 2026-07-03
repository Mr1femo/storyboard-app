<script setup>
defineProps({
  subtitle: { type: String, default: '' },
  role: { type: String, default: 'client' },
});

const emit = defineEmits(['logout', 'navigate']);
</script>

<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-extrabold text-lg font-display shadow-sm">
          R
        </div>
        <div>
          <h1 class="text-lg font-extrabold text-gray-900 font-display leading-tight">
            Raccoon
          </h1>
          <p class="text-[11px] text-brand font-semibold font-display italic leading-tight">
            Ideas like a Raccoon!
          </p>
        </div>
        <span v-if="subtitle" class="hidden sm:block text-gray-300 mx-1">|</span>
        <p v-if="subtitle" class="hidden sm:block text-sm text-gray-500">{{ subtitle }}</p>
      </div>

      <div class="flex items-center gap-2">
        <slot name="actions" />
        <button
          @click="emit('logout')"
          class="text-sm text-gray-500 hover:text-brand transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-soft"
        >
          Logout
        </button>
      </div>
    </div>
  </header>
</template>
