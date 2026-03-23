import { defineStore } from 'pinia';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const useWorkspaceStore = defineStore('workspace', {
  state: () => {
    let reviewer = '';
    if (typeof window !== 'undefined') reviewer = localStorage.getItem('reviewerPref') || '';
    return {
      document: null as any,
      pages: [] as any[],
      selectedPageIds: new Set<string>(),
      lastSelectedId: null as string | null,
      isUploading: false,
      uploadStatusText: '',
      uploadProgress: 0,
      reviewerPref: reviewer,
    };
  },
  getters: {
    orderedPages: (state) => [...state.pages].filter(p => !p.is_deleted).sort((a, b) => a.sort_order - b.sort_order),
    selectedPages: (state) => state.pages.filter(p => state.selectedPageIds.has(p.id) && !p.is_deleted),
    activePage: (state) => state.pages.find(p => p.id === state.lastSelectedId && !p.is_deleted) || state.orderedPages[0],
    sourceFiles: (state) => Array.from(new Set(state.pages.filter(p => !p.is_deleted).map(p => p.source_filename)))
  },
  actions: {
    updateReviewerPref(name: string) {
      this.reviewerPref = name;
      if (typeof window !== 'undefined') localStorage.setItem('reviewerPref', name);
    },
    async fetchWorkspace() {
      const { data } = await useFetch('/api/workspace/current');
      if (data.value?.document) {
        this.document = data.value.document;
        this.pages = data.value.pages;
        if (this.pages.length && !this.lastSelectedId) {
          this.selectPage(this.orderedPages[0]?.id, false, false);
        }
      }
    },
    async addFiles(files: File[]) {
      if (!files.length) return;
      this.isUploading = true;
      this.uploadProgress = 0;
      
      try {
        if (!this.document) {
          this.uploadStatusText = 'Initializing Workspace...';
          const { id } = await $fetch('/api/workspace/init', { method: 'POST', body: { filename: 'Assembled Workspace' } });
          await this.fetchWorkspace();
        }

        let totalPagesProcessed = 0;
        let totalPagesExpected = 0;
        const pdfDocs: { pdf: any, file: File, pages: number }[] = [];

        this.uploadStatusText = 'Reading PDFs...';
        for (const file of files) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          totalPagesExpected += pdf.numPages;
          pdfDocs.push({ pdf, file, pages: pdf.numPages });
        }

        for (const docObj of pdfDocs) {
          for (let i = 1; i <= docObj.pages; i++) {
            this.uploadStatusText = `Extracting: ${docObj.file.name} (Page ${i}/${docObj.pages})`;
            await new Promise(r => setTimeout(r, 20));
            try {
              const page = await docObj.pdf.getPage(i);
              const viewport = page.getViewport({ scale: 2.0 }); 
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              await page.render({ canvasContext: ctx, viewport }).promise;
              const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
              if (!blob) continue;

              const formData = new FormData();
              formData.append('document_id', this.document.id);
              formData.append('source_filename', docObj.file.name);
              formData.append('page_number', i.toString());
              formData.append('file', blob);

              await $fetch('/api/pages/upload', { method: 'POST', body: formData });
            } catch (err: any) { console.error(`Page error:`, err); }
            totalPagesProcessed++;
            this.uploadProgress = Math.round((totalPagesProcessed / totalPagesExpected) * 100);
          }
        }
        this.uploadStatusText = 'Finalizing...';
        await this.fetchWorkspace();
      } catch (err: any) { alert('Upload Error: ' + err.message); } 
      finally { this.isUploading = false; this.uploadStatusText = ''; this.uploadProgress = 0; }
    },
    async replaceSourceFile(oldFilename: string, newFile: File) {
      if (!this.document) return;
      this.isUploading = true;
      this.uploadProgress = 0;
      
      try {
        const arrayBuffer = await newFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        const newPagesData = [];

        for (let i = 1; i <= totalPages; i++) {
          this.uploadStatusText = `Replacing: ${oldFilename} -> ${newFile.name} (Page ${i}/${totalPages})`;
          await new Promise(r => setTimeout(r, 20));
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 }); 
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({ canvasContext: ctx, viewport }).promise;
          const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
          
          const formData = new FormData();
          formData.append('document_id', this.document.id);
          formData.append('source_filename', 'TEMP_REPLACE'); 
          formData.append('page_number', '0'); 
          formData.append('file', blob as Blob);
          
          const res = await $fetch('/api/pages/upload', { method: 'POST', body: formData });
          newPagesData.push({ page_number: i, image_url: res.image_url });
          this.uploadProgress = Math.round((i / totalPages) * 100);
        }

        this.uploadStatusText = 'Updating Assembly...';
        await $fetch('/api/documents/replace-file', {
          method: 'POST',
          body: { document_id: this.document.id, old_filename: oldFilename, new_filename: newFile.name, new_pages: newPagesData }
        });

        await this.fetchWorkspace();
      } catch (err: any) {
        alert('Replacement Error: ' + err.message);
      } finally {
        this.isUploading = false;
        this.uploadStatusText = '';
        this.uploadProgress = 0;
      }
    },
    selectPage(id: string, multi: boolean = false, range: boolean = false) {
      if (!id) return;
      if (range && this.lastSelectedId) {
        const ordered = this.orderedPages;
        const start = ordered.findIndex(p => p.id === this.lastSelectedId);
        const end = ordered.findIndex(p => p.id === id);
        if (start === -1 || end === -1) return;
        const [min, max] = [Math.min(start, end), Math.max(start, end)];
        this.selectedPageIds.clear();
        for (let i = min; i <= max; i++) this.selectedPageIds.add(ordered[i].id);
      } else if (multi) {
        if (this.selectedPageIds.has(id)) this.selectedPageIds.delete(id);
        else this.selectedPageIds.add(id);
      } else {
        this.selectedPageIds.clear();
        this.selectedPageIds.add(id);
      }
      this.lastSelectedId = id;
    },
    async processSelected() {
      const ids = Array.from(this.selectedPageIds);
      for (const id of ids) {
        const page = this.pages.find(p => p.id === id);
        if (!page) continue;
        page.job_status = 'processing';
        page.job_duration_sec = 0;
        
        const timer = setInterval(() => page.job_duration_sec++, 1000);
        try {
          const res = await $fetch(`/api/pages/${id}/process`, { method: 'POST' });
          page.job_status = 'completed';
          page.status = 'translated';
          page.is_stale = false;
          page.extracted_json = JSON.stringify(res.json, null, 2);
          page.source_text = res.json.source_text;
          page.translated_text = res.json.translated_text;
        } catch (e: any) {
          page.job_status = 'error';
          page.job_error = e.data?.statusMessage || e.message;
        } finally {
          clearInterval(timer);
        }
      }
    },
    async updatePageOrder(reorderedIds: string[]) {
      this.pages.forEach(p => {
        const idx = reorderedIds.indexOf(p.id);
        if (idx !== -1) p.sort_order = idx;
      });
      const updates = this.pages.map(p => ({ id: p.id, sort_order: p.sort_order }));
      await $fetch('/api/pages/update', { method: 'PUT', body: { updates } });
    },
    async deletePage(id: string) {
      const page = this.pages.find(p => p.id === id);
      if (page) {
        page.is_deleted = true;
        this.selectedPageIds.delete(id);
        if (this.lastSelectedId === id) this.lastSelectedId = null;
        await $fetch('/api/pages/update', { method: 'PUT', body: { id, is_deleted: true } });
      }
    }
  }
});