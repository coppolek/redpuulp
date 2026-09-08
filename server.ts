import express from 'express';
import path from 'path';
import * as cheerio from 'cheerio';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import Parser from 'rss-parser';
import { GoogleGenAI, Type } from '@google/genai';

async function getOgTags(postId: string | undefined, host: string) {
  let title = "Newswire";
  let description = "Join the discussion on Newswire";
  let imageUrl = "";
  
  if (postId) {
    try {
      const firestoreRes = await fetch(`https://firestore.googleapis.com/v1/projects/ai-studio-32ac6d39-03f4-4bb0-96b9-75741ac61ab2/databases/(default)/documents/posts/${postId}`);
      if (firestoreRes.ok) {
        const doc = await firestoreRes.json();
        const fields = doc.fields;
        if (fields) {
          title = fields.title?.stringValue || title;
          description = fields.description?.stringValue || description;
          imageUrl = fields.imageUrl?.stringValue || imageUrl;
        }
      }
    } catch (e) {
      console.error('Error fetching post for OG tags:', e);
    }
  }

  return `
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="https://${host}/${postId ? `?p=${postId}` : ''}" />
    <meta name="twitter:card" content="summary_large_image" />
  `;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to parse RSS feeds
  app.post('/api/parse-rss', async (req, res) => {
    try {
      const { feedUrl } = req.body;
      if (!feedUrl) {
        return res.status(400).json({ error: 'feedUrl is required' });
      }
      const parser = new Parser({
        customFields: {
          item: ['media:content', 'media:thumbnail', 'description', 'content:encoded', 'enclosure']
        }
      });
      const feed = await parser.parseURL(feedUrl);
      
      const items = feed.items.map(item => {
        let imageUrl = '';
        
        // 1. Check media:content
        if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
          imageUrl = item['media:content'].$.url;
        } 
        // 2. Check media:thumbnail
        else if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
          imageUrl = item['media:thumbnail'].$.url;
        }
        // 3. Check enclosure
        else if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image/')) {
          imageUrl = item.enclosure.url;
        }
        // 4. Parse content:encoded, content, or description for first <img>
        else {
          const content = item['content:encoded'] || item.content || item.description || '';
          const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i) || content.match(/<img[^>]+src='([^'>]+)'/i);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
        }

        return {
          ...item,
          extractedImageUrl: imageUrl
        };
      });

      res.json({ title: feed.title, items: items.slice(0, 30) });
    } catch (e: any) {
      console.error('Error parsing RSS:', e);
      res.status(500).json({ error: 'Failed to parse RSS feed' });
    }
  });

  app.post('/api/translate', async (req, res) => {
    const { title, description } = req.body;
    if (!title && !description) {
      return res.json({ title: '', description: '' });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ title, description }); // fallback if no key
    }
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Translate the following title and description into Italian. Preserve any HTML formatting exactly as it is in the description. Do NOT add markdown wrappers like \`\`\`json.
Return ONLY a valid JSON object with EXACTLY two keys: "title" and "description".

Original Title: ${title || ''}
Original Description: ${description || ''}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return res.json({ 
          title: parsed.title || title, 
          description: parsed.description || description 
        });
      }
      res.json({ title, description });
    } catch (err) {
      console.error('Translation error:', err);
      res.json({ title, description });
    }
  });

  // API Route to fetch OpenGraph data from a URL
  app.post('/api/fetch-metadata', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname.replace('www.', '');

      // Default fallback values
      let title = url;
      let description = '';
      let imageUrl = '';
      let siteName = domain;

      try {
        // Step 1: Try using Microlink API (A free metadata extraction service that handles bot protections)
        const mlResponse = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
          // Add a timeout
          signal: AbortSignal.timeout(8000)
        });

        if (mlResponse.ok) {
          const mlData = await mlResponse.json();
          if (mlData.status === 'success' && mlData.data) {
            title = mlData.data.title || title;
            description = mlData.data.description || description;
            imageUrl = mlData.data.image?.url || mlData.data.logo?.url || imageUrl;
            siteName = mlData.data.publisher || siteName;
            
            return res.json({
              title: title.trim(),
              description: description.trim(),
              imageUrl: imageUrl.trim(),
              domain,
              siteName: siteName.trim()
            });
          }
        }
      } catch (mlError) {
        // Microlink might fail for private groups or bot-protected sites
      }

      // Step 2: Direct fetch fallback if Microlink fails
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);

          // Try fetching OG tags, fallback to standard tags
          title = $('meta[property="og:title"]').attr('content') || $('title').text() || title;
          description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || description;
          imageUrl = $('meta[property="og:image"]').attr('content') || imageUrl;
          siteName = $('meta[property="og:site_name"]').attr('content') || siteName;
        }
      } catch (fetchError) {
        // Direct fetch fails gracefully
      }

      // Final fallback format if still empty
      if (!title || title === url) {
        if (domain.includes('facebook.com')) title = 'Facebook Post';
        else if (domain.includes('immobiliare.it')) title = 'Immobiliare.it Listing';
      }

      // Final fallback response
      res.json({
        title: title.trim() || url,
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        domain,
        siteName: siteName.trim()
      });
    } catch (error: any) {
      console.error('Error in metadata endpoint:', error);
      res.status(500).json({ error: 'Failed to process metadata request' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom', // custom to allow HTML modification
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        // Don't intercept static assets in dev
        if (url.match(/\.[a-zA-Z0-9]+$/)) {
          return next();
        }

        let template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        
        const postId = typeof req.query.p === 'string' ? req.query.p : undefined;
        const ogTags = await getOgTags(postId, req.get('host') || 'localhost');
        template = template.replace('</head>', `${ogTags}\n</head>`);
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Important: index: false prevents static from serving index.html automatically for '/'
    app.use(express.static(distPath, { index: false })); 
    
    app.get('*', async (req, res) => {
      try {
        let html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
        const postId = typeof req.query.p === 'string' ? req.query.p : undefined;
        const ogTags = await getOgTags(postId, req.get('host') || 'localhost');
        html = html.replace('</head>', `${ogTags}\n</head>`);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (e) {
        console.error("Error serving HTML:", e);
        res.status(500).send("Internal Server Error");
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
