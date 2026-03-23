<template>
  <div v-if="page" class="h-full flex flex-col bg-slate-900">
    <div class="h-14 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between px-5 shrink-0">
      <div class="flex items-center space-x-3">
        <h2 class="font-semibold text-slate-100 text-sm">Page {{ page.sort_order }} Inspector</h2>
        <span class="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded truncate max-w-[200px] border border-slate-700/50" :title="page.source_filename">
          {{ page.source_filename }}
        </span>
        <div v-if="page.is_stale" class="bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Stale / Replaced</div>
        <div v-if="page.is_manual_translation" class="bg-purple-900/30 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Manual Edit</div>
      </div>
      <div class="flex space-x-1">
        <button @click="toggleExclude" class="p-2 rounded-md transition-colors" :class="page.is_excluded ? 'text-red-400 bg-red-900/30 hover:bg-red-900/50' : 'text-slate-400 hover:bg-slate-700 hover:text-white'" title="Toggle Exclude">
          <BanIcon class="w-4 h-4" />
        </button>
        <button @click="rotate" class="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Rotate Image">
          <RotateCwIcon class="w-4 h-4" />
        </button>
        <div class="w-px h-6 bg-slate-600 mx-1.5 self-center"></div>
        <button @click="deletePage" class="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors" title="Delete Page">
          <TrashIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="flex-1 flex min-h-0 relative">
      <div class="w-1/2 border-r border-slate-700 bg-slate-950 p-6 overflow-auto flex items-center justify-center">
        <img :src="page.image_url" class="max-w-full shadow-2xl transition-transform rounded-sm border border-slate-800" :style="{ transform: `rotate(${page.rotation}deg)` }" />
      </div>
      
      <div class="w-1/2 flex flex-col bg-slate-900 relative">
        <div class="flex border-b border-slate-700 bg-slate-800">
          <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" 
            class="px-5 py-3 text-sm font-medium border-b-2 transition-all outline-none"
            :class="activeTab === tab.id ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'">
            {{ tab.label }} <span v-if="dirtyFlags[tab.id]" class="w-2 h-2 rounded-full bg-blue-500 inline-block ml-1 mb-0.5"></span>
          </button>
        </div>
        
        <div class="flex-1 flex flex-col overflow-hidden bg-slate-900 p-6 relative">
          
          <div v-if="activeTab === 'source'" class="h-full flex flex-col">
            <div class="mb-3 flex justify-between items-center">
              <span class="text-xs text-slate-400 font-medium">Edit raw source extraction.</span>
              <button @click="saveSource" :disabled="!dirtyFlags.source" class="text-xs font-medium px-4 py-1.5 rounded disabled:opacity-50 transition-colors" :class="dirtyFlags.source ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'">Save Changes</button>
            </div>
            <textarea v-model="localSource" class="w-full flex-1 bg-slate-950 text-slate-300 font-mono text-sm p-4 rounded-md border border-slate-700 focus:outline-none focus:border-blue-500 resize-none shadow-inner"></textarea>
          </div>

          <div v-else-if="activeTab === 'translated'" class="h-full flex flex-col">
            <div class="mb-3 flex justify-between items-center">
              <span class="text-xs text-slate-400 font-medium">Edit translation. To update layout engine, click Sync after saving.</span>
              <div class="flex space-x-2">
                <button @click="saveTranslation" :disabled="!dirtyFlags.translated" class="text-xs font-medium px-4 py-1.5 rounded disabled:opacity-50 transition-colors" :class="dirtyFlags.translated ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'">Save Text</button>
                <button @click="syncLayout" :disabled="dirtyFlags.translated" class="text-xs font-medium px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 flex items-center shadow-sm" title="Rebuild HTML Layout blocks from this text">
                  <RefreshCwIcon class="w-3.5 h-3.5 mr-1.5" :class="{'animate-spin': isSyncing}" /> Sync Layout
                </button>
              </div>
            </div>
            <textarea v-model="localTranslation" class="w-full flex-1 bg-slate-950 text-slate-200 text-[15px] leading-relaxed p-4 rounded-md border border-slate-700 focus:outline-none focus:border-blue-500 resize-none shadow-inner"></textarea>
          </div>
          
          <div v-else-if="activeTab === 'json'" class="h-full flex flex-col">
            <div class="mb-3 flex justify-between items-center">
              <span class="text-xs text-slate-400 font-medium">Edit deterministic layout blocks directly.</span>
              <button @click="saveJson" :disabled="!dirtyFlags.json" class="text-xs font-medium px-4 py-1.5 rounded disabled:opacity-50 transition-colors shadow-sm" :class="dirtyFlags.json ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'">Save JSON</button>
            </div>
            <textarea v-model="localJson" class="w-full flex-1 bg-slate-950 text-emerald-400 font-mono text-sm p-4 rounded-md border border-slate-700 focus:outline-none focus:border-emerald-500 resize-none shadow-inner"></textarea>
          </div>
          
          <div v-else-if="activeTab === 'html'" class="h-full overflow-y-auto w-full flex justify-center pb-8">
            <div class="max-w-[21cm] w-full bg-white text-black p-12 shadow-2xl rounded-sm min-h-[29.7cm]" style="font-family: 'Merriweather', serif;">
              <div v-html="renderedHtml"></div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  </div>
  <div v-else class="h-full flex items-center justify-center text-slate-500 flex-col bg-slate-900">
    <div class="bg-slate-800 p-6 rounded-full mb-6"><FileTextIcon class="w-12 h-12 text-slate-400" /></div>
    <p class="text-lg font-medium text-slate-300">No page selected</p>
    <p class="text-sm mt-2 text-slate-500">Select a page from the document strip to inspect and edit.</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue';
import { LoaderIcon, BanIcon, RotateCwIcon, TrashIcon, FileTextIcon, RefreshCwIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import DOMPurify from 'dompurify';
import { renderLayoutBlock } from '~/utils/renderer';

const workspace = useWorkspaceStore();
const page = computed(() => workspace.activePage);

const activeTab = ref('html');
const tabs = [
  { id: 'html', label: 'Document Render' },
  { id: 'translated', label: 'Translation' },
  { id: 'json', label: 'Layout Data' },
  { id: 'source', label: 'Source Text' },
];

const localSource = ref('');
const localTranslation = ref('');
const localJson = ref('');
const isSyncing = ref(false);

const dirtyFlags = reactive({ source: false, translated: false, json: false });

watch(() => page.value, (p) => {
  if (p) {
    localSource.value = p.source_text || '';
    localTranslation.value = p.translated_text || '';
    localJson.value = p.extracted_json ? JSON.stringify(JSON.parse(p.extracted_json), null, 2) : '';
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

const saveSource = async () => {
  if (!page.value) return;
  page.value.source_text = localSource.value;
  await $fetch('/api/pages/update', { method: 'PUT', body: { id: page.value.id, source_text: localSource.value } });
  dirtyFlags.source = false;
};

const saveTranslation = async () => {
  if (!page.value) return;
  page.value.translated_text = localTranslation.value;
  page.value.is_manual_translation = true;
  await $fetch('/api/pages/update', { method: 'PUT', body: { id: page.value.id, translated_text: localTranslation.value, is_manual_translation: true } });
  dirtyFlags.translated = false;
};

const saveJson = async () => {
  if (!page.value) return;
  try {
    const parsed = JSON.parse(localJson.value);
    const compactJson = JSON.stringify(parsed);
    page.value.extracted_json = compactJson;
    await $fetch('/api/pages/update', { method: 'PUT', body: { id: page.value.id, extracted_json: compactJson } });
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
    page.value.extracted_json = JSON.stringify(res.json, null, 2);
    localJson.value = JSON.stringify(res.json, null, 2);
    page.value.is_stale = false;
    dirtyFlags.json = false;
  } catch (err) {
    alert("Sync Error: " + err.message);
  } finally {
    isSyncing.value = false;
  }
};

const toggleExclude = async () => {
  if (!page.value) return;
  page.value.is_excluded = !page.value.is_excluded;
  await $fetch('/api/pages/update', { method: 'PUT', body: { id: page.value.id, is_excluded: page.value.is_excluded } });
};

const rotate = async () => {
  if (!page.value) return;
  page.value.rotation = (page.value.rotation + 90) % 360;
  await $fetch('/api/pages/update', { method: 'PUT', body: { id: page.value.id, rotation: page.value.rotation } });
};

const deletePage = async () => {
  if (!page.value) return;
  if (confirm('Permanently remove this page from the workspace?')) await workspace.deletePage(page.value.id);
};

const renderedHtml = computed(() => {
  if (!page.value?.extracted_json) return '<p style="color: #9ca3af; font-style: italic; text-align: center; margin-top: 4rem;">Awaiting data extraction.</p>';
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