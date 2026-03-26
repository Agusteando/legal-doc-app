<template>
  <div class="h-full w-full flex flex-col items-center justify-center p-8 bg-slate-900">
    <div 
      class="w-full max-w-2xl bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-12 text-center shadow-2xl transition-all duration-300 relative overflow-hidden"
      :class="{ 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)] bg-slate-800': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <div v-if="!workspace.isUploading" class="relative z-10 flex flex-col items-center">
        <div class="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
          <UploadCloudIcon class="w-10 h-10 text-slate-300" />
        </div>
        <h2 class="text-2xl font-bold mb-3 text-white tracking-tight">Create Document Workspace</h2>
        <p class="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed text-sm">Drag and drop your legal PDFs here. The workbench will automatically convert them into secure image strips for deterministic AI extraction.</p>
        <label class="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer font-medium shadow-md shadow-blue-900/20 transition-all inline-flex items-center space-x-2">
          <FilePlusIcon class="w-5 h-5" />
          <span>Select PDF Files</span>
          <input type="file" class="hidden" accept="application/pdf" multiple @change="handleFile" />
        </label>
      </div>
      <div v-else class="space-y-6 relative z-10 py-4">
        <LoaderIcon class="w-12 h-12 mx-auto text-blue-500 animate-spin" />
        <div>
          <h3 class="text-lg font-medium text-white mb-2">{{ workspace.uploadStatusText }}</h3>
          <p class="text-sm text-slate-400 font-mono">{{ workspace.uploadProgress }}% Complete</p>
        </div>
        <div class="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700">
          <div class="bg-blue-500 h-full transition-all duration-300 ease-out" :style="{ width: `${workspace.uploadProgress}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { UploadCloudIcon, FilePlusIcon, LoaderIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();
const isDragging = ref(false);

const handleDrop = (e) => {
  isDragging.value = false;
  const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type === 'application/pdf');
  if (files.length) workspace.insertFiles(files);
};

const handleFile = (e) => {
  const files = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
  if (files.length) workspace.insertFiles(files);
  e.target.value = null; // reset input
};
</script>