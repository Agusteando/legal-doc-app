<template>
  <div class="flex space-x-3 bg-slate-900 py-1.5 px-2 rounded-md border border-slate-700 shadow-inner text-xs items-center">
    <div class="flex items-center space-x-2 px-2 border-r border-slate-700/50">
      <span class="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Rev 1</span>
      <input v-model="localApp1Name" @blur="saveApprovals" placeholder="Initials/Name" class="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-20 text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600" />
      <select v-model="localApp1Status" @change="saveApprovals" class="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white cursor-pointer focus:ring-1 focus:ring-blue-500 outline-none transition-all" :class="statusColor(localApp1Status)">
        <option value="">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>
    <div class="flex items-center space-x-2 px-2">
      <span class="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Rev 2</span>
      <input v-model="localApp2Name" @blur="saveApprovals" placeholder="Initials/Name" class="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-20 text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600" />
      <select v-model="localApp2Status" @change="saveApprovals" class="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white cursor-pointer focus:ring-1 focus:ring-blue-500 outline-none transition-all" :class="statusColor(localApp2Status)">
        <option value="">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useWorkspaceStore } from '~/stores/workspace';

const workspace = useWorkspaceStore();

const localApp1Name = ref('');
const localApp1Status = ref('');
const localApp2Name = ref('');
const localApp2Status = ref('');

const statusColor = (status) => {
  if (status === 'approved') return 'text-emerald-400 font-medium';
  if (status === 'rejected') return 'text-red-400 font-medium';
  return 'text-slate-300';
};

onMounted(() => {
  if (workspace.document) {
    localApp1Name.value = workspace.document.approval_1_name || workspace.reviewerPref;
    localApp1Status.value = workspace.document.approval_1_status || '';
    localApp2Name.value = workspace.document.approval_2_name || '';
    localApp2Status.value = workspace.document.approval_2_status || '';
  }
});

const saveApprovals = async () => {
  if (!workspace.document) return;
  
  if (localApp1Name.value) workspace.updateReviewerPref(localApp1Name.value);
  else if (localApp2Name.value) workspace.updateReviewerPref(localApp2Name.value);

  workspace.document.approval_1_name = localApp1Name.value;
  workspace.document.approval_1_status = localApp1Status.value;
  workspace.document.approval_2_name = localApp2Name.value;
  workspace.document.approval_2_status = localApp2Status.value;

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