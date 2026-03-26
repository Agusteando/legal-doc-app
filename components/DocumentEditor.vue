<template>
  <div class="flex-1 flex flex-col h-full bg-slate-200 relative">
    
    <!-- Approvals Banner (Moved here where it logically belongs) -->
    <div class="bg-slate-50 border-b border-slate-300 px-6 py-2 flex items-center justify-between shrink-0 shadow-sm z-20">
      <div class="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
        <ShieldCheckIcon class="w-4 h-4 mr-2" />
        Document Approvals
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
      
      <button @click="resetToAuto" class="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md flex items-center shadow-sm" title="Pulls the latest deterministic HTML from the current Review Pages.">
        <RefreshCwIcon class="w-3.5 h-3.5 mr-1.5" /> Rebuild from Pages
      </button>
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
import { BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, ListIcon, EraserIcon, LoaderIcon, CheckCircleIcon, RefreshCwIcon, ShieldCheckIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';
import Approvals from './Approvals.vue';

const workspace = useWorkspaceStore();
const editorRef = ref(null);
const isLoading = ref(true);
const isSaving = ref(false);
const saveSuccess = ref(false);
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
    let html = workspace.document?.manual_html_override;
    if (!html) {
      const res = await $fetch(`/api/documents/${workspace.document.id}/html`);
      html = res.html;
    }
    await new Promise(r => setTimeout(r, 0));
    if (editorRef.value) {
      editorRef.value.innerHTML = html || '<p><br></p>';
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