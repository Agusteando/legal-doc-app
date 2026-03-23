<template>
  <div class="h-full flex flex-col bg-slate-950 text-slate-200">
    <!-- Clean, Premium Header -->
    <header class="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
      <div class="flex items-center space-x-6">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-blue-600/20 text-blue-500 rounded-lg flex items-center justify-center border border-blue-500/30">
            <FilesIcon class="w-4 h-4" />
          </div>
          <h1 class="font-semibold text-slate-100 text-[15px] tracking-tight">{{ workspace.document?.filename || 'Legal Workbench' }}</h1>
        </div>
        
        <div class="h-6 w-px bg-slate-800"></div>
        
        <button @click="isFilesModalOpen = true" class="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center">
          Source Files
        </button>
      </div>

      <div class="flex items-center space-x-6">
        <Approvals />
        <div class="h-6 w-px bg-slate-800"></div>
        
        <button @click="workspace.processSelected()" :disabled="!workspace.selectedPageIds.size" 
          class="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-sm font-medium flex items-center shadow-sm text-slate-200 transition-all">
          <CpuIcon class="w-4 h-4 mr-2 text-blue-400" /> 
          Process ({{ workspace.selectedPageIds.size }})
        </button>

        <button @click="exportPdf" :disabled="isExporting" 
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-wait rounded-lg text-sm font-medium flex items-center shadow-md shadow-blue-900/20 text-white transition-all">
          <LoaderIcon v-if="isExporting" class="w-4 h-4 mr-2 animate-spin" />
          <DownloadIcon v-else class="w-4 h-4 mr-2" /> 
          Export PDF
        </button>
      </div>
    </header>

    <!-- Main Workspace Area -->
    <div class="flex flex-1 min-h-0 relative">
      <PageStrip class="w-[300px] border-r border-slate-800 bg-slate-900 flex-shrink-0" />
      <DetailView class="flex-1 min-w-0" />
      
      <!-- Overlay when replacing a file -->
      <div v-if="workspace.isUploading" class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center text-white">
        <LoaderIcon class="w-12 h-12 text-blue-500 animate-spin mb-5" />
        <h3 class="text-lg font-medium tracking-wide">{{ workspace.uploadStatusText }}</h3>
        <div class="w-72 bg-slate-800 rounded-full h-1.5 mt-5 overflow-hidden">
          <div class="bg-blue-500 h-full transition-all duration-300 ease-out" :style="{ width: `${workspace.uploadProgress}%` }"></div>
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
    const res = await $fetch(`/api/workspace/${workspace.document.id}/export`);
    if (res.html) {
      // Native print engine: bypasses Vercel limits completely, creating perfect selectable PDFs.
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(res.html);
        printWin.document.close();
      } else {
        alert("Pop-up blocked. Please allow pop-ups to export the PDF.");
      }
    } else {
      throw new Error("No HTML payload returned.");
    }
  } catch (err) {
    alert("Export Error: " + (err.data?.statusMessage || err.message));
  } finally {
    isExporting.value = false;
  }
};
</script>