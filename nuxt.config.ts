export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  ssr: false, 
  app: {
    head: {
      title: 'Legal PDF Workbench',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap' }
      ],
      script: [
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