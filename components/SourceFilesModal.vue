<template>
  <div v-if="isOpen" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
      <div class="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
        <h3 class="text-lg font-semibold text-white">Manage Source Files</h3>
        <button @click="$emit('close')" class="text-slate-400 hover:text-white transition-colors">
          <XIcon class="w-5 h-5" />
        </button>
      </div>
      
      <div class="p-6 overflow-y-auto max-h-[60vh] space-y-4">
        <p class="text-sm text-slate-400 mb-2">Replacing a file will preserve your document assembly order but mark affected downstream pages and approvals as stale, requiring review.</p>
        
        <div v-for="filename in workspace.sourceFiles" :key="filename" class="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <div class="flex items-center space-x-3 overflow-hidden">
            <FileTextIcon class="w-6 h-6 text-blue-400 flex-shrink-0" />
            <span class="text-slate-200 font-medium truncate" :title="filename">{{ filename }}</span>
          </div>
          
          <label class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md cursor-pointer text-sm font-medium transition-colors flex-shrink-0 ml-4 border border-slate-600">
            Replace PDF
            <input type="file" class="hidden" accept="application/pdf" @change="(e) => handleReplace(e, filename)" />
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { FileTextIcon, XIcon } from 'lucide-vue-next';
import { useWorkspaceStore } from '~/stores/workspace';

defineProps({ isOpen: Boolean });
const emit = defineEmits(['close']);
const workspace = useWorkspaceStore();

const handleReplace = async (e, oldFilename) => {
  const files = e.target.files;
  if (!files.length) return;
  if (confirm(`Are you sure you want to replace "${oldFilename}"? Downstream approvals will be reset.`)) {
    emit('close');
    await workspace.replaceSourceFile(oldFilename, files[0]);
  }
  e.target.value = null;
};
</script>