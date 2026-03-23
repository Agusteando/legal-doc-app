<template>
  <div v-if="page" class="h-full flex flex-col bg-slate-900">
    <!-- Toolbar -->
    <div class="h-12 border-b border-slate-700 bg-slate-800 flex items-center justify-between px-4 shrink-0">
      <div class="flex items-center space-x-3">
        <h2 class="font-medium text-white">Page {{ page.sort_order }} Inspector</h2>
        <span class="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded truncate max-w-[200px]" :title="page.source_filename">
          {{ page.source_filename }}
        </span>
        <span v-if="page.job_status === 'processing'" class="text-blue-400 text-sm flex items-center"><LoaderIcon class="w-4 h-4 mr-1 animate-spin"/> Processing... {{ page.job_duration_sec }}s</span>
        <span v-if="page.job_error" class="text-red-400 text-sm truncate max-w-xs" :title="page.job_error">{{ page.job_error }}</span>
      </div>
      <div class="flex space-x-2">
        <button @click="toggleExclude" class="p-1.5 rounded hover:bg-slate-700 transition-colors" :class="page.is_excluded ? 'text-red-400 bg-red-900/20' : 'text-slate-400'" title="Toggle Exclude">
          <BanIcon class="w-4 h-4" />
        </button>
        <button @click="rotate" class="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Rotate Image">
          <RotateCwIcon class="w-4 h-4" />
        </button>
        <div class="w-px h-6 bg-slate-600 mx-1"></div>
        <button @click="deletePage" class="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors" title="Delete Page from Stack">
          <TrashIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Split View -->
    <div class="flex-1 flex min-h-0">
      <!-- Image Viewer -->
      <div class="w-1/2 border-r border-slate-700 bg-slate-950 p-4 overflow-auto flex items-center justify-center relative">
        <img :src="page.image_url" class="max-w-full shadow-2xl transition-transform" :style="{ transform: `rotate(${page.rotation}deg)` }" />
      </div>
      
      <!-- Editor / Data Viewer -->
      <div class="w-1/2 flex flex-col bg-slate-900">
        <!-- Tabs -->
        <div class="flex border-b border-slate-700 bg-slate-800/50">
          <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" 
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === tab.id ? 'border-blue-500 text-blue-400 bg-slate-800' : 'border-transparent text-slate-400 hover:text-slate-200'">
            {{ tab.label }}
          </button>
        </div>
        
        <!-- Content Area -->
        <div class="flex-1 overflow-auto p-4 text-slate-300 relative">
          <div v-if="activeTab === 'source'" class="whitespace-pre-wrap font-mono text-sm leading-relaxed">{{ page.source_text || 'No source text extracted.' }}</div>
          <div v-else-if="activeTab === 'translated'" class="whitespace-pre-wrap text-base leading-relaxed">{{ page.translated_text || 'No translation available.' }}</div>
          
          <!-- Canonical JSON Edit -->
          <div v-else-if="activeTab === 'json'" class="h-full flex flex-col">
            <div class="mb-2 flex justify-between items-center text-xs text-slate-400">
              <span>Edit canonical data to update HTML output.</span>
              <button @click="saveJson" class="text-blue-400 hover:text-blue-300">Force Save</button>
            </div>
            <textarea v-model="editableJson" @blur="saveJson" class="w-full flex-1 bg-slate-950 text-emerald-400 font-mono text-sm p-4 rounded border border-slate-700 focus:outline-none focus:border-blue-500 resize-none"></textarea>
          </div>
          
          <div v-else-if="activeTab === 'html'" class="prose prose-invert max-w-none" v-html="renderedHtml"></div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="h-full flex items-center justify-center text-slate-500 flex-col">
    <FileTextIcon class="w-12 h-12 mb-4 text-slate-600" />
    <p>Select a page from the assembled stack to inspect.</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { LoaderIcon, BanIcon, RotateCwIcon, TrashIcon, FileTextIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import DOMPurify from 'dompurify';

const workspace = useWorkspaceStore();
const page = computed(() => workspace.activePage);

const activeTab = ref('translated');
const tabs = [
  { id: 'source', label: 'Source Text' },
  { id: 'translated', label: 'Translation' },
  { id: 'json', label: 'Canonical JSON' },
  { id: 'html', label: 'Rendered HTML' },
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
    alert("Invalid JSON. Cannot save.");
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
  if (confirm('Remove this page from the workspace?')) {
    await workspace.deletePage(page.value.id);
  }
};

const renderedHtml = computed(() => {
  if (!page.value?.extracted_json) return '<i>No data</i>';
  try {
    const data = JSON.parse(page.value.extracted_json);
    let html = '';
    if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
      data.layout_blocks.forEach(block => {
        if (block.type === 'heading') html += `<h2 class="text-xl font-bold mt-4 mb-2">${block.translated_content}</h2>`;
        else if (block.type === 'signature') html += `<div class="p-4 border border-dashed border-slate-600 my-4 text-center text-sm italic text-slate-400">[Signature: ${block.translated_content}]</div>`;
        else if (block.type === 'stamp') html += `<div class="p-4 border-2 border-red-900/50 rounded my-4 text-center font-bold text-red-400 uppercase tracking-widest">[Stamp: ${block.translated_content}]</div>`;
        else html += `<p class="mb-3">${block.translated_content}</p>`;
      });
    } else {
      html = `<p>${data.translated_text || ''}</p>`;
    }
    return DOMPurify.sanitize(html);
  } catch (e) {
    return `<div class="text-red-400 p-4 border border-red-900 rounded bg-red-950/30">Failed to render HTML from JSON.</div>`;
  }
});
</script>