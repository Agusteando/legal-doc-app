<template>
  <div class="flex items-center space-x-6">
    <div class="flex items-center space-x-2">
      <span class="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Rev 1</span>
      <input v-model="localApp1Name" @blur="saveApprovals" placeholder="Initials" class="bg-transparent border-b border-slate-700 hover:border-slate-500 px-1 py-1 w-16 text-sm text-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 text-center" />
      <select v-model="localApp1Status" @change="saveApprovals" class="bg-transparent text-sm cursor-pointer outline-none transition-all appearance-none pr-4 font-medium" :class="statusColor(localApp1Status)">
        <option value="" class="text-slate-500 bg-slate-900">Pending</option>
        <option value="approved" class="text-emerald-400 bg-slate-900">Approved</option>
        <option value="rejected" class="text-red-400 bg-slate-900">Rejected</option>
      </select>
    </div>
    
    <div class="w-px h-4 bg-slate-800"></div>
    
    <div class="flex items-center space-x-2">
      <span class="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Rev 2</span>
      <input v-model="localApp2Name" @blur="saveApprovals" placeholder="Initials" class="bg-transparent border-b border-slate-700 hover:border-slate-500 px-1 py-1 w-16 text-sm text-slate-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 text-center" />
      <select v-model="localApp2Status" @change="saveApprovals" class="bg-transparent text-sm cursor-pointer outline-none transition-all appearance-none pr-4 font-medium" :class="statusColor(localApp2Status)">
        <option value="" class="text-slate-500 bg-slate-900">Pending</option>
        <option value="approved" class="text-emerald-400 bg-slate-900">Approved</option>
        <option value="rejected" class="text-red-400 bg-slate-900">Rejected</option>
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
  if (status === 'approved') return 'text-emerald-400';
  if (status === 'rejected') return 'text-red-400';
  return 'text-slate-400';
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