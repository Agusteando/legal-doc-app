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
        @contextmenu.prevent="openContextMenu($event, page.id)"
        class="group relative flex flex-col cursor-pointer rounded-xl p-2 bg-slate-800 transition-all select-none border-2"
        :class="workspace.selectedPageIds.has(page.id) ? 'border-blue-500 bg-blue-900/20 shadow-lg shadow-blue-900/10' : 'border-transparent hover:border-slate-600'"
      >
        <div class="relative w-full aspect-[1/1.4] bg-slate-950 rounded-md overflow-hidden shadow-inner border border-slate-700/50">
          <img :src="page.image_url" class="w-full h-full object-contain pointer-events-none" :style="{ transform: `rotate(${page.rotation}deg)` }" />
          
          <!-- Status Indicators (Top Left) -->
          <div class="absolute top-1.5 left-1.5 flex flex-col gap-1.5 z-10 pointer-events-none">
            <span v-if="page.status === 'approved'" class="bg-emerald-500 text-white rounded p-1 shadow-md border border-emerald-400" title="Approved"><CheckCircleIcon class="w-3.5 h-3.5"/></span>
            <span v-else-if="page.status === 'needs_work'" class="bg-red-500 text-white rounded p-1 shadow-md border border-red-400" title="Needs Work"><XCircleIcon class="w-3.5 h-3.5"/></span>
            <span v-else class="bg-amber-500 text-white rounded p-1 shadow-md border border-amber-400" title="Pending Review"><ClockIcon class="w-3.5 h-3.5"/></span>
          </div>

          <!-- Job Status Overlay (Bottom Right) -->
          <div class="absolute bottom-1.5 right-1.5 flex space-x-1.5 z-10">
            <span v-if="page.job_status === 'processing'" class="bg-blue-600 shadow-md p-1.5 rounded-full"><LoaderIcon class="w-3.5 h-3.5 text-white animate-spin"/></span>
            <span v-else-if="page.job_status === 'error'" class="bg-red-600 shadow-md p-1.5 rounded-full"><AlertCircleIcon class="w-3.5 h-3.5 text-white"/></span>
          </div>
          
          <div v-if="page.is_excluded" class="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[2px]">
            <span class="text-[10px] font-bold tracking-widest bg-red-600/90 text-white px-2.5 py-1 rounded shadow-lg border border-red-500">EXCLUDED</span>
          </div>

          <!-- Label Ribbon -->
          <div v-if="page.label" class="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent z-10 pointer-events-none">
            <span class="block text-[10px] font-bold text-white truncate shadow-sm mt-4 text-center">
              {{ page.label }}
            </span>
          </div>
        </div>
        
        <div class="mt-2.5 flex flex-col px-1 relative">
          <div class="absolute -top-3.5 right-0 flex space-x-1">
             <div v-if="page.is_stale" class="w-2.5 h-2.5 bg-yellow-500 rounded-full shadow border border-slate-900" title="Stale content from file replacement"></div>
             <div v-if="page.is_manual_translation" class="w-2.5 h-2.5 bg-purple-500 rounded-full shadow border border-slate-900" title="Contains Manual Overrides"></div>
          </div>
          
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

    <!-- Context Menu Portal -->
    <teleport to="body">
      <div v-if="contextMenu.visible" 
           :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" 
           class="fixed z-[100] bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1.5 w-56 text-sm text-slate-200 backdrop-blur-md">
        <button @click.stop="handleContextAction('process')" class="w-full flex items-center px-4 py-2 hover:bg-blue-600 transition-colors"><CpuIcon class="w-4 h-4 mr-2"/> Process Extraction</button>
        <div class="h-px bg-slate-700/50 my-1"></div>
        <button @click.stop="handleContextAction('approved')" class="w-full flex items-center px-4 py-2 hover:bg-emerald-600 transition-colors text-emerald-400 hover:text-white"><CheckCircleIcon class="w-4 h-4 mr-2"/> Mark Approved</button>
        <button @click.stop="handleContextAction('needs_work')" class="w-full flex items-center px-4 py-2 hover:bg-red-600 transition-colors text-red-400 hover:text-white"><XCircleIcon class="w-4 h-4 mr-2"/> Mark Needs Work</button>
        <button @click.stop="handleContextAction('pending_review')" class="w-full flex items-center px-4 py-2 hover:bg-amber-600 transition-colors text-amber-400 hover:text-white"><ClockIcon class="w-4 h-4 mr-2"/> Reset to Pending</button>
        <div class="h-px bg-slate-700/50 my-1"></div>
        <button @click.stop="handleContextAction('exclude')" class="w-full flex items-center px-4 py-2 hover:bg-slate-700 transition-colors"><BanIcon class="w-4 h-4 mr-2"/> Toggle Exclude</button>
        <button @click.stop="handleContextAction('delete')" class="w-full flex items-center px-4 py-2 hover:bg-red-600 transition-colors text-red-400 hover:text-white"><TrashIcon class="w-4 h-4 mr-2"/> Delete Page</button>
      </div>
    </teleport>

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
import { ref, onMounted, onUnmounted } from 'vue';
import { LoaderIcon, CheckIcon, AlertCircleIcon, PlusIcon, ClockIcon, CheckCircleIcon, XCircleIcon, CpuIcon, BanIcon, TrashIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();
const draggedId = ref(null);
const dragTargetIdx = ref(null);
const contextMenu = ref({ visible: false, x: 0, y: 0, pageId: null });

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

const openContextMenu = (e, id) => {
  const menuWidth = 224; // approx w-56
  const menuHeight = 250; 
  let x = e.clientX;
  let y = e.clientY;
  
  if (x + menuWidth > window.innerWidth) x -= menuWidth;
  if (y + menuHeight > window.innerHeight) y -= menuHeight;

  contextMenu.value = { visible: true, x, y, pageId: id };
};

const closeContextMenu = () => { contextMenu.value.visible = false; };
onMounted(() => document.addEventListener('click', closeContextMenu));
onUnmounted(() => document.removeEventListener('click', closeContextMenu));

const handleContextAction = async (action) => {
  const id = contextMenu.value.pageId;
  if (!id) return;
  
  if (action === 'process') {
     workspace.selectPage(id);
     workspace.processSelected();
  }
  else if (action === 'approved' || action === 'needs_work' || action === 'pending_review') {
    await workspace.updatePageInfo(id, { status: action });
  }
  else if (action === 'exclude') {
     const p = workspace.pages.find(x => x.id === id);
     if(p) await workspace.updatePageInfo(id, { is_excluded: !p.is_excluded });
  }
  else if (action === 'delete') {
     if (confirm('Permanently delete this page?')) await workspace.deletePage(id);
  }
  closeContextMenu();
};

const onDragStart = (e, id) => {
  draggedId.value = id;
  e.dataTransfer.effectAllowed = 'move';
};
const onDragEnter = (idx) => { dragTargetIdx.value = idx; };
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