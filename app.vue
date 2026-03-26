<template>
  <div class="h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30 flex flex-col relative" style="font-family: 'Inter', sans-serif;">
    
    <!-- Main App Container -->
    <div class="flex-1 relative overflow-hidden transition-all duration-300" :style="showDiag ? 'height: calc(100vh - 18rem);' : 'height: calc(100vh - 2.5rem);'">
      
      <!-- Initial Loading State -->
      <div v-if="workspace.isLoadingWorkspace && !workspace.document" class="h-full w-full flex flex-col items-center justify-center bg-slate-950 space-y-4">
        <LoaderIcon class="w-8 h-8 animate-spin text-blue-500" />
        <span class="text-slate-400 font-medium text-sm tracking-wide animate-pulse">Initializing Single-Project Environment...</span>
      </div>
      
      <!-- UI Routing Logic -->
      <Workspace v-else-if="workspace.document" />
      <Uploader v-else />
      
    </div>

    <!-- HUD / System Diagnostics Panel (Default Hidden) -->
    <div class="absolute bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 font-mono text-xs flex flex-col z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all duration-300" :class="showDiag ? 'h-72' : 'h-10'">
      <!-- Panel Header -->
      <div class="h-10 shrink-0 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 cursor-pointer text-slate-500 hover:text-slate-300 select-none transition-colors" @click="showDiag = !showDiag">
        <div class="flex items-center gap-6">
          <span class="font-bold tracking-wide flex items-center gap-2 text-slate-400">
            <TerminalIcon class="w-4 h-4" />
            SYSTEM DIAGNOSTICS & LOGS
          </span>
          <div class="flex items-center gap-4 border-l border-slate-700 pl-4 hidden sm:flex">
            <span class="text-indigo-400" title="Total Documents in DB">DB Docs: {{ workspace.globalStats.totalDocuments }}</span>
            <span class="text-emerald-400" title="Total Active Pages in DB">DB Active Pages: {{ workspace.globalStats.totalPages }}</span>
            <span class="text-red-400" title="Total Deleted Pages in DB">DB Deleted: {{ workspace.globalStats.deletedPages }}</span>
            <span class="text-amber-400 ml-4">Current UI Route: {{ workspace.document ? 'Workspace Viewer' : 'Uploader Screen' }}</span>
          </div>
        </div>
        <ChevronUpIcon class="w-4 h-4 transition-transform duration-300" :class="showDiag ? 'rotate-180' : ''" />
      </div>
      
      <!-- Logs List -->
      <div class="flex-1 overflow-auto p-4 space-y-1.5 bg-[#0a0a0a]" ref="logContainer">
        <div v-for="(log, i) in workspace.logs" :key="i" class="flex gap-3 hover:bg-slate-900/50 px-1 -mx-1 rounded transition-colors">
          <span class="text-slate-600 shrink-0 select-none">[{{ log.time }}]</span>
          <span class="shrink-0 w-16 font-bold select-none" :class="{
            'text-blue-500': log.level === 'info',
            'text-emerald-500': log.level === 'success',
            'text-amber-500': log.level === 'warn',
            'text-red-500': log.level === 'error',
            'text-purple-400': log.level === 'debug',
          }">{{ log.level.toUpperCase() }}</span>
          <span class="text-slate-300 whitespace-pre-wrap break-all">{{ log.msg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useWorkspaceStore } from '~/stores/workspace';
import { LoaderIcon, TerminalIcon, ChevronUpIcon } from 'lucide-vue-next';
import { onMounted, ref, watch, nextTick } from 'vue';

const workspace = useWorkspaceStore();
const showDiag = ref(false); // Default to calm workspace
const logContainer = ref(null);

watch(() => workspace.logs.length, async () => {
  await nextTick();
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
});

onMounted(() => workspace.fetchWorkspace());
</script>