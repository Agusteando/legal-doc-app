<template>
  <div class="h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30" style="font-family: 'Inter', sans-serif;">
    <!-- Initial Loading State (Only blocks UI if no document is loaded yet) -->
    <div v-if="workspace.isLoadingWorkspace && !workspace.document" class="h-full w-full flex flex-col items-center justify-center bg-slate-900 space-y-4">
      <LoaderIcon class="w-8 h-8 animate-spin text-blue-500" />
      <span class="text-slate-400 font-medium text-sm tracking-wide animate-pulse">Loading Workspace...</span>
    </div>
    
    <!-- Active Workspace Routing -->
    <Workspace v-else-if="workspace.document" />
    <Uploader v-else />
  </div>
</template>

<script setup>
import { useWorkspaceStore } from '~/stores/workspace';
import { LoaderIcon } from 'lucide-vue-next';
import { onMounted } from 'vue';

const workspace = useWorkspaceStore();
onMounted(() => workspace.fetchWorkspace());
</script>