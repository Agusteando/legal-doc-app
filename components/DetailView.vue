<template>
  <div v-if="page" class="h-full flex w-full bg-slate-950 overflow-hidden relative text-slate-200">
    
    <!-- LEFT: 35% PDF Image Viewer -->
    <div class="w-[35%] flex flex-col border-r border-slate-800 bg-[#0f1117] relative z-10 shadow-xl">
      <div class="absolute top-4 left-4 z-20 flex space-x-2">
        <div class="bg-slate-900/90 backdrop-blur border border-slate-700/50 rounded-lg p-1.5 flex space-x-1 shadow-lg">
          <button @click="rotate" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 transition-colors" title="Rotate Image">
            <RotateCwIcon class="w-4 h-4" />
          </button>
          <div class="w-px h-4 bg-slate-700 self-center mx-1"></div>
          <button @click="toggleExclude" class="p-1.5 rounded hover:bg-slate-800 transition-colors" :class="page.is_excluded ? 'text-red-400 bg-red-900/20' : 'text-slate-400'" title="Exclude from Export">
            <BanIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-6 flex items-center justify-center custom-scrollbar">
        <div class="relative group">
          <img :src="page.image_url" class="max-w-full h-auto max-h-[85vh] shadow-2xl rounded border border-slate-800 transition-transform duration-300 ease-out" :style="{ transform: `rotate(${page.rotation}deg)` }" />
          <div v-if="page.is_excluded" class="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center rounded">
            <span class="text-sm font-bold tracking-widest bg-red-600 text-white px-4 py-2 rounded shadow-lg">EXCLUDED</span>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT: 65% Bilingual Review Area -->
    <div class="flex-1 flex flex-col min-w-0 bg-slate-900 relative">
      
      <!-- Inline Meta Header -->
      <div class="h-14 border-b border-slate-800 px-5 flex items-center justify-between shrink-0 bg-[#0c0e12] shadow-sm z-10">
        
        <div class="flex items-center space-x-4 flex-1">
          <div class="flex items-center space-x-3">
            <span class="text-sm font-bold text-slate-200 whitespace-nowrap">Page {{ page.sort_order }}</span>
            <span v-if="page.is_stale" class="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">Stale</span>
          </div>
          <div class="h-5 w-px bg-slate-800"></div>
          
          <!-- Sleek Label Input -->
          <div class="flex items-center text-slate-400 flex-1 max-w-xs group">
            <TagIcon class="w-3.5 h-3.5 mr-2 opacity-50 group-hover:opacity-100 transition-opacity" />
            <input v-model="localLabel" @blur="saveMetadata" placeholder="Add optional label..." class="bg-transparent text-sm w-full placeholder-slate-600 focus:outline-none focus:text-slate-200 border-b border-transparent focus:border-slate-700 transition-colors" />
          </div>
        </div>
        
        <div class="flex items-center space-x-4">
          <!-- Sleek Status Dropdown -->
          <div class="flex items-center bg-slate-950 border border-slate-800 rounded-md px-3 py-1.5 shadow-inner">
            <div class="w-2 h-2 rounded-full mr-2" :class="{'bg-emerald-500': localStatus === 'approved', 'bg-red-500': localStatus === 'needs_work', 'bg-amber-500': localStatus === 'pending_review'}"></div>
            <select v-model="localStatus" @change="saveMetadata" class="bg-transparent border-none text-xs font-semibold cursor-pointer outline-none appearance-none pr-4 focus:ring-0" :class="{'text-emerald-400': localStatus === 'approved', 'text-red-400': localStatus === 'needs_work', 'text-amber-400': localStatus === 'pending_review'}">
              <option value="pending_review" class="bg-slate-900 text-amber-400">Pending Review</option>
              <option value="approved" class="bg-slate-900 text-emerald-400">Approved</option>
              <option value="needs_work" class="bg-slate-900 text-red-400">Needs Work</option>
            </select>
          </div>
          
          <button @click="saveReview" :disabled="!dirtyFlags.source && !dirtyFlags.translated" class="px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all shadow-sm disabled:opacity-50" :class="(dirtyFlags.source || dirtyFlags.translated) ? 'bg-blue-600 text-white hover:bg-blue-500 ring-1 ring-blue-500' : 'bg-slate-800 text-slate-500 border border-slate-700'">Save Edits</button>
        </div>
      </div>

      <!-- Perfect Split View -->
      <div class="flex-1 flex min-h-0">
        
        <!-- Spanish Pane -->
        <div class="flex-1 flex flex-col border-r border-slate-800 bg-[#0a0c10]">
          <div class="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center"><FileTextIcon class="w-3.5 h-3.5 mr-1.5"/> Spanish OCR</span>
            <span v-if="dirtyFlags.source" class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow"></span>
          </div>
          <textarea v-model="localSource" class="w-full flex-1 bg-transparent text-slate-400 font-mono text-[13px] leading-relaxed p-6 border-none focus:ring-0 resize-none outline-none selection:bg-slate-700 custom-scrollbar"></textarea>
        </div>
        
        <!-- English Pane (with JSON toggle) -->
        <div class="flex-1 flex flex-col bg-[#0e1116] relative">
          <div class="px-4 py-2 border-b border-slate-800 bg-blue-900/10 flex justify-between items-center shrink-0">
            <span class="text-[10px] font-bold uppercase tracking-widest flex items-center" :class="showJson ? 'text-emerald-500' : 'text-blue-400'">
              <LanguagesIcon v-if="!showJson" class="w-3.5 h-3.5 mr-1.5"/> 
              <CodeIcon v-else class="w-3.5 h-3.5 mr-1.5"/>
              {{ showJson ? 'JSON Data View' : 'English Translation' }}
            </span>
            <div class="flex items-center space-x-3">
              <span v-if="dirtyFlags.translated" class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow"></span>
              <button @click="showJson = !showJson" class="text-slate-500 hover:text-slate-300 transition-colors" :title="showJson ? 'Switch to Text' : 'View Raw JSON Data'"><CodeIcon class="w-3.5 h-3.5"/></button>
            </div>
          </div>
          
          <textarea v-if="!showJson" v-model="localTranslation" class="w-full flex-1 bg-transparent text-slate-200 text-[14px] leading-relaxed p-6 border-none focus:ring-0 resize-none outline-none selection:bg-blue-900/50 custom-scrollbar"></textarea>
          <textarea v-else v-model="localJson" @blur="saveJson" class="w-full flex-1 bg-transparent text-emerald-400 font-mono text-[12px] leading-relaxed p-6 border-none focus:ring-0 resize-none outline-none selection:bg-emerald-900/50 custom-scrollbar"></textarea>
        </div>
        
      </div>
    </div>

  </div>
  
  <div v-else class="h-full flex items-center justify-center text-slate-500 flex-col bg-[#0a0c10]">
    <div class="bg-slate-900/50 p-8 rounded-full mb-6 border border-slate-800/50 shadow-inner"><LayoutIcon class="w-12 h-12 text-slate-600" /></div>
    <p class="text-[15px] font-medium text-slate-400">Select a page from the strip to begin review.</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue';
import { BanIcon, RotateCwIcon, FileTextIcon, TagIcon, LanguagesIcon, CodeIcon, LayoutIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();
const page = computed(() => workspace.activePage);

const localSource = ref('');
const localTranslation = ref('');
const localJson = ref('');
const localStatus = ref('pending_review');
const localLabel = ref('');
const showJson = ref(false);

const dirtyFlags = reactive({ source: false, translated: false, json: false });

watch(() => page.value, (p) => {
  if (p) {
    localSource.value = p.source_text || '';
    localTranslation.value = p.translated_text || '';
    localJson.value = p.extracted_json ? JSON.stringify(JSON.parse(p.extracted_json), null, 2) : '';
    localStatus.value = p.status || 'pending_review';
    localLabel.value = p.label || '';
    showJson.value = false;
    dirtyFlags.source = false;
    dirtyFlags.translated = false;
    dirtyFlags.json = false;
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

const saveMetadata = async () => {
  if (!page.value) return;
  await workspace.updatePageInfo(page.value.id, {
    status: localStatus.value,
    label: localLabel.value
  });
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