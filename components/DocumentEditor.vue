<template>
  <div class="flex-1 flex flex-col h-full bg-slate-200 relative overflow-hidden text-slate-800">
    
    <!-- State Banner (Explicit Pipeline Explanation) -->
    <div v-if="isOverride" class="bg-amber-100 border-b border-amber-300 px-6 py-2 flex items-center justify-between shrink-0 shadow-sm z-20">
      <div class="flex items-center text-amber-900 text-sm font-medium">
        <AlertTriangleIcon class="w-4 h-4 mr-2 text-amber-600" />
        <span><strong>Manual Edit Mode:</strong> This document is disconnected from the review pages.</span>
      </div>
      <button @click="resetToAuto" class="text-xs font-semibold text-amber-800 bg-amber-200 hover:bg-amber-300 transition-colors px-3 py-1.5 rounded-md flex items-center shadow-sm border border-amber-400">
        <RefreshCwIcon class="w-3.5 h-3.5 mr-1.5" /> Revert to Auto-Assembly
      </button>
    </div>
    <div v-else class="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between shrink-0 shadow-sm z-20">
      <div class="flex items-center text-emerald-800 text-sm font-medium">
        <LinkIcon class="w-4 h-4 mr-2 text-emerald-600" />
        <span><strong>Auto-Assembled:</strong> Document is actively rendering from extracted page data. Edits here will detach it into Manual Mode.</span>
      </div>
      <Approvals />
    </div>

    <!-- WYSIWYG Editor Toolbar -->
    <div class="h-14 bg-white border-b border-slate-300 flex items-center px-6 shadow-sm shrink-0 gap-2 z-10 text-slate-700">
      <button @mousedown.prevent="exec('bold')" class="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Bold"><BoldIcon class="w-4 h-4" /></button>
      <button @mousedown.prevent="exec('italic')" class="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Italic"><ItalicIcon class="w-4 h-4" /></button>
      <button @mousedown.prevent="exec('underline')" class="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Underline"><UnderlineIcon class="w-4 h-4" /></button>
      
      <div class="w-px h-6 bg-slate-300 mx-2"></div>
      
      <button @mousedown.prevent="exec('justifyLeft')" class="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Align Left"><AlignLeftIcon class="w-4 h-4" /></button>
      <button @mousedown.prevent="exec('justifyCenter')" class="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Center"><AlignCenterIcon class="w-4 h-4" /></button>
      <button @mousedown.prevent="exec('justifyRight')" class="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Align Right"><AlignRightIcon class="w-4 h-4" /></button>
      
      <div class="w-px h-6 bg-slate-300 mx-2"></div>
      
      <button @mousedown.prevent="exec('insertUnorderedList')" class="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Bullet List"><ListIcon class="w-4 h-4" /></button>
      <button @mousedown.prevent="exec('removeFormat')" class="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Clear Formatting"><EraserIcon class="w-4 h-4" /></button>
      
      <div class="flex-1"></div>
      
      <span v-if="isSaving" class="text-xs font-medium text-slate-500 flex items-center mr-4"><LoaderIcon class="w-3 h-3 mr-1 animate-spin" /> Saving...</span>
      <span v-else-if="saveSuccess" class="text-xs font-medium text-emerald-600 flex items-center mr-4"><CheckCircleIcon class="w-3 h-3 mr-1" /> Saved</span>
    </div>
    
    <!-- Virtual Paper Canvas -->
    <div class="flex-1 overflow-auto p-8 flex justify-center custom-scrollbar">
      <div v-if="isLoading" class="flex items-center justify-center flex-col text-slate-500 mt-20">
         <LoaderIcon class="w-8 h-8 animate-spin mb-4 text-blue-500" />
         <span class="text-sm font-medium">Assembling Final Document...</span>
      </div>
      <div 
        v-else
        ref="editorRef"
        contenteditable="true" 
        @input="onInput"
        class="bg-white shadow-2xl ring-1 ring-slate-900/5 w-full max-w-[816px] min-h-[1056px] p-[1in] text-black focus:outline-none"
        style="font-family: 'Merriweather', serif; font-size: 11pt; line-height: 1.6;">
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, ListIcon, EraserIcon, LoaderIcon, CheckCircleIcon, RefreshCwIcon, AlertTriangleIcon, LinkIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import Approvals from './Approvals.vue';

const workspace = useWorkspaceStore();
const editorRef = ref(null);
const isLoading = ref(true);
const isSaving = ref(false);
const saveSuccess = ref(false);
const isOverride = ref(false);
let saveTimeout = null;

const exec = (command, value = null) => {
  document.execCommand(command, false, value);
  onInput(); 
};

onMounted(async () => {
  await loadContent();
});

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout);
});

const loadContent = async () => {
  isLoading.value = true;
  try {
    const res = await $fetch(`/api/documents/${workspace.document.id}/html`);
    isOverride.value = res.is_override;
    await new Promise(r => setTimeout(r, 0)); // Yield to let DOM mount ref
    if (editorRef.value) {
      editorRef.value.innerHTML = res.html;
    }
  } catch(e) { console.error(e); }
  finally { isLoading.value = false; }
};

const resetToAuto = async () => {
  if (!confirm("This will erase any manual formatting done in this editor and re-assemble the document directly from the underlying Review Pages. Continue?")) return;
  await workspace.saveDocumentHtml(null);
  await loadContent();
};

const onInput = () => {
  if (!isOverride.value) isOverride.value = true; // Visually switch mode immediately
  if (saveTimeout) clearTimeout(saveTimeout);
  saveSuccess.value = false;
  isSaving.value = true;
  
  saveTimeout = setTimeout(async () => {
    if (editorRef.value) {
      await workspace.saveDocumentHtml(editorRef.value.innerHTML);
      isSaving.value = false;
      saveSuccess.value = true;
      setTimeout(() => saveSuccess.value = false, 2000);
    }
  }, 1000);
};
</script>