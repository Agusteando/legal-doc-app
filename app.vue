<template>
  <div class="h-screen w-screen bg-slate-900 text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30" style="font-family: 'Inter', sans-serif;">
    <Uploader v-if="!workspace.document" />
    <Workspace v-else />
  </div>
</template>

<script setup>
import { useWorkspaceStore } from '~/stores/workspace';
import { onMounted } from 'vue';

const workspace = useWorkspaceStore();
onMounted(() => workspace.fetchWorkspace());
</script>