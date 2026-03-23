<template>
  <div v-if="page" class="h-full flex flex-col bg-slate-900">
    <div class="h-14 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between px-5 shrink-0">
      <div class="flex items-center space-x-3">
        <h2 class="font-semibold text-slate-100 text-sm">Page {{ page.sort_order }} Inspector</h2>
        <span class="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded truncate max-w-[200px] border border-slate-700/50" :title="page.source_filename">
          {{ page.source_filename }}
        </span>
        <div v-if="page.job_status === 'processing'" class="bg-blue-900/30 border border-blue-500/30 text-blue-400 px-2.5 py-1 rounded flex items-center text-xs">
          <LoaderIcon class="w-3.5 h-3.5 mr-1.5 animate-spin"/> Processing... {{ page.job_duration_sec }}s
        </div>
        <div v-if="page.job_error" class="bg-red-900/30 border border-red-500/30 text-red-400 px-2.5 py-1 rounded text-xs truncate max-w-xs" :title="page.job_error">
          {{ page.job_error }}
        </div>
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
      
      <div class="w-1/2 flex flex-col bg-slate-900">
        <div class="flex border-b border-slate-700 bg-slate-800">
          <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" 
            class="px-5 py-3 text-sm font-medium border-b-2 transition-all outline-none"
            :class="activeTab === tab.id ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'">
            {{ tab.label }}
          </button>
        </div>
        
        <div class="flex-1 overflow-auto bg-slate-900 p-6 relative">
          <div v-if="activeTab === 'source'" class="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-300">{{ page.source_text || 'No source text extracted.' }}</div>
          <div v-else-if="activeTab === 'translated'" class="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">{{ page.translated_text || 'No translation available.' }}</div>
          
          <div v-else-if="activeTab === 'json'" class="h-full flex flex-col">
            <div class="mb-3 flex justify-between items-center text-xs text-slate-400 font-medium">
              <span>Edit canonical data to update layout engine.</span>
              <button @click="saveJson" class="text-blue-400 hover:text-blue-300 flex items-center bg-blue-900/20 px-2 py-1 rounded">Save Changes</button>
            </div>
            <textarea v-model="editableJson" @blur="saveJson" class="w-full flex-1 bg-slate-950 text-emerald-400 font-mono text-sm p-4 rounded-md border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none shadow-inner"></textarea>
          </div>
          
          <!-- High Fidelity A4 Simulation wrapper -->
          <div v-else-if="activeTab === 'html'" class="max-w-[21cm] mx-auto bg-white text-black p-12 shadow-2xl rounded-sm min-h-[29.7cm]" style="font-family: 'Merriweather', serif;">
            <div v-html="renderedHtml"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="h-full flex items-center justify-center text-slate-500 flex-col bg-slate-900">
    <div class="bg-slate-800 p-6 rounded-full mb-6">
      <FileTextIcon class="w-12 h-12 text-slate-400" />
    </div>
    <p class="text-lg font-medium text-slate-300">No page selected</p>
    <p class="text-sm mt-2 text-slate-500">Select a page from the document strip to inspect and edit.</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { LoaderIcon, BanIcon, RotateCwIcon, TrashIcon, FileTextIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import DOMPurify from 'dompurify';
import { renderLayoutBlock } from '~/utils/renderer';

const workspace = useWorkspaceStore();
const page = computed(() => workspace.activePage);

const activeTab = ref('html');
const tabs = [
  { id: 'html', label: 'Document Render' },
  { id: 'json', label: 'Canonical Layout Data' },
  { id: 'source', label: 'Raw Source Text' },
  { id: 'translated', label: 'Raw Translation' },
];

const editableJson = ref('');

watch(() => page.value?.extracted_json, (val) => {
  editableJson.value = val ? JSON.stringify(JSON.parse(val), null, 2) : '';
}, { immediate: true });

const saveJson = async () => {
  if (!page.value) return;
  try {
    const parsed = JSON.parse(editableJson.value);
    const compactJson = JSON.stringify(parsed);
    page.value.extracted_json = compactJson;
    await $fetch('/api/pages/update', { 
      method: 'PUT', body: { id: page.value.id, extracted_json: compactJson } 
    });
  } catch (e) {
    alert("Invalid JSON format. Cannot save.");
  }
};

const toggleExclude = async () => {
  if (!page.value) return;
  page.value.is_excluded = !page.value.is_excluded;
  await $fetch('/api/pages/update', { 
    method: 'PUT', body: { id: page.value.id, is_excluded: page.value.is_excluded } 
  });
};

const rotate = async () => {
  if (!page.value) return;
  page.value.rotation = (page.value.rotation + 90) % 360;
  await $fetch('/api/pages/update', { 
    method: 'PUT', body: { id: page.value.id, rotation: page.value.rotation } 
  });
};

const deletePage = async () => {
  if (!page.value) return;
  if (confirm('Permanently remove this page from the workspace?')) {
    await workspace.deletePage(page.value.id);
  }
};

const renderedHtml = computed(() => {
  if (!page.value?.extracted_json) return '<p style="color: #9ca3af; font-style: italic; text-align: center; margin-top: 4rem;">Awaiting data extraction.</p>';
  try {
    const data = JSON.parse(page.value.extracted_json);
    let html = '';
    if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
      data.layout_blocks.forEach(block => {
        html += renderLayoutBlock(block);
      });
    } else {
      html = `<p>${data.translated_text || ''}</p>`;
    }
    return DOMPurify.sanitize(html, { ADD_ATTR: ['style'] });
  } catch (e) {
    return `<div style="color: #ef4444; padding: 1rem; border: 1px solid #fca5a5; background-color: #fef2f2; border-radius: 0.375rem;">Layout rendering error: invalid structured data.</div>`;
  }
});
</script>