<template>
  <div class="flex-1 flex flex-col h-full bg-slate-200 relative overflow-hidden text-slate-800">
    
    <!-- State Banner (Explicit Pipeline Explanation) -->
    <div class="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between shrink-0 shadow-sm z-20">
      <div class="flex items-center text-emerald-800 text-sm font-medium">
        <LinkIcon class="w-4 h-4 mr-2 text-emerald-600" />
        <span><strong>Live Assembly:</strong> This composed output is strictly derived from the underlying page JSON.</span>
      </div>
      <Approvals />
    </div>

    <!-- Paginated Navigation Toolbar -->
    <div class="h-14 bg-white border-b border-slate-300 flex items-center justify-between px-6 shadow-sm shrink-0 z-10 text-slate-700">
      <div class="flex items-center space-x-4">
        <div class="flex space-x-1 border border-slate-300 rounded-lg p-0.5 bg-slate-50">
          <button @click="workspace.prevPage()" class="p-1.5 rounded hover:bg-white hover:shadow-sm text-slate-600 transition-all"><ChevronLeftIcon class="w-4 h-4" /></button>
          <button @click="workspace.nextPage()" class="p-1.5 rounded hover:bg-white hover:shadow-sm text-slate-600 transition-all"><ChevronRightIcon class="w-4 h-4" /></button>
        </div>
        <span class="text-sm font-bold text-slate-600">Page {{ page?.sort_order || 0 }} of {{ workspace.orderedPages.length }}</span>
      </div>
      
      <div class="flex items-center space-x-4">
        <span v-if="page?.job_status === 'processing'" class="text-xs font-medium text-blue-600 flex items-center"><LoaderIcon class="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processing Source...</span>
        <span class="text-xs font-medium text-slate-500 flex items-center"><ShieldCheckIcon class="w-3.5 h-3.5 mr-1.5" /> 1:1 Strict Pagination Enforced</span>
      </div>
    </div>
    
    <!-- Virtual Paper Canvas (Strict 8.5x11 Ratio) -->
    <div class="flex-1 overflow-auto p-8 flex justify-center custom-scrollbar relative bg-slate-300">
      <div 
        class="bg-white shadow-2xl ring-1 ring-slate-900/10 w-[8.5in] h-[11in] p-[1in] text-black overflow-hidden flex flex-col relative"
        style="box-sizing: border-box;">
        <div v-if="!page?.extracted_json" class="flex-1 flex items-center justify-center flex-col text-slate-400">
          <FileJsonIcon class="w-8 h-8 mb-3 opacity-50" />
          <span class="text-sm font-medium">Awaiting structured JSON data for this page.</span>
        </div>
        <div v-else class="w-full h-full" v-html="renderedHtml"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { ChevronLeftIcon, ChevronRightIcon, LinkIcon, ShieldCheckIcon, LoaderIcon, FileJsonIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import { renderLayoutBlock } from '~/utils/renderer';
import DOMPurify from 'dompurify';

const workspace = useWorkspaceStore();
const page = computed(() => workspace.activePage);

const renderedHtml = computed(() => {
  if (!page.value?.extracted_json) return '';
  try {
    const data = JSON.parse(page.value.extracted_json);
    let html = '';
    if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
      data.layout_blocks.forEach(block => {
        html += renderLayoutBlock(block);
      });
    } else { 
      html = `<p style="font-family:'Times New Roman', serif;">${data.translated_text || ''}</p>`; 
    }
    return DOMPurify.sanitize(html, { ADD_ATTR: ['style'] });
  } catch (e) {
    return `<div style="color: #b91c1c; font-family: sans-serif; font-size: 10pt;">Layout parsing error. JSON is invalid.</div>`;
  }
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 14px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #cbd5e1; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #94a3b8; border-radius: 10px; border: 3px solid #cbd5e1; }
</style>