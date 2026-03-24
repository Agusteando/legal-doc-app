import { defineStore } from 'pinia';
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export interface LogEntry {
  time: string;
  level: 'info' | 'success' | 'warn' | 'error';
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
      
      isUploading: false,
      uploadStatusText: '',
      uploadProgress: 0,
      reviewerPref: reviewer,
      isLoadingWorkspace: true,
      
      // Diagnostic tracking
      logs: [] as LogEntry[],
      globalStats: { totalDocuments: 0, totalPages: 0, deletedPages: 0 }
    };
  },
  getters: {
    orderedPages: (state) => [...state.pages].filter(p => !p.is_deleted).sort((a, b) => a.sort_order - b.sort_order),
    selectedPages: (state) => state.pages.filter(p => state.selectedPageIds.has(p.id) && !p.is_deleted),
    activePage: (state) => state.pages.find(p => p.id === state.lastSelectedId && !p.is_deleted) || state.orderedPages[0],
    sourceFiles: (state) => Array.from(new Set(state.pages.filter(p => !p.is_deleted).map(p => p.source_filename)))
  },
  actions: {
    log(level: 'info' | 'success' | 'warn' | 'error', msg: string) {
      const time = new Date().toISOString().split('T')[1].replace('Z', '');
      this.logs.push({ time, level, msg });
      console.log(`[${level.toUpperCase()}] ${msg}`);
    },
    updateReviewerPref(name: string) {
      this.reviewerPref = name;
      if (typeof window !== 'undefined') localStorage.setItem('reviewerPref', name);
    },
    async fetchWorkspace() {
      this.isLoadingWorkspace = true;
      this.log('info', 'Booting application. Requesting current global project from /api/workspace/current...');
      
      try {
        const data: any = await $fetch(`/api/workspace/current`);
        
        if (data.stats) {
          this.globalStats = data.stats;
          this.log('success', `DB Reachable. Global Stats -> Docs: ${data.stats.totalDocuments}, Pages: ${data.stats.totalPages}, Deleted Pages: ${data.stats.deletedPages}`);
        }
        
        if (data && data.document) {
          this.log('success', `Found active project document [ID: ${data.document.id}]. Recovered ${data.pages?.length || 0} active pages.`);
          this.document = data.document;
          this.pages = data.pages || [];
          
          if (this.pages.length && !this.lastSelectedId) {
            this.selectPage(this.orderedPages[0]?.id, false, false);
          }
          
          if (this.pages.length > 0) {
            this.log('info', 'UI Router Decision: Active document + Pages > 0. Showing Workspace Viewer.');
          } else {
            this.log('warn', 'UI Router Decision: Document exists but has 0 active pages. Showing Upload Screen.');
          }
        } else {
          this.log('warn', `No documents found in DB. UI Router Decision: Showing Upload Screen.`);
          this.document = null;
          this.pages = [];
        }
      } catch (err: any) {
        this.log('error', `CRITICAL: Failed to fetch from DB -> ${err.message || err.statusMessage}`);
      } finally {
        this.isLoadingWorkspace = false;
      }
    },
    async addFiles(files: File[]) {
      this.log('info', `addFiles triggered with ${files.length} PDFs.`);
      if (!files.length) return;
      this.isUploading = true;
      this.uploadProgress = 0;
      
      let uploadErrors: string[] = [];
      
      try {
        if (!this.document) {
          this.uploadStatusText = 'Initializing Single Project...';
          this.log('info', `No active document in state. Hitting /api/workspace/init to fetch or create global project.`);
          const res: any = await $fetch('/api/workspace/init', { method: 'POST' });
          
          if (!res || !res.id) throw new Error("Server failed to return a valid Project ID.");
          this.log('success', `Global Project ID acquired: ${res.id}`);
          
          this.document = { id: res.id, filename: 'Active Legal Project', status: 'open' };
          this.pages = [];
        }

        let totalPagesProcessed = 0;
        let totalPagesExpected = 0;
        const pdfDocs: { pdf: any, file: File, pages: number }[] = [];

        this.uploadStatusText = 'Reading PDFs...';
        this.log('info', 'Parsing PDFs via pdfjs-dist worker...');
        
        for (const file of files) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            this.log('success', `Parsed ${file.name} successfully. Found ${pdf.numPages} pages.`);
            totalPagesExpected += pdf.numPages;
            pdfDocs.push({ pdf, file, pages: pdf.numPages });
          } catch (pdfErr: any) {
             this.log('error', `Failed to parse PDF ${file.name}: ${pdfErr.message}`);
             uploadErrors.push(`Failed to read ${file.name}`);
          }
        }

        if (totalPagesExpected === 0) throw new Error("No pages could be extracted from the uploaded PDFs.");
        this.log('info', `Beginning Canvas render and Casita upload loop for ${totalPagesExpected} pages.`);

        for (const docObj of pdfDocs) {
          for (let i = 1; i <= docObj.pages; i++) {
            this.uploadStatusText = `Extracting: ${docObj.file.name} (Page ${i}/${docObj.pages})`;
            await new Promise(r => setTimeout(r, 20)); 
            
            try {
              const page = await docObj.pdf.getPage(i);
              const viewport = page.getViewport({ scale: 2.0 }); 
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (!ctx) throw new Error("Could not construct local 2D canvas context.");
              
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              await page.render({ canvasContext: ctx, viewport }).promise;
              const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
              if (!blob) throw new Error("Canvas toBlob conversion failed.");

              const formData = new FormData();
              formData.append('document_id', this.document.id);
              formData.append('source_filename', docObj.file.name);
              formData.append('page_number', i.toString());
              formData.append('file', blob);

              const uploadRes: any = await $fetch('/api/pages/upload', { method: 'POST', body: formData });
              
              if (!uploadRes || !uploadRes.id) throw new Error("Invalid response from server during page upload.");
              this.log('success', `Uploaded ${docObj.file.name} Page ${i}. DB ID: ${uploadRes.id}`);
              
              totalPagesProcessed++;
              this.uploadProgress = Math.round((totalPagesProcessed / totalPagesExpected) * 100);
            } catch (err: any) { 
              this.log('error', `Failed upload on ${docObj.file.name} Page ${i}: ${err.message}`);
              uploadErrors.push(`Page ${i} error: ${err.message}`);
            }
          }
        }
        
        this.log('info', `Extraction completed. Uploaded ${totalPagesProcessed} of ${totalPagesExpected}. Finalizing...`);
        this.uploadStatusText = 'Finalizing View...';
        await this.fetchWorkspace();
        
        if (uploadErrors.length > 0) {
          this.log('error', `Upload sequence finished with ${uploadErrors.length} errors.`);
          alert(`Upload completed with ${uploadErrors.length} errors. See Diagnostic Panel.`);
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
    // Keep other actions identical...
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
          const res: any = await $fetch('/api/pages/upload', { method: 'POST', body: formData });
          newPagesData.push({ page_number: i, image_url: res.image_url });
          this.uploadProgress = Math.round((i / totalPages) * 100);
        }
        this.uploadStatusText = 'Updating Assembly...';
        await $fetch('/api/documents/replace-file', {
          method: 'POST',
          body: { document_id: this.document.id, old_filename: oldFilename, new_filename: newFile.name, new_pages: newPagesData }
        });
        await this.fetchWorkspace();
      } catch (err: any) { alert('Replacement Error: ' + err.message); } 
      finally { this.isUploading = false; this.uploadStatusText = ''; this.uploadProgress = 0; }
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
        
        // If they delete the absolute last page, fetchWorkspace will drop them cleanly to the Uploader
        if (this.pages.every(p => p.is_deleted)) {
          this.log('warn', 'All pages deleted. Reloading state to fallback to Uploader.');
          this.fetchWorkspace();
        }
      }
    }
  }
});