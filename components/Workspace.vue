<template>
  <div class="h-full flex flex-col bg-slate-900">
    <header class="h-16 border-b border-slate-700 bg-slate-800 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
      <div class="flex items-center space-x-5">
        <h1 class="font-semibold text-slate-100 text-lg tracking-tight">Legal Document Workbench</h1>
        <div class="h-5 w-px bg-slate-600"></div>
        <button @click="workspace.processSelected()" :disabled="!workspace.selectedPageIds.size" 
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium flex items-center shadow-sm text-white transition-colors">
          <CpuIcon class="w-4 h-4 mr-2" /> 
          Process Selected ({{ workspace.selectedPageIds.size }})
        </button>
        <button @click="isFilesModalOpen = true" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm font-medium flex items-center text-slate-200 transition-colors border border-slate-600">
          <FilesIcon class="w-4 h-4 mr-2" /> Source Files
        </button>
      </div>
      <div class="flex items-center space-x-5">
        <Approvals />
        <button @click="exportPdf" :disabled="isExporting" 
          class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-wait rounded-md text-sm font-medium flex items-center shadow-sm text-white transition-colors">
          <LoaderIcon v-if="isExporting" class="w-4 h-4 mr-2 animate-spin" />
          <DownloadIcon v-else class="w-4 h-4 mr-2" /> 
          {{ isExporting ? 'Exporting...' : 'Export to PDF' }}
        </button>
      </div>
    </header>

    <div class="flex flex-1 min-h-0 relative">
      <PageStrip class="w-[320px] border-r border-slate-700 bg-slate-800/60 flex-shrink-0" />
      <DetailView class="flex-1 min-w-0" />
      
      <!-- Overlay when replacing a file -->
      <div v-if="workspace.isUploading" class="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-40 flex flex-col items-center justify-center text-white">
        <LoaderIcon class="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h3 class="text-xl font-medium">{{ workspace.uploadStatusText }}</h3>
        <div class="w-64 bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
          <div class="bg-blue-500 h-full transition-all duration-300" :style="{ width: `${workspace.uploadProgress}%` }"></div>
        </div>
      </div>
    </div>
    
    <SourceFilesModal :isOpen="isFilesModalOpen" @close="isFilesModalOpen = false" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { CpuIcon, DownloadIcon, LoaderIcon, FilesIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import Approvals from './Approvals.vue';
import PageStrip from './PageStrip.vue';
import DetailView from './DetailView.vue';
import SourceFilesModal from './SourceFilesModal.vue';

const workspace = useWorkspaceStore();
const isExporting = ref(false);
const isFilesModalOpen = ref(false);

const exportPdf = async () => {
  if (!workspace.document) return;
  isExporting.value = true;
  try {
    // Vercel limits bypassed: endpoint now uploads PDF to storage and returns a secure public URL.
    const res = await $fetch(`/api/workspace/${workspace.document.id}/export`);
    if (res.url) {
      window.open(res.url, '_blank');
    } else {
      throw new Error("No URL returned from export engine.");
    }
  } catch (err) {
    alert("Export Error: " + (err.data?.statusMessage || err.message));
  } finally {
    isExporting.value = false;
  }
};
</script>