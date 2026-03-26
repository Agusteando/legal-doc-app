<template>
  <div class="flex flex-col h-full overflow-hidden bg-slate-950 shadow-xl z-20">
    
    <!-- Utility Header -->
    <div class="p-3 border-b border-slate-800 flex justify-between items-center shrink-0 bg-slate-900">
      <div class="flex items-center space-x-2">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pages ({{ workspace.orderedPages.length }})</span>
      </div>
      <div class="flex space-x-2">
        <button @click="workspace.processSelected()" :disabled="!workspace.selectedPageIds.size" class="text-[11px] text-emerald-400 hover:text-emerald-300 disabled:opacity-30 font-medium transition-colors flex items-center" title="Process Selected"><CpuIcon class="w-3.5 h-3.5 mr-1" /> Run</button>
        <div class="w-px h-3 bg-slate-700 self-center"></div>
        <button @click="onAddPagesClick" class="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center" title="Insert PDFs"><PlusIcon class="w-3.5 h-3.5 mr-0.5" /> Add</button>
      </div>
    </div>
    
    <!-- Dense Page List -->
    <div class="relative flex-1 overflow-y-auto p-2 space-y-1 bg-[#0a0c10]"
         @dragover.prevent="onDragOver"
         @dragleave.prevent="onDragLeave"
         @drop.prevent="onDrop">
         
      <div v-for="(page, idx) in workspace.orderedPages" :key="page.id">
        <!-- Drop Indicator -->
        <div v-if="dropIndicatorIndex === idx" class="h-0.5 bg-blue-500 rounded my-0.5 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
        
        <div 
          draggable="true"
          :data-index="idx"
          @dragstart="onDragStart($event, page.id)"
          @click="onClick(page.id, $event)"
          @contextmenu.prevent="openContextMenu($event, page.id)"
          class="page-item group relative flex items-center gap-3 p-2 cursor-pointer rounded-lg border transition-all select-none"
          :class="workspace.selectedPageIds.has(page.id) ? 'border-blue-500/50 bg-blue-600/10' : 'border-transparent hover:bg-slate-800/60'"
        >
          <!-- Drag Handle -->
          <GripVerticalIcon class="w-4 h-4 text-slate-600 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          
          <!-- Mini Thumbnail -->
          <div class="w-9 h-12 bg-slate-900 border border-slate-700/80 rounded overflow-hidden shrink-0 relative shadow-sm flex items-center justify-center">
            <img :src="page.image_url" class="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" :style="{ transform: `rotate(${page.rotation}deg)` }" />
            <div v-if="page.is_excluded" class="absolute inset-0 bg-slate-950/70 flex items-center justify-center"><BanIcon class="w-4 h-4 text-red-500/80" /></div>
            <div v-if="page.job_status === 'processing'" class="absolute inset-0 bg-blue-900/40 flex items-center justify-center"><LoaderIcon class="w-3 h-3 text-white animate-spin"/></div>
            <div v-if="page.job_status === 'error'" class="absolute inset-0 bg-red-900/60 flex items-center justify-center"><AlertCircleIcon class="w-3 h-3 text-white"/></div>
          </div>
          
          <!-- Meta Info -->
          <div class="flex-1 min-w-0 flex flex-col justify-center">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-xs font-semibold text-slate-200">Page {{ page.sort_order }}</span>
              <!-- Status Dot -->
              <div class="w-2 h-2 rounded-full shrink-0 shadow-sm" :class="{
                'bg-emerald-500': page.status === 'approved',
                'bg-red-500': page.status === 'needs_work',
                'bg-amber-500': page.status === 'pending_review'
              }"></div>
            </div>
            <div class="flex space-x-1.5 items-center">
              <span v-if="page.is_stale" class="w-1.5 h-1.5 bg-yellow-500 rounded-full" title="Stale Content"></span>
              <span v-if="page.is_manual_translation" class="w-1.5 h-1.5 bg-purple-500 rounded-full" title="Edited Content"></span>
              <span class="text-[10px] text-slate-500 truncate w-full" :title="page.source_filename">{{ page.source_filename }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Bottom Drop Indicator -->
      <div v-if="dropIndicatorIndex === workspace.orderedPages.length" class="h-0.5 bg-blue-500 rounded my-0.5 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
    </div>

    <!-- Hidden Input for Page Replacement -->
    <input type="file" ref="replaceFileInput" class="hidden" accept="application/pdf" @change="onReplaceFile" />

    <!-- Context Menu Portal -->
    <teleport to="body">
      <div v-if="contextMenu.visible" 
           :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" 
           class="fixed z-[100] bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1.5 w-52 text-[13px] text-slate-200 backdrop-blur-md">
        <button @click.stop="handleContextAction('process')" class="w-full flex items-center px-4 py-2 hover:bg-blue-600 transition-colors"><CpuIcon class="w-4 h-4 mr-2"/> Process Again</button>
        <div class="h-px bg-slate-700/50 my-1"></div>
        <button @click.stop="handleContextAction('replace')" class="w-full flex items-center px-4 py-2 hover:bg-slate-700 transition-colors"><FileIcon class="w-4 h-4 mr-2"/> Replace Source File</button>
        <div class="h-px bg-slate-700/50 my-1"></div>
        <button @click.stop="handleContextAction('approved')" class="w-full flex items-center px-4 py-2 hover:bg-slate-700 transition-colors text-emerald-400"><CheckCircleIcon class="w-4 h-4 mr-2"/> Mark Approved</button>
        <button @click.stop="handleContextAction('needs_work')" class="w-full flex items-center px-4 py-2 hover:bg-slate-700 transition-colors text-red-400"><XCircleIcon class="w-4 h-4 mr-2"/> Mark Needs Work</button>
        <div class="h-px bg-slate-700/50 my-1"></div>
        <button @click.stop="handleContextAction('exclude')" class="w-full flex items-center px-4 py-2 hover:bg-slate-700 transition-colors"><BanIcon class="w-4 h-4 mr-2"/> Toggle Exclude</button>
        <button @click.stop="handleContextAction('delete')" class="w-full flex items-center px-4 py-2 hover:bg-red-900/40 transition-colors text-red-400"><TrashIcon class="w-4 h-4 mr-2"/> Delete Page</button>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { LoaderIcon, AlertCircleIcon, PlusIcon, GripVerticalIcon, CheckCircleIcon, XCircleIcon, CpuIcon, BanIcon, TrashIcon, FileIcon } from 'lucide-vue-next';
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

const onClick = (id, e) => { workspace.selectPage(id, e.metaKey || e.ctrlKey, e.shiftKey); };

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
  
  if (action === 'process') { workspace.selectPage(id); workspace.processSelected(); }
  else if (action === 'replace') replaceFileInput.value.click();
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
  if (files.length && id) await workspace.replacePage(id, files[0]);
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
  if (!target) { dropIndicatorIndex.value = workspace.orderedPages.length; return; }
  const rect = target.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const idx = parseInt(target.dataset.index, 10);
  if (e.clientY < midY) dropIndicatorIndex.value = idx;
  else dropIndicatorIndex.value = idx + 1;
};

const onDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) dropIndicatorIndex.value = null; };

const onDrop = async (e) => {
  const insertIndex = dropIndicatorIndex.value;
  dropIndicatorIndex.value = null;
  if (insertIndex === null) return;
  
  const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type === 'application/pdf');
  
  if (files.length > 0) {
    let insertAfterId = null;
    if (insertIndex === 0) insertAfterId = 'START';
    else if (insertIndex <= workspace.orderedPages.length) insertAfterId = workspace.orderedPages[insertIndex - 1].id;
    await workspace.insertFiles(files, insertAfterId);
    return;
  }
  
  if (draggedId.value) {
    const list = [...workspace.orderedPages];
    const fromIdx = list.findIndex(p => p.id === draggedId.value);
    if (fromIdx === -1) return;
    
    let toIdx = insertIndex;
    if (fromIdx < toIdx) toIdx--; 
    
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    await workspace.updatePageOrder(list.map(p => p.id));
    draggedId.value = null;
  }
};
</script>