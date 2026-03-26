<template>
  <div class="flex items-center space-x-6">
    <div class="flex items-center space-x-2">
      <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Rev 1</span>
      <input v-model="localApp1Name" @blur="saveApprovals" placeholder="Initials" class="bg-transparent border-b border-transparent hover:border-slate-300 px-1 py-0.5 w-16 text-sm text-slate-700 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-center font-medium" />
      <select v-model="localApp1Status" @change="saveApprovals" class="bg-transparent text-sm cursor-pointer outline-none transition-all appearance-none font-bold" :class="statusColor(localApp1Status)">
        <option value="" class="text-slate-400">Pending</option>
        <option value="approved" class="text-emerald-600">Approved</option>
        <option value="rejected" class="text-red-600">Rejected</option>
      </select>
    </div>
    
    <div class="w-px h-4 bg-slate-300"></div>
    
    <div class="flex items-center space-x-2">
      <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Rev 2</span>
      <input v-model="localApp2Name" @blur="saveApprovals" placeholder="Initials" class="bg-transparent border-b border-transparent hover:border-slate-300 px-1 py-0.5 w-16 text-sm text-slate-700 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-center font-medium" />
      <select v-model="localApp2Status" @change="saveApprovals" class="bg-transparent text-sm cursor-pointer outline-none transition-all appearance-none font-bold" :class="statusColor(localApp2Status)">
        <option value="" class="text-slate-400">Pending</option>
        <option value="approved" class="text-emerald-600">Approved</option>
        <option value="rejected" class="text-red-600">Rejected</option>
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
  if (status === 'approved') return 'text-emerald-600';
  if (status === 'rejected') return 'text-red-600';
  return 'text-amber-500';
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