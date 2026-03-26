import { defineStore } from 'pinia';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export interface LogEntry {
  time: string;
  level: 'info' | 'success' | 'warn' | 'error' | 'debug';
  msg: string;
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
      
      viewMode: 'review' as 'review' | 'editor',
      
      isUploading: false,
      uploadStatusText: '',
      uploadProgress: 0,
      reviewerPref: reviewer,
      isLoadingWorkspace: true,
      
      logs: [] as LogEntry[],
      globalStats: { totalDocuments: 0, totalPages: 0, deletedPages: 0 }
    };
  },
  getters: {
    orderedPages: (state) => [...state.pages].filter(p => !p.is_deleted).sort((a, b) => a.sort_order - b.sort_order),
    selectedPages: (state) => state.pages.filter(p => state.selectedPageIds.has(p.id) && !p.is_deleted),
    activePage: (state) => state.pages.find(p => p.id === state.lastSelectedId && !p.is_deleted) || state.orderedPages[0],
    sourceFiles: (state) => Array.from(new Set(state.pages.filter(p => !p.is_deleted).map(p => p.source_filename))),
    progressStats: (state) => {
      const active = state.pages.filter(p => !p.is_deleted);
      return {
        total: active.length,
        approved: active.filter(p => p.status === 'approved').length,
        needsWork: active.filter(p => p.status === 'needs_work').length,
        processing: active.filter(p => p.job_status === 'processing').length,
        pending: active.filter(p => p.status === 'pending_review' && p.job_status !== 'processing').length
      };
    }
  },
  actions: {
    log(level: 'info' | 'success' | 'warn' | 'error' | 'debug', msg: string) {
      const time = new Date().toISOString().split('T')[1].replace('Z', '');
      this.logs.push({ time, level, msg });
      console.log(`[${level.toUpperCase()}] ${msg}`);
    },
    updateReviewerPref(name: string) {
      this.reviewerPref = name;
      if (typeof window !== 'undefined') localStorage.setItem('reviewerPref', name);
    },
    setViewMode(mode: 'review' | 'editor') {
      this.viewMode = mode;
    },
    async fetchWorkspace() {
      this.isLoadingWorkspace = true;
      try {
        const data: any = await $fetch(`/api/workspace/current`);
        if (data.stats) this.globalStats = data.stats;
        if (data && data.document) {
          this.pages = data.pages || [];
          if (this.pages.length && !this.lastSelectedId) {
            this.selectPage(this.orderedPages[0]?.id, false, false);
          }
          if (this.pages.length === 0 && !this.isUploading) {
            this.document = null;
          } else {
            this.document = data.document;
          }
        } else {
          this.document = null;
          this.pages = [];
        }
      } catch (err: any) {
        this.log('error', `DB Fetch Error: ${err.message}`);
      } finally {
        this.isLoadingWorkspace = false;
      }
    },
    async insertFiles(files: File[], insertAfterId?: string) {
      if (!files.length) return;
      this.isUploading = true;
      this.uploadProgress = 0;
      
      try {
        if (!this.document) {
          this.uploadStatusText = 'Initializing Single Project...';
          const res: any = await $fetch('/api/workspace/init', { method: 'POST' });
          if (!res || !res.id) throw new Error("Server failed to return a valid Project ID.");
          this.document = { id: res.id, filename: 'Active Legal Project', status: 'open' };
          this.pages = [];
        }

        let totalPagesExpected = 0;
        const pdfDocs: { pdf: any, file: File, pages: number }[] = [];

        this.uploadStatusText = 'Reading PDFs...';
        
        for (const file of files) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          totalPagesExpected += pdf.numPages;
          pdfDocs.push({ pdf, file, pages: pdf.numPages });
        }

        if (totalPagesExpected === 0) throw new Error("No pages could be extracted from the uploaded PDFs.");

        let totalPagesProcessed = 0;
        const uploadedIds: string[] = [];

        for (const docObj of pdfDocs) {
          for (let i = 1; i <= docObj.pages; i++) {
            this.uploadStatusText = `Extracting: ${docObj.file.name} (Page ${i}/${docObj.pages})`;
            await new Promise(r => setTimeout(r, 20)); 
            
            const page = await docObj.pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); 
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context failed.");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({ canvasContext: ctx, viewport }).promise;
            const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));

            const formData = new FormData();
            formData.append('document_id', this.document.id);
            formData.append('source_filename', docObj.file.name);
            formData.append('page_number', i.toString());
            formData.append('file', blob as Blob);

            const uploadRes: any = await $fetch('/api/pages/upload', { method: 'POST', body: formData });
            uploadedIds.push(uploadRes.id);
            
            totalPagesProcessed++;
            this.uploadProgress = Math.round((totalPagesProcessed / totalPagesExpected) * 100);
          }
        }
        
        this.uploadStatusText = 'Finalizing Assembly...';
        await this.fetchWorkspace();
        
        if (insertAfterId && uploadedIds.length > 0) {
           const list = [...this.orderedPages];
           const newPages = list.filter(p => uploadedIds.includes(p.id));
           const filteredList = list.filter(p => !uploadedIds.includes(p.id));
           
           if (insertAfterId === 'START') {
              filteredList.unshift(...newPages);
           } else {
              const targetIdx = filteredList.findIndex(p => p.id === insertAfterId);
              if (targetIdx !== -1) {
                 filteredList.splice(targetIdx + 1, 0, ...newPages);
              } else {
                 filteredList.push(...newPages);
              }
           }
           await this.updatePageOrder(filteredList.map(p => p.id));
           await this.fetchWorkspace();
        }
      } catch (err: any) { 
        this.log('error', `FATAL Upload Sequence Error: ${err.message}`);
        alert('Upload Sequence Failed: ' + (err.message || 'Server error')); 
      } finally { 
        this.isUploading = false; 
        this.uploadStatusText = ''; 
        this.uploadProgress = 0; 
      }
    },
    async replacePage(pageId: string, file: File) {
      if (!this.document) return;
      this.isUploading = true;
      this.uploadProgress = 0;
      this.uploadStatusText = 'Replacing Page...';
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        
        let targetId = pageId;
        const newPageIds: string[] = [];
        
        for (let i = 1; i <= totalPages; i++) {
          this.uploadStatusText = `Extracting Replacement: ${file.name} (Page ${i}/${totalPages})`;
          await new Promise(r => setTimeout(r, 20));
          
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;
          const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
          if (!blob) continue;
          
          const formData = new FormData();
          formData.append('file', blob as Blob);
          
          if (i === 1) {
             await $fetch(`/api/pages/${targetId}/replace`, { method: 'POST', body: formData });
          } else {
             formData.append('document_id', this.document.id);
             formData.append('source_filename', file.name);
             formData.append('page_number', i.toString());
             const uploadRes: any = await $fetch('/api/pages/upload', { method: 'POST', body: formData });
             newPageIds.push(uploadRes.id);
          }
          this.uploadProgress = Math.round((i / totalPages) * 100);
        }
        
        if (newPageIds.length > 0) {
           this.uploadStatusText = 'Reordering...';
           await this.fetchWorkspace(); 
           const list = [...this.orderedPages];
           const targetIdx = list.findIndex(p => p.id === targetId);
           if (targetIdx !== -1) {
              const newPages = list.filter(p => newPageIds.includes(p.id));
              const filteredList = list.filter(p => !newPageIds.includes(p.id));
              filteredList.splice(targetIdx + 1, 0, ...newPages);
              await this.updatePageOrder(filteredList.map(p => p.id));
           }
        }
        
        await this.fetchWorkspace();
        this.selectPage(targetId);
      } catch (err: any) {
        alert('Replacement Sequence Failed: ' + (err.message || 'Server error'));
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
    nextPage() {
      if (!this.lastSelectedId) return;
      const idx = this.orderedPages.findIndex(p => p.id === this.lastSelectedId);
      if (idx !== -1 && idx < this.orderedPages.length - 1) {
        this.selectPage(this.orderedPages[idx + 1].id, false, false);
      }
    },
    prevPage() {
      if (!this.lastSelectedId) return;
      const idx = this.orderedPages.findIndex(p => p.id === this.lastSelectedId);
      if (idx > 0) {
        this.selectPage(this.orderedPages[idx - 1].id, false, false);
      }
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
          const res: any = await $fetch(`/api/pages/${id}/process`, { method: 'POST' });
          page.job_status = 'completed';
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
    async updatePageInfo(id: string, updates: any) {
      const page = this.pages.find(p => p.id === id);
      if (page) {
        Object.assign(page, updates);
        await $fetch('/api/pages/update', { method: 'PUT', body: { id, ...updates } });
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
        
        if (this.pages.every(p => p.is_deleted)) {
          this.fetchWorkspace();
        }
      }
    },
    async saveDocumentHtml(html: string | null) {
      if (!this.document) return;
      this.document.manual_html_override = html;
      await $fetch('/api/documents/update', { 
        method: 'PUT', 
        body: { id: this.document.id, manual_html_override: html } 
      });
    }
  }
});