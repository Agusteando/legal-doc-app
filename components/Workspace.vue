<template>
  <div class="h-full flex flex-col">
    <!-- Topbar -->
    <header class="h-14 border-b border-slate-700 bg-slate-800 flex items-center justify-between px-4 shrink-0">
      <div class="flex items-center space-x-4">
        <h1 class="font-semibold text-white">Assembled Document Workspace</h1>
        <div class="h-4 w-px bg-slate-600"></div>
        <div class="flex space-x-2">
          <button @click="workspace.processSelected()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium flex items-center shadow-sm text-white">
            <CpuIcon class="w-4 h-4 mr-2" /> Process Selected ({{ workspace.selectedPageIds.size }})
          </button>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <Approvals />
        <button class="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-medium flex items-center shadow-sm text-white">
          <DownloadIcon class="w-4 h-4 mr-2" /> Export JSON
        </button>
      </div>
    </header>

    <!-- Main Workspace Area -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar: Page Strip -->
      <PageStrip class="w-72 border-r border-slate-700 bg-slate-800/50 flex-shrink-0" />
      
      <!-- Right Pane: Detail View -->
      <DetailView class="flex-1 min-w-0" />
    </div>
  </div>
</template>

<script setup>
import { CpuIcon, DownloadIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import Approvals from './Approvals.vue';
import PageStrip from './PageStrip.vue';
import DetailView from './DetailView.vue';

const workspace = useWorkspaceStore();
</script>