<template>
  <div v-if="page" class="flex-1 flex bg-slate-200 relative overflow-hidden text-slate-800">
    
    <!-- Left Pane: Spanish Reference -->
    <div class="w-[30%] flex flex-col bg-[#0f1117] border-r border-slate-800 shadow-xl z-10 shrink-0">
      <div class="h-14 border-b border-slate-800 bg-slate-900 px-5 flex items-center shrink-0">
        <span class="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center"><FileTextIcon class="w-4 h-4 mr-2"/> Spanish Source</span>
      </div>
      <div class="flex-1 overflow-auto p-5 custom-scrollbar">
        <p class="text-[13px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">{{ page.source_text || 'No source text available.' }}</p>
      </div>
    </div>

    <!-- Right Pane: English Output Editor -->
    <div class="flex-1 flex flex-col min-w-0 relative">
      
      <!-- Top State/Navigation Bar -->
      <div class="h-14 bg-white border-b border-slate-300 flex items-center justify-between px-6 shadow-sm shrink-0 z-10">
        <div class="flex items-center space-x-4">
          <div class="flex space-x-1 border border-slate-300 rounded-lg p-0.5 bg-slate-50">
            <button @click="workspace.prevPage()" class="p-1.5 rounded hover:bg-white hover:shadow-sm text-slate-600 transition-all"><ChevronLeftIcon class="w-4 h-4" /></button>
            <button @click="workspace.nextPage()" class="p-1.5 rounded hover:bg-white hover:shadow-sm text-slate-600 transition-all"><ChevronRightIcon class="w-4 h-4" /></button>
          </div>
          <span class="text-sm font-bold text-slate-600">Page {{ page.sort_order }} of {{ workspace.orderedPages.length }}</span>
        </div>
        
        <div class="flex items-center space-x-3">
          <span v-if="page.job_status === 'processing'" class="text-xs font-medium text-blue-600 flex items-center mr-2"><LoaderIcon class="w-3.5 h-3.5 mr-1.5 animate-spin" /> Processing Source...</span>
          <span v-if="isSaving" class="text-xs font-medium text-slate-500 flex items-center"><LoaderIcon class="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...</span>
          <span v-else-if="saveSuccess" class="text-xs font-medium text-emerald-600 flex items-center"><CheckCircleIcon class="w-3.5 h-3.5 mr-1.5" /> Saved</span>
          
          <div class="w-px h-5 bg-slate-300 mx-2"></div>
          
          <button v-if="page.manual_html_override" @click="resetToAuto" class="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors px-3 py-1.5 rounded-md flex items-center shadow-sm border border-amber-300" title="Revert to auto-compiled JSON layout">
            <RefreshCwIcon class="w-3.5 h-3.5 mr-1.5" /> Revert Edit
          </button>
          <div v-else class="text-xs font-medium text-emerald-700 flex items-center px-2 py-1.5 rounded-md bg-emerald-50 border border-emerald-200" title="Document is actively compiled from JSON page data">
            <LinkIcon class="w-3.5 h-3.5 mr-1.5" /> Auto-Assembled
          </div>
        </div>
      </div>

      <!-- Editor Formatting Toolbar -->
      <div class="bg-white border-b border-slate-200 flex items-center px-4 py-1.5 shadow-sm shrink-0 gap-1 text-slate-700">
        <button @mousedown.prevent="exec('bold')" class="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Bold"><BoldIcon class="w-4 h-4" /></button>
        <button @mousedown.prevent="exec('italic')" class="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Italic"><ItalicIcon class="w-4 h-4" /></button>
        <button @mousedown.prevent="exec('underline')" class="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Underline"><UnderlineIcon class="w-4 h-4" /></button>
        <div class="w-px h-5 bg-slate-300 mx-1"></div>
        <button @mousedown.prevent="exec('justifyLeft')" class="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Align Left"><AlignLeftIcon class="w-4 h-4" /></button>
        <button @mousedown.prevent="exec('justifyCenter')" class="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Center"><AlignCenterIcon class="w-4 h-4" /></button>
        <button @mousedown.prevent="exec('justifyRight')" class="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Align Right"><AlignRightIcon class="w-4 h-4" /></button>
        <div class="w-px h-5 bg-slate-300 mx-1"></div>
        <button @mousedown.prevent="exec('insertUnorderedList')" class="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Bullet List"><ListIcon class="w-4 h-4" /></button>
        <button @mousedown.prevent="exec('removeFormat')" class="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Clear Formatting"><EraserIcon class="w-4 h-4" /></button>
      </div>
      
      <!-- Virtual Paper Canvas (Legal Size: 8.5x14) -->
      <div class="flex-1 overflow-auto p-8 flex justify-center custom-scrollbar relative bg-slate-300">
        <div 
          ref="editorRef"
          contenteditable="true" 
          @input="onInput"
          class="bg-white shadow-2xl ring-1 ring-slate-900/10 w-[8.5in] min-h-[14in] p-[1in] text-black focus:outline-none"
          style="box-sizing: border-box;">
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="h-full flex items-center justify-center text-slate-500 flex-col bg-[#0a0c10]">
    <div class="bg-slate-900/50 p-8 rounded-full mb-6 border border-slate-800/50 shadow-inner"><LayoutIcon class="w-12 h-12 text-slate-600" /></div>
    <p class="text-[15px] font-medium text-slate-400">Select a page from the strip to view composed output.</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, ListIcon, EraserIcon, LoaderIcon, CheckCircleIcon, RefreshCwIcon, LinkIcon, ChevronLeftIcon, ChevronRightIcon, FileTextIcon, LayoutIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import { renderLayoutBlock } from '~/utils/renderer';
import DOMPurify from 'dompurify';

const workspace = useWorkspaceStore();
const page = computed(() => workspace.activePage);
const editorRef = ref(null);

const isSaving = ref(false);
const saveSuccess = ref(false);
let saveTimeout = null;

const exec = (command, value = null) => {
  document.execCommand(command, false, value);
  onInput(); 
};

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout);
});

// Calculate the deterministic HTML representation of the page
const getCompiledHtml = (p) => {
  if (!p || !p.extracted_json) return '';
  try {
    const data = JSON.parse(p.extracted_json);
    let html = '';
    if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
      data.layout_blocks.forEach(block => { html += renderLayoutBlock(block); });
    } else { 
      html = `<p style="font-family:'Times New Roman', Times, serif; font-size:11pt;">${data.translated_text || ''}</p>`; 
    }
    return DOMPurify.sanitize(html, { ADD_ATTR: ['style'] });
  } catch (e) {
    return `<div style="color: #b91c1c; font-family: sans-serif; font-size: 10pt;">Layout parsing error. JSON is invalid.</div>`;
  }
};

// Sync the DOM when the active page changes
watch(() => page.value, async (newPage) => {
  if (!newPage) return;
  await nextTick();
  if (editorRef.value) {
    if (newPage.manual_html_override) {
      editorRef.value.innerHTML = newPage.manual_html_override;
    } else {
      editorRef.value.innerHTML = getCompiledHtml(newPage) || '<p style="color:#94a3b8; font-style:italic;">Awaiting page data...</p>';
    }
  }
}, { immediate: true });

const resetToAuto = async () => {
  if (!page.value) return;
  if (!confirm("This will erase any manual formatting edits for this page and strictly re-assemble it from the underlying JSON data. Continue?")) return;
  await workspace.savePageHtml(page.value.id, null);
  if (editorRef.value) {
    editorRef.value.innerHTML = getCompiledHtml(page.value) || '<p style="color:#94a3b8; font-style:italic;">Awaiting page data...</p>';
  }
};

const onInput = () => {
  if (!page.value) return;
  
  if (saveTimeout) clearTimeout(saveTimeout);
  saveSuccess.value = false;
  isSaving.value = true;
  
  saveTimeout = setTimeout(async () => {
    if (editorRef.value) {
      await workspace.savePageHtml(page.value.id, editorRef.value.innerHTML);
      isSaving.value = false;
      saveSuccess.value = true;
      setTimeout(() => saveSuccess.value = false, 2000);
    }
  }, 1000);
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 14px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #cbd5e1; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #94a3b8; border-radius: 10px; border: 3px solid #cbd5e1; }
</style>