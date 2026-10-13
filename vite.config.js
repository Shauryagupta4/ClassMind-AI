import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fetchMultilingualTranscript, getYouTubeMetadata } from './api/transcriptFetcher.js'

function devApiPlugin() {
  return {
    name: 'dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/transcript')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            return res.end();
          }

          let urlParam = null;
          let langParam = null;

          if (req.method === 'GET') {
            const parsed = new URL(req.url, 'http://localhost');
            urlParam = parsed.searchParams.get('url');
            langParam = parsed.searchParams.get('lang');
          } else if (req.method === 'POST') {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            try {
              const body = JSON.parse(Buffer.concat(buffers).toString('utf-8'));
              urlParam = body.url;
              langParam = body.lang;
            } catch (e) {}
          }

          if (!urlParam) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'YouTube URL is required' }));
          }

          try {
            const result = await fetchMultilingualTranscript(urlParam, langParam);
            res.statusCode = 200;
            return res.end(JSON.stringify(result));
          } catch (err) {
            console.error('Vite dev transcript notice:', err.message || err);
            const meta = await getYouTubeMetadata(urlParam);
            const videoTitle = err.videoTitle || meta?.title || null;
            const author = err.author || meta?.author || null;

            res.statusCode = 422;
            return res.end(JSON.stringify({
              error: videoTitle 
                ? `The YouTube creator has disabled closed captions/subtitles on "${videoTitle}".`
                : 'Closed captions or subtitles are unavailable on this video.',
              videoTitle,
              author,
              disabledCaptions: true
            }));
          }
        } else if (req.url.startsWith('/api/health')) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          return res.end(JSON.stringify({ status: 'ok', server: 'ClassMind Vite Dev Server' }));
        } else {
          next();
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    devApiPlugin()
  ],
})
