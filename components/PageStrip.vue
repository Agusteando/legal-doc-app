<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="p-3 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center bg-slate-800">
      <span>Pages ({{ workspace.orderedPages.length }})</span>
      <button @click="selectAll" class="hover:text-white transition-colors">Select All</button>
    </div>
    
    <div class="flex-1 overflow-y-auto p-2 space-y-3" @dragover.prevent @drop="onDrop">
      <div 
        v-for="(page, idx) in workspace.orderedPages" 
        :key="page.id"
        draggable="true"
        @dragstart="onDragStart($event, page.id)"
        @dragenter="onDragEnter(idx)"
        @click="onClick(page.id, $event)"
        class="group relative flex flex-col cursor-pointer rounded-lg p-1.5 bg-slate-800 transition-all select-none border border-transparent"
        :class="workspace.selectedPageIds.has(page.id) ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'hover:border-slate-600'"
      >
        <div class="relative w-full aspect-[1/1.4] bg-slate-900 rounded overflow-hidden shadow-inner">
          <img :src="page.image_url" class="w-full h-full object-contain pointer-events-none" :style="{ transform: `rotate(${page.rotation}deg)` }" />
          
          <div class="absolute bottom-1 right-1 flex space-x-1">
            <span v-if="page.job_status === 'processing'" class="bg-blue-600 p-1 rounded-full"><LoaderIcon class="w-3 h-3 text-white animate-spin"/></span>
            <span v-else-if="page.job_status === 'completed'" class="bg-green-600 p-1 rounded-full"><CheckIcon class="w-3 h-3 text-white"/></span>
            <span v-else-if="page.job_status === 'error'" class="bg-red-600 p-1 rounded-full"><AlertCircleIcon class="w-3 h-3 text-white"/></span>
          </div>
          
          <div v-if="page.is_excluded" class="absolute inset-0 bg-red-900/40 flex items-center justify-center backdrop-blur-[1px]">
            <span class="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded shadow">EXCLUDED</span>
          </div>
        </div>
        
        <div class="mt-1.5 flex flex-col px-1">
          <div class="flex justify-between items-center mb-0.5">
            <span class="text-xs font-bold text-slate-300">Pg {{ page.sort_order }}</span>
            <span v-if="page.job_duration_sec" class="text-[10px] text-slate-500">{{ page.job_duration_sec }}s</span>
          </div>
          <span class="text-[10px] text-slate-500 truncate" :title="page.source_filename">
            Source: {{ page.source_filename }}
          </span>
        </div>
      </div>
    </div>

    <!-- Append More PDFs -->
    <div class="p-3 border-t border-slate-700 bg-slate-800">
      <label v-if="!workspace.isUploading" class="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded cursor-pointer flex justify-center items-center transition-colors">
        <PlusIcon class="w-4 h-4 mr-2" /> Append PDFs
        <input type="file" class="hidden" accept="application/pdf" multiple @change="appendFiles" />
      </label>
      <div v-else class="text-xs text-blue-400 text-center flex items-center justify-center">
        <LoaderIcon class="w-3 h-3 mr-2 animate-spin"/> {{ workspace.uploadProgress }}%
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
  e.target.value = null; // reset input
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