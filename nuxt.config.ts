export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  ssr: false, // Strongly client-side driven for the PDF parsing & layout
  app: {
    head: {
      title: 'Legal PDF Workbench',
      script: [
        // Load PDF.js worker from CDN to avoid complex Vite worker bundling issues
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' }
      ]
    }
  },
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT || '3306',
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,
    storageUploadUrl: process.env.STORAGE_UPLOAD_URL || 'https://expediente.casitaapps.com/upload.ashx',
  },
  compatibilityDate: '2025-01-01',
})