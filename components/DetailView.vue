<template>
  <div class="h-full flex flex-col bg-[#050608] border-r border-slate-800 text-slate-200 relative">
    
    <template v-if="page">
      <!-- Minimal Header -->
      <div class="h-14 border-b border-slate-800/80 flex items-center justify-between px-4 bg-[#0a0c10] shrink-0 z-10 shadow-sm">
        <div class="flex items-center space-x-3">
          <span class="text-xs font-bold tracking-widest text-slate-400 whitespace-nowrap uppercase">Page {{ page.sort_order }}</span>
          <div class="w-px h-4 bg-slate-800"></div>
          
          <div class="flex space-x-1">
            <button @click="rotate" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Rotate Image">
              <RotateCwIcon class="w-3.5 h-3.5" />
            </button>
            <button @click="toggleExclude" class="p-1.5 rounded hover:bg-slate-800 transition-colors" :class="page.is_excluded ? 'text-red-400 bg-red-900/20' : 'text-slate-400 hover:text-white'" title="Exclude from Export">
              <BanIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div class="flex items-center bg-slate-900 border border-slate-800 rounded px-2 py-1 shadow-inner max-w-[130px]">
          <div class="w-1.5 h-1.5 rounded-full mr-2 shrink-0" :class="{'bg-emerald-500': localStatus === 'approved', 'bg-red-500': localStatus === 'needs_work', 'bg-amber-500': localStatus === 'pending_review'}"></div>
          <select v-model="localStatus" @change="saveMetadata" class="bg-transparent border-none text-[10px] font-bold uppercase tracking-wider cursor-pointer outline-none appearance-none pr-4 w-full truncate focus:ring-0" :class="{'text-emerald-400': localStatus === 'approved', 'text-red-400': localStatus === 'needs_work', 'text-amber-400': localStatus === 'pending_review'}">
            <option value="pending_review" class="bg-slate-900 text-amber-400">Pending</option>
            <option value="approved" class="bg-slate-900 text-emerald-400">Approved</option>
            <option value="needs_work" class="bg-slate-900 text-red-400">Needs Work</option>
          </select>
        </div>
      </div>

      <!-- Main Validation Image: Amazon-Style Zoom -->
      <div class="flex-1 relative overflow-hidden flex items-center justify-center p-6 pb-16 z-0">
        <!-- Progressive Loader -->
        <div v-if="imageLoading" class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <LoaderIcon class="w-6 h-6 text-slate-600 animate-spin" />
        </div>
        
        <div v-if="page.is_excluded" class="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
          <span class="text-xs font-bold tracking-widest bg-red-600/90 text-white px-3 py-1.5 rounded shadow-lg border border-red-500">EXCLUDED</span>
        </div>

        <img 
          ref="imageContainer"
          :src="page.image_url" 
          @load="imageLoading = false"
          @mouseenter="isZoomed = true"
          @mouseleave="isZoomed = false; transformOrigin = '50% 50%'"
          @mousemove="onMouseMove"
          class="block max-w-full max-h-full object-contain cursor-crosshair shadow-2xl transition-transform duration-100 ease-out will-change-transform"
          :class="imageLoading ? 'opacity-0' : 'opacity-100'"
          :style="{ transform: `rotate(${page.rotation}deg) scale(${isZoomed ? 2.5 : 1})`, transformOrigin }"
          draggable="false"
        />
      </div>

      <!-- Floating Data Inspector Drawer -->
      <div class="absolute bottom-0 left-0 right-0 bg-[#0f1117]/95 backdrop-blur-md border-t border-slate-800 transition-all duration-300 ease-in-out flex flex-col z-30 shadow-[0_-20px_40px_rgba(0,0,0,0.4)]"
           :class="activeTab ? 'h-[45%]' : 'h-11'">
        
        <!-- Drawer Header Tabs -->
        <div class="h-11 flex items-center px-4 space-x-3 border-b border-transparent shrink-0" :class="{'border-slate-800': activeTab}">
          <button @click="toggleTab('es')" class="text-[10px] font-bold uppercase tracking-wider transition-colors hover:text-slate-300 flex items-center" :class="activeTab === 'es' ? 'text-blue-400' : 'text-slate-500'">Spanish OCR <span v-if="dirtyFlags.source" class="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1.5 shadow"></span></button>
          <button @click="toggleTab('en')" class="text-[10px] font-bold uppercase tracking-wider transition-colors hover:text-slate-300 flex items-center" :class="activeTab === 'en' ? 'text-emerald-400' : 'text-slate-500'">Raw English <span v-if="dirtyFlags.translated" class="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full ml-1.5 shadow"></span></button>
          <button @click="toggleTab('json')" class="text-[10px] font-bold uppercase tracking-wider transition-colors hover:text-slate-300 flex items-center" :class="activeTab === 'json' ? 'text-purple-400' : 'text-slate-500'">JSON Data <span v-if="dirtyFlags.json" class="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full ml-1.5 shadow"></span></button>
          
          <div class="flex-1"></div>
          
          <button v-if="activeTab" @click="saveReview" :disabled="!isDirty" class="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-0 disabled:pointer-events-none" :class="isDirty ? 'bg-blue-600 text-white hover:bg-blue-500 shadow' : 'bg-transparent text-transparent'">Sync Edits</button>
          <button v-if="activeTab" @click="activeTab = null" class="ml-2 p-1 text-slate-500 hover:text-white transition-colors" title="Close Panel"><ChevronDownIcon class="w-4 h-4" /></button>
        </div>

        <!-- Drawer Content -->
        <div v-show="activeTab" class="flex-1 relative p-4 flex flex-col bg-[#0a0c10] overflow-hidden">
          <textarea v-show="activeTab === 'es'" v-model="localSource" class="w-full flex-1 bg-transparent text-slate-400 font-mono text-[12px] leading-relaxed border-none focus:ring-0 resize-none outline-none custom-scrollbar"></textarea>
          <textarea v-show="activeTab === 'en'" v-model="localTranslation" class="w-full flex-1 bg-transparent text-emerald-400 font-mono text-[12px] leading-relaxed border-none focus:ring-0 resize-none outline-none custom-scrollbar"></textarea>
          <textarea v-show="activeTab === 'json'" v-model="localJson" @blur="saveJson" class="w-full flex-1 bg-transparent text-purple-400 font-mono text-[11px] leading-relaxed border-none focus:ring-0 resize-none outline-none custom-scrollbar"></textarea>
        </div>
      </div>
    </template>
    
    <div v-else class="h-full flex flex-col items-center justify-center text-slate-600 bg-[#050608]">
      <div class="bg-slate-900/30 p-5 rounded-full mb-3 border border-slate-800 shadow-inner"><LayoutIcon class="w-6 h-6" /></div>
      <p class="text-xs font-semibold uppercase tracking-widest">Select a page to inspect</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue';
import { BanIcon, RotateCwIcon, LoaderIcon, LayoutIcon, ChevronDownIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();
const page = computed(() => workspace.activePage);
const imageContainer = ref(null);

// Amazon-Style Hover Zoom State
const imageLoading = ref(true);
const isZoomed = ref(false);
const transformOrigin = ref('50% 50%');

// Text Drawer State
const activeTab = ref(null);
const localSource = ref('');
const localTranslation = ref('');
const localJson = ref('');
const localStatus = ref('pending_review');
const dirtyFlags = reactive({ source: false, translated: false, json: false });
const isDirty = computed(() => dirtyFlags.source || dirtyFlags.translated);

watch(() => page.value, (p) => {
  if (p) {
    localSource.value = p.source_text || '';
    localTranslation.value = p.translated_text || '';
    localJson.value = p.extracted_json ? JSON.stringify(JSON.parse(p.extracted_json), null, 2) : '';
    localStatus.value = p.status || 'pending_review';
    dirtyFlags.source = false;
    dirtyFlags.translated = false;
    dirtyFlags.json = false;
    imageLoading.value = true;
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

const toggleTab = (tabName) => {
  activeTab.value = activeTab.value === tabName ? null : tabName;
};

// Frictionless Zoom Math (Accounts for DOM Rotation)
const onMouseMove = (e) => {
  if (!isZoomed.value || !imageContainer.value || !page.value) return;
  
  const rect = imageContainer.value.getBoundingClientRect();
  const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
  const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

  let originX = xPct;
  let originY = yPct;
  const rot = page.value.rotation % 360;

  if (rot === 90) { originX = yPct; originY = 100 - xPct; }
  else if (rot === 180) { originX = 100 - xPct; originY = 100 - yPct; }
  else if (rot === 270) { originX = 100 - yPct; originY = xPct; }

  transformOrigin.value = `${originX}% ${originY}%`;
};

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