<template>
  <div class="h-full flex flex-col bg-slate-950 text-slate-200">
    
    <!-- Clean, Focused Main Header -->
    <header class="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-6 shrink-0 z-20 shadow-md">
      
      <!-- Project Context -->
      <div class="flex items-center space-x-4">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
          <FilesIcon class="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 class="font-semibold text-slate-100 text-sm tracking-tight">{{ workspace.document?.filename || 'Active Project' }}</h1>
          <div class="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">
            {{ workspace.progressStats.approved }} / {{ workspace.progressStats.total }} Pages Approved
          </div>
        </div>
      </div>
      
      <!-- Export Action -->
      <div>
        <button @click="exportPdf" :disabled="isExporting" 
          class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-wait rounded-lg text-sm font-semibold flex items-center shadow-lg shadow-blue-900/20 text-white transition-all ring-1 ring-blue-500/50">
          <LoaderIcon v-if="isExporting" class="w-4 h-4 mr-2 animate-spin" />
          <DownloadCloudIcon v-else class="w-4 h-4 mr-2" /> 
          Export PDF
        </button>
      </div>
    </header>

    <!-- Unified 3-Pane Workspace Area -->
    <div class="flex flex-1 min-h-0 relative">
      <PageStrip class="w-[260px] border-r border-slate-800 flex-shrink-0 z-20" />
      
      <!-- Middle Pane: Source & Context Validation -->
      <!-- Smooth expansion driven by workspace.isPanelExpanded state -->
      <DetailView class="border-r border-slate-800 flex-shrink-0 z-10 shadow-2xl transition-all duration-300 ease-in-out" 
                  :class="workspace.isPanelExpanded ? 'w-[45%] max-w-[800px]' : 'w-[28%] min-w-[350px] max-w-[450px]'" />
      
      <!-- Right Pane: English Translation & WYSIWYG Canvas -->
      <DocumentEditor class="flex-1 min-w-0 z-0 bg-slate-200" />
      
      <!-- Upload Overlay -->
      <div v-if="workspace.isUploading" class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white">
        <LoaderIcon class="w-12 h-12 text-blue-500 animate-spin mb-5" />
        <h3 class="text-lg font-medium tracking-wide">{{ workspace.uploadStatusText }}</h3>
        <div class="w-72 bg-slate-800 rounded-full h-1.5 mt-5 overflow-hidden">
          <div class="bg-blue-500 h-full transition-all duration-300 ease-out" :style="{ width: `${workspace.uploadProgress}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { DownloadCloudIcon, LoaderIcon, FilesIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import PageStrip from './PageStrip.vue';
import DetailView from './DetailView.vue';
import DocumentEditor from './DocumentEditor.vue';

const workspace = useWorkspaceStore();
const isExporting = ref(false);

const exportPdf = async () => {
  if (!workspace.document) return;
  isExporting.value = true;
  try {
    const res = await $fetch(`/api/documents/${workspace.document.id}/export`, { method: 'POST' });
    if (res.url) {
      window.open(res.url, '_blank');
    } else {
      throw new Error("Render service failed to return a valid PDF URL.");
    }
  } catch (err) {
    alert("Export Error: " + (err.data?.statusMessage || err.message));
  } finally {
    isExporting.value = false;
  }
};
</script>