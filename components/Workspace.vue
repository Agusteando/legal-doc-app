<template>
  <div class="h-full flex flex-col bg-[#0a0c10] text-slate-200">
    <!-- Main Tool Header -->
    <header class="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
      <div class="flex items-center space-x-6">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <FilesIcon class="w-4 h-4" />
          </div>
          <h1 class="font-semibold text-slate-100 text-[15px] tracking-tight">{{ workspace.document?.filename || 'Active Legal Project' }}</h1>
        </div>
        
        <div class="h-6 w-px bg-slate-800"></div>
        
        <!-- Core Navigation / Task Switcher -->
        <div class="flex bg-slate-900 p-1 rounded-lg border border-slate-800 shadow-inner">
          <button 
            @click="workspace.setViewMode('review')" 
            :class="workspace.viewMode === 'review' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'" 
            class="px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center">
            <FileSearchIcon class="w-4 h-4 mr-2" />
            Page Review
          </button>
          <button 
            @click="workspace.setViewMode('editor')" 
            :class="workspace.viewMode === 'editor' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'" 
            class="px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center">
            <LayoutTemplateIcon class="w-4 h-4 mr-2" />
            Final Document
          </button>
        </div>
      </div>

      <div class="flex items-center space-x-6">
        <Approvals />
        
        <div class="h-6 w-px bg-slate-800"></div>

        <!-- Triggers Server-side Puppeteer Render -->
        <button @click="exportPdf" :disabled="isExporting" 
          class="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-wait rounded-lg text-sm font-medium flex items-center shadow-md shadow-blue-900/20 text-white transition-all">
          <LoaderIcon v-if="isExporting" class="w-4 h-4 mr-2 animate-spin" />
          <DownloadCloudIcon v-else class="w-4 h-4 mr-2" /> 
          Export Server PDF
        </button>
      </div>
    </header>

    <!-- Main Dynamic Workspace Area -->
    <div class="flex flex-1 min-h-0 relative">
      <!-- Only show Page Strip in Review Mode -->
      <PageStrip v-show="workspace.viewMode === 'review'" class="w-[280px] border-r border-slate-800 bg-slate-950 flex-shrink-0" />
      
      <!-- Context Views -->
      <DetailView v-if="workspace.viewMode === 'review'" class="flex-1 min-w-0" />
      <DocumentEditor v-if="workspace.viewMode === 'editor'" class="flex-1 min-w-0 z-10" />
      
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
import { DownloadCloudIcon, LoaderIcon, FilesIcon, FileSearchIcon, LayoutTemplateIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import Approvals from './Approvals.vue';
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