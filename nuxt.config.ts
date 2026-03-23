export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  ssr: false, 
  app: {
    head: {
      title: 'Legal PDF Workbench',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Caveat:wght@500;700&display=swap' }
      ],
      script: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' }
      ]
    }
  },
  routeRules: {
    // Extends Vercel timeout for PDF generation and API calls
    '/api/pages/**/process': { maxDuration: 60 },
    '/api/pages/**/sync-layout': { maxDuration: 60 },
    '/api/documents/**/export': { maxDuration: 60 }
  },
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT || '3306',
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    dbName: process.env.DB_NAME,
    storageUploadUrl: process.env.STORAGE_UPLOAD_URL || 'https://expediente.casitaapps.com/upload.ashx',
    
    // Configured to point directly to your new PM2 Ubuntu rendering service
    renderServiceUrl: process.env.RENDER_SERVICE_URL || 'https://puppeteer.casitaapps.com',
    renderServiceToken: process.env.RENDER_SERVICE_TOKEN || 'super_secret_render_token_123',
  },
  compatibilityDate: '2025-01-01',
})