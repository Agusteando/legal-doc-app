<template>
  <div class="flex space-x-3 bg-slate-900 p-1.5 rounded-lg border border-slate-700 text-xs">
    <div class="flex items-center space-x-2 px-2 border-r border-slate-700">
      <span class="text-slate-400 font-medium">Rev 1:</span>
      <input v-model="localApp1Name" @blur="saveApprovals" placeholder="Initials/Name" class="bg-slate-800 border-none rounded px-2 py-1 w-24 text-white focus:ring-1 focus:ring-blue-500 outline-none" />
      <select v-model="localApp1Status" @change="saveApprovals" class="bg-slate-800 border-none rounded px-2 py-1 text-white cursor-pointer focus:ring-1 focus:ring-blue-500 outline-none">
        <option value="">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>
    <div class="flex items-center space-x-2 px-2">
      <span class="text-slate-400 font-medium">Rev 2:</span>
      <input v-model="localApp2Name" @blur="saveApprovals" placeholder="Initials/Name" class="bg-slate-800 border-none rounded px-2 py-1 w-24 text-white focus:ring-1 focus:ring-blue-500 outline-none" />
      <select v-model="localApp2Status" @change="saveApprovals" class="bg-slate-800 border-none rounded px-2 py-1 text-white cursor-pointer focus:ring-1 focus:ring-blue-500 outline-none">
        <option value="">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();

const localApp1Name = ref('');
const localApp1Status = ref('');
const localApp2Name = ref('');
const localApp2Status = ref('');

onMounted(() => {
  if (workspace.document) {
    // Auto-fill from store (which reads from localStorage) if empty
    localApp1Name.value = workspace.document.approval_1_name || workspace.reviewerPref;
    localApp1Status.value = workspace.document.approval_1_status || '';
    localApp2Name.value = workspace.document.approval_2_name || '';
    localApp2Status.value = workspace.document.approval_2_status || '';
  }
});

const saveApprovals = async () => {
  if (!workspace.document) return;
  
  // Save preference for future auto-fills
  if (localApp1Name.value) workspace.updateReviewerPref(localApp1Name.value);
  else if (localApp2Name.value) workspace.updateReviewerPref(localApp2Name.value);

  // Sync back to store
  workspace.document.approval_1_name = localApp1Name.value;
  workspace.document.approval_1_status = localApp1Status.value;
  workspace.document.approval_2_name = localApp2Name.value;
  workspace.document.approval_2_status = localApp2Status.value;

  // Persist to DB
  await $fetch('/api/documents/update', {
    method: 'PUT',
    body: {
      id: workspace.document.id,
      approval_1_name: localApp1Name.value,
      approval_1_status: localApp1Status.value,
      approval_2_name: localApp2Name.value,
      approval_2_status: localApp2Status.value,
    }
  });
};
</script>