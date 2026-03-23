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

    <div class="flex flex-1 min-h-0">
      <PageStrip class="w-[320px] border-r border-slate-700 bg-slate-800/60 flex-shrink-0" />
      <DetailView class="flex-1 min-w-0" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { CpuIcon, DownloadIcon, LoaderIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import Approvals from './Approvals.vue';
import PageStrip from './PageStrip.vue';
import DetailView from './DetailView.vue';

const workspace = useWorkspaceStore();
const isExporting = ref(false);

const exportPdf = async () => {
  if (!workspace.document) return;
  isExporting.value = true;
  try {
    const res = await $fetch(`/api/workspace/${workspace.document.id}/export`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(res);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspace.document.filename.replace(/\s+/g, '_')}_Export.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    alert("Failed to export PDF: " + err.message);
  } finally {
    isExporting.value = false;
  }
};
</script>