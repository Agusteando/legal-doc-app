<template>
  <div class="h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30 flex flex-col relative" style="font-family: 'Inter', sans-serif;">
    
    <!-- Main App Container -->
    <div class="flex-1 relative overflow-hidden transition-all duration-300">
      
      <!-- Initial Loading State -->
      <div v-if="workspace.isLoadingWorkspace && !workspace.document" class="h-full w-full flex flex-col items-center justify-center bg-slate-950 space-y-4">
        <LoaderIcon class="w-8 h-8 animate-spin text-blue-500" />
        <span class="text-slate-400 font-medium text-sm tracking-wide animate-pulse">Initializing Single-Project Environment...</span>
      </div>
      
      <!-- UI Routing Logic -->
      <Workspace v-else-if="workspace.document" />
      <Uploader v-else />
      
    </div>

    <!-- HUD / System Diagnostics Toggle -->
    <button v-if="!showDiag" @click="showDiag = true" class="fixed bottom-4 right-4 z-[100] bg-slate-800/80 backdrop-blur hover:bg-slate-700 text-slate-400 hover:text-white p-2.5 rounded-full shadow-lg border border-slate-700 transition-all" title="View System Logs">
      <TerminalIcon class="w-4 h-4" />
    </button>

    <!-- HUD / System Diagnostics Panel -->
    <div v-if="showDiag" class="absolute bottom-0 left-0 right-0 h-72 bg-slate-950 border-t border-slate-800 font-mono text-xs flex flex-col z-[100] shadow-[0_-20px_40px_rgba(0,0,0,0.5)] transition-all duration-300">
      <div class="h-10 shrink-0 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 cursor-pointer text-slate-400 hover:text-slate-200 select-none transition-colors" @click="showDiag = false">
        <div class="flex items-center gap-6">
          <span class="font-bold tracking-wide flex items-center gap-2">
            <TerminalIcon class="w-4 h-4 text-blue-400" />
            SYSTEM DIAGNOSTICS & LOGS
          </span>
          <div class="flex items-center gap-4 border-l border-slate-700 pl-4 hidden sm:flex">
            <span class="text-indigo-400" title="Total Documents in DB">DB Docs: {{ workspace.globalStats.totalDocuments }}</span>
            <span class="text-emerald-400" title="Total Active Pages in DB">DB Active Pages: {{ workspace.globalStats.totalPages }}</span>
            <span class="text-red-400" title="Total Deleted Pages in DB">DB Deleted: {{ workspace.globalStats.deletedPages }}</span>
          </div>
        </div>
        <ChevronDownIcon class="w-4 h-4" />
      </div>
      
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
import { LoaderIcon, TerminalIcon, ChevronDownIcon } from 'lucide-vue-next';
import { onMounted, ref, watch, nextTick } from 'vue';

const workspace = useWorkspaceStore();
const showDiag = ref(false); 
const logContainer = ref(null);

watch(() => workspace.logs.length, async () => {
  if (showDiag.value) {
    await nextTick();
    if (logContainer.value) logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
});

onMounted(() => workspace.fetchWorkspace());
</script>

<style>
/* Global custom scrollbars to maintain the sleek feel */
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #475569; }
</style>