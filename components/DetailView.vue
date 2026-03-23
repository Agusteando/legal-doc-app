<template>
  <div v-if="page" class="h-full flex bg-slate-950 overflow-hidden relative">
    
    <!-- CENTER: Document Image Viewer (Fluid, max space) -->
    <div class="flex-1 flex flex-col min-w-0 bg-[#0f1117] relative">
      <div class="absolute top-4 left-4 z-10 flex space-x-2">
        <div class="bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-lg p-1.5 flex space-x-1 shadow-lg">
          <button @click="toggleExclude" class="p-2 rounded hover:bg-slate-800 transition-colors" :class="page.is_excluded ? 'text-red-400' : 'text-slate-400'" title="Toggle Exclude">
            <BanIcon class="w-4 h-4" />
          </button>
          <button @click="rotate" class="p-2 rounded hover:bg-slate-800 text-slate-400 transition-colors" title="Rotate Image">
            <RotateCwIcon class="w-4 h-4" />
          </button>
          <div class="w-px h-5 bg-slate-700 self-center mx-1"></div>
          <button @click="deletePage" class="p-2 rounded hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors" title="Delete Page">
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-8 flex items-center justify-center">
        <div class="relative group">
          <img :src="page.image_url" class="max-w-full h-auto max-h-[85vh] shadow-2xl rounded border border-slate-800 transition-transform duration-300 ease-out" :style="{ transform: `rotate(${page.rotation}deg)` }" />
          <div v-if="page.is_excluded" class="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center rounded">
            <span class="text-sm font-bold tracking-widest bg-red-600 text-white px-4 py-2 rounded shadow-lg">EXCLUDED</span>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT: Inspector Panel (450px fixed) -->
    <div class="w-[450px] shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col shadow-2xl z-10">
      
      <!-- Inspector Header & Meta -->
      <div class="p-5 border-b border-slate-800 bg-slate-900">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center space-x-3">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Page {{ page.sort_order }}</span>
            <span v-if="page.is_stale" class="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Stale</span>
            <span v-if="page.is_manual_translation" class="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Edited</span>
          </div>
          <div class="flex space-x-1">
            <button @click="workspace.prevPage()" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 transition-colors"><ChevronLeftIcon class="w-4 h-4" /></button>
            <button @click="workspace.nextPage()" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 transition-colors"><ChevronRightIcon class="w-4 h-4" /></button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Status</label>
            <select v-model="localStatus" @change="saveMetadata" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-medium appearance-none" :class="{'text-emerald-400': localStatus === 'approved', 'text-red-400': localStatus === 'needs_work', 'text-amber-400': localStatus === 'pending_review'}">
              <option value="pending_review" class="text-amber-400">Pending Review</option>
              <option value="approved" class="text-emerald-400">Approved</option>
              <option value="needs_work" class="text-red-400">Needs Work</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Label</label>
            <input v-model="localLabel" @blur="saveMetadata" placeholder="e.g. Exhibit A" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-700" />
          </div>
        </div>
      </div>

      <!-- Editor Tabs -->
      <div class="flex px-2 pt-2 border-b border-slate-800 bg-slate-900/50">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" 
          class="px-4 py-2.5 text-xs font-medium border-b-2 transition-all outline-none relative"
          :class="activeTab === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'">
          {{ tab.label }}
          <span v-if="dirtyFlags[tab.id]" class="absolute top-2 right-1 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        </button>
      </div>
      
      <!-- Editor Content Area -->
      <div class="flex-1 flex flex-col min-h-0 bg-slate-950 relative">
        <div v-if="activeTab === 'source'" class="h-full flex flex-col p-4">
          <div class="mb-3 flex justify-between items-center">
            <span class="text-xs text-slate-500">Raw source OCR.</span>
            <button @click="saveSource" :disabled="!dirtyFlags.source" class="text-xs font-medium px-3 py-1.5 rounded disabled:opacity-50 transition-colors" :class="dirtyFlags.source ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'">Save</button>
          </div>
          <textarea v-model="localSource" class="w-full flex-1 bg-transparent text-slate-300 font-mono text-[13px] leading-relaxed p-0 border-none focus:ring-0 resize-none outline-none"></textarea>
        </div>

        <div v-else-if="activeTab === 'translated'" class="h-full flex flex-col p-4">
          <div class="mb-3 flex justify-between items-center">
            <span class="text-xs text-slate-500">Edit translation text.</span>
            <div class="flex space-x-2">
              <button @click="syncLayout" :disabled="dirtyFlags.translated" class="text-xs font-medium px-3 py-1.5 rounded border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 disabled:opacity-50 flex items-center transition-colors" title="Sync layout blocks">
                <RefreshCwIcon class="w-3.5 h-3.5 mr-1.5" :class="{'animate-spin': isSyncing}" /> Sync
              </button>
              <button @click="saveTranslation" :disabled="!dirtyFlags.translated" class="text-xs font-medium px-3 py-1.5 rounded disabled:opacity-50 transition-colors" :class="dirtyFlags.translated ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'">Save</button>
            </div>
          </div>
          <textarea v-model="localTranslation" class="w-full flex-1 bg-transparent text-slate-200 text-[14px] leading-relaxed p-0 border-none focus:ring-0 resize-none outline-none"></textarea>
        </div>
        
        <div v-else-if="activeTab === 'json'" class="h-full flex flex-col p-4">
          <div class="mb-3 flex justify-between items-center">
            <span class="text-xs text-slate-500">Edit strict layout blocks.</span>
            <button @click="saveJson" :disabled="!dirtyFlags.json" class="text-xs font-medium px-3 py-1.5 rounded disabled:opacity-50 transition-colors" :class="dirtyFlags.json ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'">Save JSON</button>
          </div>
          <textarea v-model="localJson" class="w-full flex-1 bg-transparent text-emerald-400 font-mono text-[12px] leading-relaxed p-0 border-none focus:ring-0 resize-none outline-none"></textarea>
        </div>
        
        <div v-else-if="activeTab === 'html'" class="h-full overflow-y-auto w-full bg-slate-200">
          <div class="w-full bg-white text-black p-8 min-h-full" style="font-family: 'Merriweather', serif; font-size: 10pt;">
            <div v-html="renderedHtml"></div>
          </div>
        </div>
      </div>

      <!-- Notes Panel (Bottom Fixed) -->
      <div class="p-4 border-t border-slate-800 bg-slate-900 shrink-0 h-36 flex flex-col">
        <label class="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">Internal Notes</label>
        <textarea v-model="localNotes" @blur="saveMetadata" placeholder="Add review notes, translator comments, or tags..." class="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none placeholder-slate-700"></textarea>
      </div>

    </div>
  </div>
  
  <div v-else class="h-full flex items-center justify-center text-slate-500 flex-col bg-[#0f1117]">
    <div class="bg-slate-900/50 p-8 rounded-full mb-6 border border-slate-800/50"><FileTextIcon class="w-12 h-12 text-slate-600" /></div>
    <p class="text-[15px] font-medium text-slate-400">Select a page to inspect</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue';
import { LoaderIcon, BanIcon, RotateCwIcon, TrashIcon, FileTextIcon, RefreshCwIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import DOMPurify from 'dompurify';
import { renderLayoutBlock } from '~/utils/renderer';

const workspace = useWorkspaceStore();
const page = computed(() => workspace.activePage);

const activeTab = ref('translated');
const tabs = [
  { id: 'html', label: 'Preview' },
  { id: 'translated', label: 'Translation' },
  { id: 'json', label: 'Data' },
  { id: 'source', label: 'Source' },
];

const localSource = ref('');
const localTranslation = ref('');
const localJson = ref('');
const localStatus = ref('pending_review');
const localLabel = ref('');
const localNotes = ref('');
const isSyncing = ref(false);

const dirtyFlags = reactive({ source: false, translated: false, json: false });

watch(() => page.value, (p) => {
  if (p) {
    localSource.value = p.source_text || '';
    localTranslation.value = p.translated_text || '';
    localJson.value = p.extracted_json ? JSON.stringify(JSON.parse(p.extracted_json), null, 2) : '';
    localStatus.value = p.status || 'pending_review';
    localLabel.value = p.label || '';
    localNotes.value = p.notes || '';
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
    label: localLabel.value,
    notes: localNotes.value
  });
};

const saveSource = async () => {
  if (!page.value) return;
  await workspace.updatePageInfo(page.value.id, { source_text: localSource.value });
  dirtyFlags.source = false;
};

const saveTranslation = async () => {
  if (!page.value) return;
  await workspace.updatePageInfo(page.value.id, { translated_text: localTranslation.value, is_manual_translation: true });
  dirtyFlags.translated = false;
};

const saveJson = async () => {
  if (!page.value) return;
  try {
    const parsed = JSON.parse(localJson.value);
    const compactJson = JSON.stringify(parsed);
    await workspace.updatePageInfo(page.value.id, { extracted_json: compactJson });
    dirtyFlags.json = false;
  } catch (e) { alert("Invalid JSON format."); }
};

const syncLayout = async () => {
  if (!page.value || dirtyFlags.translated) return alert("Please save your translation text first.");
  isSyncing.value = true;
  try {
    const res = await $fetch(`/api/pages/${page.value.id}/sync-layout`, {
      method: 'POST',
      body: { translated_text: page.value.translated_text, source_text: page.value.source_text }
    });
    const compactJson = JSON.stringify(res.json, null, 2);
    localJson.value = compactJson;
    await workspace.updatePageInfo(page.value.id, { extracted_json: compactJson, is_stale: false });
    dirtyFlags.json = false;
  } catch (err) {
    alert("Sync Error: " + err.message);
  } finally {
    isSyncing.value = false;
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

const deletePage = async () => {
  if (!page.value) return;
  if (confirm('Permanently remove this page from the workspace?')) await workspace.deletePage(page.value.id);
};

const renderedHtml = computed(() => {
  if (!page.value?.extracted_json) return '<p style="color: #64748b; font-style: italic; text-align: center; margin-top: 4rem;">Awaiting data extraction.</p>';
  try {
    const data = JSON.parse(page.value.extracted_json);
    let html = '';
    if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
      data.layout_blocks.forEach(block => html += renderLayoutBlock(block));
    } else { html = `<p>${data.translated_text || ''}</p>`; }
    return DOMPurify.sanitize(html, { ADD_ATTR: ['style'] });
  } catch (e) {
    return `<div style="color: #ef4444; padding: 1rem; border: 1px solid #fca5a5; background-color: #fef2f2; border-radius: 0.375rem;">Layout rendering error: invalid structured data.</div>`;
  }
});
</script>