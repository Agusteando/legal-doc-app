<template>
  <div class="h-full w-full flex flex-col items-center justify-center p-8">
    <div 
      class="w-full max-w-2xl bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl p-12 text-center transition-colors relative overflow-hidden"
      :class="{ 'border-blue-500 bg-blue-500/10': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <div v-if="!workspace.isUploading" class="relative z-10">
        <UploadCloudIcon class="w-16 h-16 mx-auto text-slate-400 mb-4" />
        <h2 class="text-2xl font-semibold mb-2 text-white">Create Document Workspace</h2>
        <p class="text-slate-400 mb-6">Drag and drop one or more PDFs to convert them to image strips and assemble your workspace.</p>
        <label class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer font-medium transition-colors inline-block">
          Select PDF Files
          <input type="file" class="hidden" accept="application/pdf" multiple @change="handleFile" />
        </label>
      </div>
      <div v-else class="space-y-4 relative z-10">
        <LoaderIcon class="w-12 h-12 mx-auto text-blue-500 animate-spin" />
        <h3 class="text-xl font-medium text-white">{{ workspace.uploadStatusText }}</h3>
        <div class="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div class="bg-blue-500 h-full transition-all duration-300" :style="{ width: `${workspace.uploadProgress}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { UploadCloudIcon, LoaderIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();
const isDragging = ref(false);

const handleDrop = (e) => {
  isDragging.value = false;
  const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type === 'application/pdf');
  if (files.length) workspace.addFiles(files);
};

const handleFile = (e) => {
  const files = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
  if (files.length) workspace.addFiles(files);
};
</script>