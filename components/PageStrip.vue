<template>
  <div class="flex flex-col h-full overflow-hidden bg-slate-900 border-r border-slate-700 shadow-xl z-20">
    <div class="p-3.5 border-b border-slate-700 flex justify-between items-center bg-slate-800">
      <span class="text-xs font-bold text-slate-300 uppercase tracking-widest">Pages ({{ workspace.orderedPages.length }})</span>
      <button @click="selectAll" class="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">Select All</button>
    </div>
    
    <div class="flex-1 overflow-y-auto p-3 space-y-4" @dragover.prevent @drop="onDrop">
      <div 
        v-for="(page, idx) in workspace.orderedPages" 
        :key="page.id"
        draggable="true"
        @dragstart="onDragStart($event, page.id)"
        @dragenter="onDragEnter(idx)"
        @click="onClick(page.id, $event)"
        class="group relative flex flex-col cursor-pointer rounded-xl p-2 bg-slate-800 transition-all select-none border-2"
        :class="workspace.selectedPageIds.has(page.id) ? 'border-blue-500 bg-blue-900/20 shadow-lg shadow-blue-900/10' : 'border-transparent hover:border-slate-600'"
      >
        <div class="relative w-full aspect-[1/1.4] bg-slate-950 rounded-md overflow-hidden shadow-inner border border-slate-700/50">
          <img :src="page.image_url" class="w-full h-full object-contain pointer-events-none" :style="{ transform: `rotate(${page.rotation}deg)` }" />
          
          <div class="absolute bottom-1.5 right-1.5 flex space-x-1.5">
            <span v-if="page.job_status === 'processing'" class="bg-blue-600/90 shadow-sm p-1.5 rounded-full backdrop-blur"><LoaderIcon class="w-3.5 h-3.5 text-white animate-spin"/></span>
            <span v-else-if="page.job_status === 'completed'" class="bg-emerald-600/90 shadow-sm p-1.5 rounded-full backdrop-blur"><CheckIcon class="w-3.5 h-3.5 text-white"/></span>
            <span v-else-if="page.job_status === 'error'" class="bg-red-600/90 shadow-sm p-1.5 rounded-full backdrop-blur"><AlertCircleIcon class="w-3.5 h-3.5 text-white"/></span>
          </div>
          
          <div v-if="page.is_excluded" class="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[2px]">
            <span class="text-[10px] font-bold tracking-widest bg-red-600/90 text-white px-2.5 py-1 rounded shadow-lg border border-red-500">EXCLUDED</span>
          </div>
        </div>
        
        <div class="mt-2.5 flex flex-col px-1">
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs font-semibold text-slate-200">Page {{ page.sort_order }}</span>
            <span v-if="page.job_duration_sec" class="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">{{ page.job_duration_sec }}s</span>
          </div>
          <span class="text-[10px] text-slate-400 truncate w-full" :title="page.source_filename">
            {{ page.source_filename }}
          </span>
        </div>
      </div>
    </div>

    <!-- Append PDFs Toolbar Area -->
    <div class="p-4 border-t border-slate-700 bg-slate-800">
      <label v-if="!workspace.isUploading" class="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-md cursor-pointer flex justify-center items-center transition-colors shadow-sm">
        <PlusIcon class="w-4 h-4 mr-2" /> Append PDFs
        <input type="file" class="hidden" accept="application/pdf" multiple @change="appendFiles" />
      </label>
      <div v-else class="flex flex-col space-y-2">
        <div class="flex justify-between items-center text-xs text-blue-400 font-medium px-1">
          <span class="flex items-center"><LoaderIcon class="w-3 h-3 mr-1.5 animate-spin"/> Processing</span>
          <span>{{ workspace.uploadProgress }}%</span>
        </div>
        <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div class="bg-blue-500 h-full transition-all duration-300" :style="{ width: `${workspace.uploadProgress}%` }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { LoaderIcon, CheckIcon, AlertCircleIcon, PlusIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();
const draggedId = ref(null);
const dragTargetIdx = ref(null);

const appendFiles = (e) => {
  const files = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
  if (files.length) workspace.addFiles(files);
  e.target.value = null; 
};

const onClick = (id, e) => {
  workspace.selectPage(id, e.metaKey || e.ctrlKey, e.shiftKey);
};

const selectAll = () => {
  workspace.orderedPages.forEach(p => workspace.selectedPageIds.add(p.id));
};

const onDragStart = (e, id) => {
  draggedId.value = id;
  e.dataTransfer.effectAllowed = 'move';
};
const onDragEnter = (idx) => {
  dragTargetIdx.value = idx;
};
const onDrop = async () => {
  if (!draggedId.value || dragTargetIdx.value === null) return;
  const list = [...workspace.orderedPages];
  const fromIdx = list.findIndex(p => p.id === draggedId.value);
  const toIdx = dragTargetIdx.value;
  
  const [moved] = list.splice(fromIdx, 1);
  list.splice(toIdx, 0, moved);
  
  await workspace.updatePageOrder(list.map(p => p.id));
  draggedId.value = null;
  dragTargetIdx.value = null;
};
</script>