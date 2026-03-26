<template>
  <div class="h-full flex flex-col bg-[#0a0c10] text-slate-200 relative">
    
    <template v-if="page">
      <!-- Toolbar Header -->
      <div class="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-[#0f1117] shrink-0 z-10 shadow-sm">
        <div class="flex items-center space-x-3">
          <span class="text-xs font-bold text-slate-400 whitespace-nowrap">Page {{ page.sort_order }}</span>
          <div class="w-px h-4 bg-slate-700"></div>
          
          <div class="flex space-x-1">
            <button @click="rotate" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 transition-colors" title="Rotate Image">
              <RotateCwIcon class="w-3.5 h-3.5" />
            </button>
            <button @click="toggleExclude" class="p-1.5 rounded hover:bg-slate-800 transition-colors" :class="page.is_excluded ? 'text-red-400 bg-red-900/20' : 'text-slate-400'" title="Exclude from Export">
              <BanIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div class="flex items-center bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 shadow-inner max-w-[140px]">
          <div class="w-1.5 h-1.5 rounded-full mr-2 shrink-0" :class="{'bg-emerald-500': localStatus === 'approved', 'bg-red-500': localStatus === 'needs_work', 'bg-amber-500': localStatus === 'pending_review'}"></div>
          <select v-model="localStatus" @change="saveMetadata" class="bg-transparent border-none text-[11px] font-semibold cursor-pointer outline-none appearance-none pr-4 w-full truncate focus:ring-0" :class="{'text-emerald-400': localStatus === 'approved', 'text-red-400': localStatus === 'needs_work', 'text-amber-400': localStatus === 'pending_review'}">
            <option value="pending_review" class="bg-slate-900 text-amber-400">Pending</option>
            <option value="approved" class="bg-slate-900 text-emerald-400">Approved</option>
            <option value="needs_work" class="bg-slate-900 text-red-400">Needs Work</option>
          </select>
        </div>
      </div>

      <!-- Top Half: Pan & Zoom Raw Image Viewer -->
      <div class="flex-1 relative bg-[#050608] border-b border-slate-800 overflow-hidden cursor-grab active:cursor-grabbing group"
           @wheel="handleWheel" @mousedown="startPan" @mousemove="doPan" @mouseup="endPan" @mouseleave="endPan">
        
        <!-- Progressive Loader -->
        <div v-if="imageLoading" class="absolute inset-0 flex items-center justify-center bg-slate-950/50 z-10 backdrop-blur-sm transition-opacity duration-300">
          <LoaderIcon class="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        
        <div v-if="page.is_excluded" class="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
          <span class="text-xs font-bold tracking-widest bg-red-600/90 text-white px-3 py-1.5 rounded shadow-lg border border-red-500">EXCLUDED</span>
        </div>

        <img 
          :src="page.image_url" 
          @load="imageLoading = false"
          loading="eager"
          decoding="async"
          class="max-w-none origin-top-left will-change-transform shadow-2xl transition-opacity duration-300"
          :class="imageLoading ? 'opacity-0' : 'opacity-100'"
          :style="{ transform: `translate(${panX}px, ${panY}px) scale(${zoomScale}) rotate(${page.rotation}deg)` }"
          draggable="false"
        />

        <!-- Image Controls Overlay -->
        <div class="absolute bottom-3 right-3 z-30 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-1 shadow-lg flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button @click="zoomOut" class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"><ZoomOutIcon class="w-3.5 h-3.5"/></button>
          <button @click="resetZoom" class="px-2 text-slate-300 hover:text-white font-mono text-[10px] min-w-[3rem] text-center" title="Reset View">{{ Math.round(zoomScale * 100) }}%</button>
          <button @click="zoomIn" class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"><ZoomInIcon class="w-3.5 h-3.5"/></button>
        </div>
      </div>

      <!-- Bottom Half: Data Tabs (45% Height) -->
      <div class="h-[45%] flex flex-col bg-[#0e1116] shrink-0 relative">
        <div class="flex items-center justify-between px-2 h-10 border-b border-slate-800 bg-slate-900/50 shrink-0 overflow-x-auto custom-scrollbar">
          <div class="flex space-x-1">
            <button @click="activeTab = 'es'" class="px-3 h-10 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2" :class="activeTab === 'es' ? 'text-blue-400 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'">Spanish OCR <span v-if="dirtyFlags.source" class="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1"></span></button>
            <button @click="activeTab = 'en'" class="px-3 h-10 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2" :class="activeTab === 'en' ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'">Raw English <span v-if="dirtyFlags.translated" class="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full ml-1"></span></button>
            <button @click="activeTab = 'json'" class="px-3 h-10 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2" :class="activeTab === 'json' ? 'text-purple-400 border-purple-500' : 'text-slate-500 border-transparent hover:text-slate-300'">JSON Data <span v-if="dirtyFlags.json" class="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full ml-1"></span></button>
          </div>
          
          <button @click="saveReview" :disabled="!isDirty" class="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all shadow shrink-0 ml-4 disabled:opacity-0 disabled:pointer-events-none" :class="isDirty ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-transparent text-transparent'">Sync Edits</button>
        </div>

        <textarea v-show="activeTab === 'es'" v-model="localSource" class="w-full flex-1 bg-transparent text-slate-400 font-mono text-[12px] leading-relaxed p-4 border-none focus:ring-0 resize-none outline-none custom-scrollbar"></textarea>
        <textarea v-show="activeTab === 'en'" v-model="localTranslation" class="w-full flex-1 bg-transparent text-emerald-400 font-mono text-[12px] leading-relaxed p-4 border-none focus:ring-0 resize-none outline-none custom-scrollbar"></textarea>
        <textarea v-show="activeTab === 'json'" v-model="localJson" @blur="saveJson" class="w-full flex-1 bg-transparent text-purple-400 font-mono text-[11px] leading-relaxed p-4 border-none focus:ring-0 resize-none outline-none custom-scrollbar"></textarea>
      </div>
    </template>
    
    <div v-else class="h-full flex flex-col items-center justify-center text-slate-500">
      <div class="bg-slate-900/50 p-6 rounded-full mb-4 border border-slate-800 shadow-inner"><LayoutIcon class="w-8 h-8 text-slate-600" /></div>
      <p class="text-sm font-medium">Select a page to inspect.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive, nextTick } from 'vue';
import { BanIcon, RotateCwIcon, ZoomInIcon, ZoomOutIcon, LoaderIcon, LayoutIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();
const page = computed(() => workspace.activePage);

// Text & Validation State
const activeTab = ref('es');
const localSource = ref('');
const localTranslation = ref('');
const localJson = ref('');
const localStatus = ref('pending_review');
const dirtyFlags = reactive({ source: false, translated: false, json: false });

const isDirty = computed(() => dirtyFlags.source || dirtyFlags.translated);

// Pan & Zoom Engine State
const imageLoading = ref(true);
const zoomScale = ref(1);
const panX = ref(0);
const panY = ref(0);
const isDragging = ref(false);
let startX = 0;
let startY = 0;

watch(() => page.value, (p) => {
  if (p) {
    // Reset Data
    localSource.value = p.source_text || '';
    localTranslation.value = p.translated_text || '';
    localJson.value = p.extracted_json ? JSON.stringify(JSON.parse(p.extracted_json), null, 2) : '';
    localStatus.value = p.status || 'pending_review';
    dirtyFlags.source = false;
    dirtyFlags.translated = false;
    dirtyFlags.json = false;
    
    // Reset Image Engine
    imageLoading.value = true;
    resetZoom();
  }
}, { immediate: true, deep: true });

watch(localSource, (val) => { if(page.value) dirtyFlags.source = val !== (page.value.source_text || ''); });
watch(localTranslation, (val) => { if(page.value) dirtyFlags.translated = val !== (page.value.translated_text || ''); });
watch(localJson, (val) => { 
  if(page.value) {
    const orig = page.value.extracted_json ? JSON.stringify(JSON.parse(page.value.extracted_json), null, 2) : '';
    dirtyFlags.json = val !== orig; 
  }
});

// High-Performance Pan/Zoom Logic
const handleWheel = (e) => {
  e.preventDefault();
  const sensitivity = 0.0015;
  const delta = -e.deltaY * sensitivity;
  zoomScale.value = Math.min(Math.max(0.1, zoomScale.value + delta), 8);
};

const startPan = (e) => {
  isDragging.value = true;
  startX = e.clientX - panX.value;
  startY = e.clientY - panY.value;
};

const doPan = (e) => {
  if (!isDragging.value) return;
  // Use requestAnimationFrame natively bounded by Vue reactivity
  panX.value = e.clientX - startX;
  panY.value = e.clientY - startY;
};

const endPan = () => { isDragging.value = false; };
const zoomIn = () => { zoomScale.value = Math.min(8, zoomScale.value + 0.25); };
const zoomOut = () => { zoomScale.value = Math.max(0.1, zoomScale.value - 0.25); };
const resetZoom = () => { zoomScale.value = 1; panX.value = 0; panY.value = 0; };

// Metadata & Sync Handlers
const saveMetadata = async () => {
  if (!page.value) return;
  await workspace.updatePageInfo(page.value.id, { status: localStatus.value });
};

const saveReview = async () => {
  if (!page.value) return;
  const updates = {};
  if (dirtyFlags.source) updates.source_text = localSource.value;
  if (dirtyFlags.translated) {
    updates.translated_text = localTranslation.value;
    updates.is_manual_translation = true;
  }
  
  if (Object.keys(updates).length > 0) {
    await workspace.updatePageInfo(page.value.id, updates);
    if (updates.translated_text && page.value.source_text) {
      try {
        const res = await $fetch(`/api/pages/${page.value.id}/sync-layout`, {
          method: 'POST',
          body: { translated_text: updates.translated_text, source_text: page.value.source_text }
        });
        const compactJson = JSON.stringify(res.json, null, 2);
        localJson.value = compactJson;
        await workspace.updatePageInfo(page.value.id, { extracted_json: compactJson, is_stale: false });
      } catch(e) { console.warn("Background layout sync failed:", e.message); }
    }
    
    dirtyFlags.source = false;
    dirtyFlags.translated = false;
  }
};

const saveJson = async () => {
  if (!page.value || !dirtyFlags.json) return;
  try {
    const parsed = JSON.parse(localJson.value);
    const compactJson = JSON.stringify(parsed);
    await workspace.updatePageInfo(page.value.id, { extracted_json: compactJson });
    dirtyFlags.json = false;
  } catch (e) { alert("Invalid JSON format."); }
};

const toggleExclude = async () => {
  if (!page.value) return;
  await workspace.updatePageInfo(page.value.id, { is_excluded: !page.value.is_excluded });
};

const rotate = async () => {
  if (!page.value) return;
  const newRotation = (page.value.rotation + 90) % 360;
  await workspace.updatePageInfo(page.value.id, { rotation: newRotation });
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #334155; border-radius: 4px; border: 2px solid transparent; background-clip: padding-box; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #475569; }
</style>