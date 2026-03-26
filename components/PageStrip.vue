<template>
  <div class="flex flex-col h-full overflow-hidden bg-slate-900 border-r border-slate-800 shadow-xl z-20">
    <div class="p-4 border-b border-slate-800 flex justify-between items-center shrink-0 bg-slate-900">
      <div class="flex items-center space-x-2">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pages ({{ workspace.orderedPages.length }})</span>
      </div>
      <div class="flex space-x-2">
        <button @click="selectAll" class="text-[11px] text-slate-400 hover:text-blue-300 font-medium transition-colors" title="Select All"><CheckSquareIcon class="w-3.5 h-3.5" /></button>
        <button @click="onAddPagesClick" class="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center" title="Insert PDFs"><PlusIcon class="w-3.5 h-3.5 mr-0.5" /> Add</button>
      </div>
    </div>
    
    <div class="relative flex-1 overflow-y-auto p-3 space-y-3"
         @dragover.prevent="onDragOver"
         @dragleave.prevent="onDragLeave"
         @drop.prevent="onDrop">
         
      <div v-for="(page, idx) in workspace.orderedPages" :key="page.id">
        
        <!-- Insert Drop Indicator Line -->
        <div v-if="dropIndicatorIndex === idx" class="h-1 bg-blue-500 rounded my-1 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
        
        <div 
          draggable="true"
          :data-index="idx"
          @dragstart="onDragStart($event, page.id)"
          @click="onClick(page.id, $event)"
          @contextmenu.prevent="openContextMenu($event, page.id)"
          class="page-item group relative flex flex-col cursor-pointer rounded-xl p-2 transition-all select-none border"
          :class="workspace.selectedPageIds.has(page.id) ? 'border-blue-500/50 bg-blue-600/10' : 'border-transparent hover:bg-slate-800/50'"
        >
          <div class="relative w-full aspect-[1/1.4] bg-[#0f1117] rounded-lg overflow-hidden border border-slate-800/80 transition-all shadow-sm group-hover:shadow-md">
            <img :src="page.image_url" class="w-full h-full object-contain pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" :style="{ transform: `rotate(${page.rotation}deg)` }" />
            
            <div class="absolute top-2 left-2 flex flex-col gap-1.5 z-10 pointer-events-none">
              <div v-if="page.status === 'approved'" class="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm ring-2 ring-slate-900" title="Approved"></div>
              <div v-else-if="page.status === 'needs_work'" class="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm ring-2 ring-slate-900" title="Needs Work"></div>
              <div v-else class="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-sm ring-2 ring-slate-900" title="Pending Review"></div>
            </div>

            <div class="absolute bottom-2 right-2 flex space-x-1.5 z-10">
              <span v-if="page.job_status === 'processing'" class="bg-blue-600 shadow p-1 rounded-full"><LoaderIcon class="w-3 h-3 text-white animate-spin"/></span>
              <span v-else-if="page.job_status === 'error'" class="bg-red-600 shadow p-1 rounded-full"><AlertCircleIcon class="w-3 h-3 text-white"/></span>
            </div>
            
            <div v-if="page.is_excluded" class="absolute inset-0 bg-slate-950/60 flex items-center justify-center backdrop-blur-sm">
              <BanIcon class="w-8 h-8 text-red-500/80" />
            </div>
          </div>
          
          <div class="mt-2.5 flex flex-col px-1 relative">
            <div class="absolute top-0 right-0 flex space-x-1">
               <div v-if="page.is_stale" class="w-1.5 h-1.5 bg-yellow-500 rounded-full" title="Stale"></div>
               <div v-if="page.is_manual_translation" class="w-1.5 h-1.5 bg-purple-500 rounded-full" title="Edited"></div>
            </div>
            
            <div class="flex items-baseline space-x-2 mb-0.5">
              <span class="text-[11px] font-semibold text-slate-300">Page {{ page.sort_order }}</span>
              <span v-if="page.label" class="text-[10px] text-slate-500 truncate">- {{ page.label }}</span>
            </div>
            <span class="text-[9px] text-slate-600 truncate w-full" :title="page.source_filename">
              {{ page.source_filename }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Bottom Insert Indicator Line -->
      <div v-if="dropIndicatorIndex === workspace.orderedPages.length" class="h-1 bg-blue-500 rounded my-1 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
    </div>

    <!-- Hidden Input for Page Replacement -->
    <input type="file" ref="replaceFileInput" class="hidden" accept="application/pdf" @change="onReplaceFile" />

    <!-- Context Menu Portal -->
    <teleport to="body">
      <div v-if="contextMenu.visible" 
           :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" 
           class="fixed z-[100] bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1.5 w-52 text-[13px] text-slate-200 backdrop-blur-md">
        <button @click.stop="handleContextAction('process')" class="w-full flex items-center px-4 py-2 hover:bg-blue-600 transition-colors"><CpuIcon class="w-4 h-4 mr-2"/> Process</button>
        <div class="h-px bg-slate-700/50 my-1"></div>
        <button @click.stop="handleContextAction('replace')" class="w-full flex items-center px-4 py-2 hover:bg-slate-700 transition-colors"><FileIcon class="w-4 h-4 mr-2"/> Replace Page</button>
        <button @click.stop="handleContextAction('approved')" class="w-full flex items-center px-4 py-2 hover:bg-slate-700 transition-colors text-emerald-400"><CheckCircleIcon class="w-4 h-4 mr-2"/> Approve</button>
        <button @click.stop="handleContextAction('needs_work')" class="w-full flex items-center px-4 py-2 hover:bg-slate-700 transition-colors text-red-400"><XCircleIcon class="w-4 h-4 mr-2"/> Needs Work</button>
        <div class="h-px bg-slate-700/50 my-1"></div>
        <button @click.stop="handleContextAction('exclude')" class="w-full flex items-center px-4 py-2 hover:bg-slate-700 transition-colors"><BanIcon class="w-4 h-4 mr-2"/> Exclude</button>
        <button @click.stop="handleContextAction('delete')" class="w-full flex items-center px-4 py-2 hover:bg-red-900/40 transition-colors text-red-400"><TrashIcon class="w-4 h-4 mr-2"/> Delete</button>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { LoaderIcon, AlertCircleIcon, PlusIcon, CheckSquareIcon, CheckCircleIcon, XCircleIcon, CpuIcon, BanIcon, TrashIcon, FileIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();
const draggedId = ref(null);
const dropIndicatorIndex = ref(null);
const replaceFileInput = ref(null);
const contextMenu = ref({ visible: false, x: 0, y: 0, pageId: null });

const onAddPagesClick = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = 'application/pdf';
  input.onchange = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
    if (files.length) workspace.insertFiles(files);
  };
  input.click();
};

const onClick = (id, e) => {
  workspace.selectPage(id, e.metaKey || e.ctrlKey, e.shiftKey);
};

const selectAll = () => {
  workspace.orderedPages.forEach(p => workspace.selectedPageIds.add(p.id));
};

const openContextMenu = (e, id) => {
  const menuWidth = 208;
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
  else if (action === 'replace') {
     replaceFileInput.value.click();
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

const onReplaceFile = async (e) => {
  const files = e.target.files;
  const id = contextMenu.value.pageId;
  if (files.length && id) {
     await workspace.replacePage(id, files[0]);
  }
  e.target.value = null;
};

const onDragStart = (e, id) => {
  draggedId.value = id;
  e.dataTransfer.effectAllowed = 'move';
};

const onDragOver = (e) => {
  if (workspace.orderedPages.length === 0) {
    dropIndicatorIndex.value = 0;
    return;
  }
  
  const target = e.target.closest('.page-item');
  if (!target) {
    dropIndicatorIndex.value = workspace.orderedPages.length;
    return;
  }
  
  const rect = target.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const idx = parseInt(target.dataset.index, 10);
  
  if (e.clientY < midY) dropIndicatorIndex.value = idx;
  else dropIndicatorIndex.value = idx + 1;
};

const onDragLeave = (e) => {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    dropIndicatorIndex.value = null;
  }
};

const onDrop = async (e) => {
  const insertIndex = dropIndicatorIndex.value;
  dropIndicatorIndex.value = null;
  
  if (insertIndex === null) return;
  
  const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type === 'application/pdf');
  
  // External File Insertion via drag-and-drop
  if (files.length > 0) {
    let insertAfterId = null;
    if (insertIndex === 0) {
      insertAfterId = 'START';
    } else if (insertIndex <= workspace.orderedPages.length) {
      insertAfterId = workspace.orderedPages[insertIndex - 1].id;
    }
    await workspace.insertFiles(files, insertAfterId);
    return;
  }
  
  // Internal Page Reordering
  if (draggedId.value) {
    const list = [...workspace.orderedPages];
    const fromIdx = list.findIndex(p => p.id === draggedId.value);
    if (fromIdx === -1) return;
    
    let toIdx = insertIndex;
    if (fromIdx < toIdx) toIdx--; // adjust for item removal
    
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    
    await workspace.updatePageOrder(list.map(p => p.id));
    draggedId.value = null;
  }
};
</script>