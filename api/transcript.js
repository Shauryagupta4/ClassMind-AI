import { fetchMultilingualTranscript, getYouTubeMetadata } from './transcriptFetcher.js';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  } else if (Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString()); } catch (e) {}
  }

  const url = body?.url || req.query?.url;
  const lang = body?.lang || req.query?.lang;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  try {
    const result = await fetchMultilingualTranscript(url, lang);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Transcript extraction notice:', error.message || error);
    const meta = await getYouTubeMetadata(url);
    const videoTitle = error.videoTitle || meta?.title || null;
    const author = error.author || meta?.author || null;

    return res.status(422).json({
      error: videoTitle 
        ? `The YouTube creator has disabled closed captions/subtitles on "${videoTitle}".`
        : 'Closed captions or subtitles are unavailable on this video.',
      videoTitle,
      author,
      disabledCaptions: true
    });
  }
}
