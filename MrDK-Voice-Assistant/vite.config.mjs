import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const productionCsp = () => ({name:'mrdk-build-csp',apply:'build',transformIndexHtml(html){return html.replace('</head>', `    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; frame-src 'none'" />\n  </head>`);}});
export default defineConfig({plugins: [react(), productionCsp()], server: {host:'127.0.0.1',port:5173,strictPort:true},base:'./',build:{outDir:'dist'}});
