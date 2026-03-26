<template>
  <div v-if="page" class="h-full flex bg-slate-950 overflow-hidden relative text-slate-200">
    
    <!-- LEFT: Document Image Reference -->
    <div class="w-[40%] flex flex-col border-r border-slate-800 bg-[#0f1117] relative z-10 shadow-lg">
      <div class="absolute top-4 left-4 z-20 flex space-x-2">
        <div class="bg-slate-900/90 backdrop-blur border border-slate-700/50 rounded-lg p-1.5 flex space-x-1 shadow-lg">
          <button @click="rotate" class="p-2 rounded hover:bg-slate-800 text-slate-400 transition-colors" title="Rotate Image">
            <RotateCwIcon class="w-4 h-4" />
          </button>
          <button @click="toggleExclude" class="p-2 rounded hover:bg-slate-800 transition-colors" :class="page.is_excluded ? 'text-red-400 bg-red-900/20' : 'text-slate-400'" title="Exclude from Export">
            <BanIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-6 flex items-center justify-center">
        <div class="relative group">
          <img :src="page.image_url" class="max-w-full h-auto max-h-[85vh] shadow-2xl rounded border border-slate-800 transition-transform duration-300 ease-out" :style="{ transform: `rotate(${page.rotation}deg)` }" />
          <div v-if="page.is_excluded" class="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center rounded">
            <span class="text-sm font-bold tracking-widest bg-red-600 text-white px-4 py-2 rounded shadow-lg">EXCLUDED</span>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT: Side-by-Side Bilingual Editor -->
    <div class="w-[60%] flex flex-col min-w-0 bg-slate-900 relative">
      
      <!-- Context Header -->
      <div class="h-14 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 bg-slate-950">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <span class="text-sm font-semibold text-slate-300">Page {{ page.sort_order }}</span>
            <span v-if="page.is_stale" class="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shadow-sm">Stale</span>
          </div>
          <div class="h-4 w-px bg-slate-700"></div>
          <select v-model="localStatus" @change="saveMetadata" class="bg-transparent border-none text-sm cursor-pointer outline-none font-medium appearance-none pr-4" :class="{'text-emerald-400': localStatus === 'approved', 'text-red-400': localStatus === 'needs_work', 'text-amber-400': localStatus === 'pending_review'}">
            <option value="pending_review" class="text-amber-400 bg-slate-900">Pending Review</option>
            <option value="approved" class="text-emerald-400 bg-slate-900">Approved</option>
            <option value="needs_work" class="text-red-400 bg-slate-900">Needs Work</option>
          </select>
        </div>
        
        <div class="flex items-center space-x-3">
          <button @click="saveReview" :disabled="!dirtyFlags.source && !dirtyFlags.translated" class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50" :class="(dirtyFlags.source || dirtyFlags.translated) ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-800 text-slate-500 border border-slate-700'">Save Changes</button>
          <div class="flex space-x-1 border border-slate-700 rounded-lg p-0.5 bg-slate-900">
            <button @click="workspace.prevPage()" class="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 transition-colors"><ChevronLeftIcon class="w-4 h-4" /></button>
            <button @click="workspace.nextPage()" class="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 transition-colors"><ChevronRightIcon class="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <!-- Explicit Bilingual View -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Spanish Source -->
        <div class="flex-1 flex flex-col border-r border-slate-800 bg-[#0c0e12]">
          <div class="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center"><FileTextIcon class="w-3 h-3 mr-1.5"/> Spanish OCR</span>
            <span v-if="dirtyFlags.source" class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow"></span>
          </div>
          <textarea v-model="localSource" class="w-full flex-1 bg-transparent text-slate-400 font-mono text-[13px] leading-relaxed p-4 border-none focus:ring-0 resize-none outline-none selection:bg-slate-700"></textarea>
        </div>
        
        <!-- English Translation -->
        <div class="flex-1 flex flex-col bg-[#11141a]">
          <div class="px-4 py-2 border-b border-slate-800 bg-blue-900/10 flex justify-between items-center shrink-0">
            <span class="text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center"><LanguagesIcon class="w-3 h-3 mr-1.5"/> English Translation</span>
            <span v-if="dirtyFlags.translated" class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow"></span>
          </div>
          <textarea v-model="localTranslation" class="w-full flex-1 bg-transparent text-slate-200 text-[14px] leading-relaxed p-4 border-none focus:ring-0 resize-none outline-none selection:bg-blue-900/50"></textarea>
        </div>
      </div>
    </div>

  </div>
  
  <div v-else class="h-full flex items-center justify-center text-slate-500 flex-col bg-[#0a0c10]">
    <div class="bg-slate-900/50 p-8 rounded-full mb-6 border border-slate-800/50 shadow-inner"><FileSearchIcon class="w-12 h-12 text-slate-600" /></div>
    <p class="text-[15px] font-medium text-slate-400">Select a page to review</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue';
import { BanIcon, RotateCwIcon, FileTextIcon, ChevronLeftIcon, ChevronRightIcon, FileSearchIcon, LanguagesIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();
const page = computed(() => workspace.activePage);

const localSource = ref('');
const localTranslation = ref('');
const localStatus = ref('pending_review');

const dirtyFlags = reactive({ source: false, translated: false });

watch(() => page.value, (p) => {
  if (p) {
    localSource.value = p.source_text || '';
    localTranslation.value = p.translated_text || '';
    localStatus.value = p.status || 'pending_review';
    dirtyFlags.source = false;
    dirtyFlags.translated = false;
  }
}, { immediate: true, deep: true });

watch(localSource, (val) => { if(page.value) dirtyFlags.source = val !== (page.value.source_text || ''); });
watch(localTranslation, (val) => { if(page.value) dirtyFlags.translated = val !== (page.value.translated_text || ''); });

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
    // Explicitly update json blocks behind the scenes using our auto-sync logic
    if (updates.translated_text && page.value.source_text) {
      try {
        const res = await $fetch(`/api/pages/${page.value.id}/sync-layout`, {
          method: 'POST',
          body: { translated_text: updates.translated_text, source_text: page.value.source_text }
        });
        const compactJson = JSON.stringify(res.json, null, 2);
        await workspace.updatePageInfo(page.value.id, { extracted_json: compactJson, is_stale: false });
      } catch(e) { console.warn("Background layout sync failed:", e.message); }
    }
    
    dirtyFlags.source = false;
    dirtyFlags.translated = false;
  }
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