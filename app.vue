<template>
  <div class="h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30" style="font-family: 'Inter', sans-serif;">
    <!-- Initial Loading State -->
    <div v-if="workspace.isLoadingWorkspace && !workspace.document" class="h-full w-full flex flex-col items-center justify-center bg-slate-900 space-y-4">
      <LoaderIcon class="w-8 h-8 animate-spin text-blue-500" />
      <span class="text-slate-400 font-medium text-sm tracking-wide animate-pulse">Loading Workspace...</span>
    </div>
    
    <!-- Active Workspace Routing -->
    <Workspace v-else-if="workspace.document" />
    <Uploader v-else />

    <!-- Error / Diagnostic Overlay (Fixed bottom right) -->
    <div v-if="workspace.isErrorState" class="fixed bottom-4 right-4 bg-red-900/95 backdrop-blur border border-red-500 rounded-lg p-5 shadow-2xl max-w-sm z-[90]">
      <h3 class="text-white font-bold mb-1 flex items-center"><AlertCircleIcon class="w-4 h-4 mr-2" /> Pipeline Error</h3>
      <p class="text-red-200 text-sm mb-4 leading-snug">{{ workspace.errorMessage }}</p>
      <div class="flex space-x-3">
        <button @click="showDiagnostics = true" class="text-xs font-semibold bg-slate-800 text-white px-3 py-2 rounded hover:bg-slate-700 transition-colors">View Logs</button>
        <button @click="workspace.clearWorkspace()" class="text-xs font-semibold bg-red-600 text-white px-3 py-2 rounded hover:bg-red-500 transition-colors">Reset Session</button>
      </div>
    </div>

    <!-- Full Diagnostics Modal -->
    <div v-if="showDiagnostics" class="fixed inset-0 bg-slate-950/95 z-[100] flex flex-col p-8 backdrop-blur-sm">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white mb-1">Diagnostic Logs</h2>
          <p class="text-sm text-slate-400">End-to-end trace of the upload and fetch pipeline.</p>
        </div>
        <button @click="showDiagnostics = false" class="text-slate-400 hover:text-white px-4 py-2 border border-slate-700 rounded-lg hover:bg-slate-800 transition-all">Close Console</button>
      </div>
      <div class="flex-1 bg-black rounded-lg border border-slate-700 p-6 overflow-y-auto font-mono text-[13px] leading-relaxed text-emerald-400 shadow-inner">
        <div v-for="(log, idx) in workspace.diagnosticLogs" :key="idx" class="mb-1.5 border-b border-slate-800/50 pb-1.5 last:border-0 hover:bg-slate-900/50 px-2 -mx-2 rounded">
          <span class="text-slate-500 text-[11px] mr-3">{{ log.time }}</span>
          <span :class="{'text-red-400 font-bold': log.msg.includes('ERROR'), 'text-blue-400': log.msg.includes('POST') || log.msg.includes('GET')}">{{ log.msg }}</span>
        </div>
        <div v-if="!workspace.diagnosticLogs.length" class="text-slate-500 italic text-center mt-10">No logs captured yet.</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useWorkspaceStore } from '~/stores/workspace';
import { LoaderIcon, AlertCircleIcon } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';

const workspace = useWorkspaceStore();
const showDiagnostics = ref(false);

// Always expose to window for debugging via browser console
if (typeof window !== 'undefined') {
  window.__WORKSPACE_DEBUG__ = () => { showDiagnostics.value = true; };
}

onMounted(() => workspace.fetchWorkspace());
</script>