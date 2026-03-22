#!/usr/bin/env node

/**
 * MiniMax Use - MiniMax AI tools for Node.js
 * 
 * 统一接口:
 *   import { chat, translate, understandImage, webSearch } from 'minimax-use/scripts/index.js';
 * 
 * CLI 用法:
 *   node scripts/index.js chat "hello"
 *   node scripts/index.js image "what is this?" /path/to/image.jpg
 *   node scripts/index.js translate "hello" --to Chinese
 *   node scripts/index.js search "news"
 */

import { readFileSync } from 'fs';
import { resolve, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Config
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_API_HOST = process.env.MINIMAX_API_HOST || 'https://api.minimaxi.com/anthropic';
const MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';
const VISION_MODEL = process.env.MINIMAX_VISION_MODEL || 'MiniMax-M2.7';

if (!MINIMAX_API_KEY) {
  console.error('Error: MINIMAX_API_KEY environment variable not set.');
  console.error('Get your API key at: https://platform.minimaxi.com');
  process.exit(1);
}

/**
 * Chat with LLM
 * @param {string} message - User message
 * @param {Object} opts - Options
 * @param {string} opts.system - System prompt
 * @param {string} opts.model - Model name (default: MiniMax-M2.7)
 * @param {number} opts.temperature - Temperature 0-1 (default: 1.0)
 * @param {number} opts.max_tokens - Max tokens (default: 4096)
 * @param {boolean} opts.stream - Enable streaming (default: false)
 * @param {Array} opts.history - Chat history [{role: 'user'|'assistant', content: '...'}]
 * @returns {Promise<{success: boolean, result?: {content: string}, error?: string}>}
 */
async function chat(message, opts = {}) {
  const {
    system = null,
    model = MODEL,
    temperature = 1.0,
    max_tokens = 4096,
    stream = false,
    history = null
  } = opts;

  const msgs = [];
  if (system) msgs.push({ role: 'system', content: system });
  if (history) msgs.push(...history);
  msgs.push({ role: 'user', content: message });

  try {
    const body = {
      model,
      messages: msgs,
      max_tokens,
      stream,
    };
    if (temperature !== undefined) body.temperature = temperature;

    const resp = await fetch(`${MINIMAX_API_HOST}/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return { success: false, error: `HTTP ${resp.status}: ${err}` };
    }

    if (stream) {
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        process.stdout.write(chunk);
        content += chunk;
      }
      return { success: true, result: { content } };
    }

    const data = await resp.json();
    let content = '';
    for (const block of data.content || []) {
      if (block.type === 'text') content += block.text;
    }
    return { success: true, result: { content } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Understand/analyze image
 * @param {string} prompt - Question about the image
 * @param {string} imagePath - Path to image file or URL
 * @param {Object} opts - Options
 * @param {string} opts.model - Vision model (default: MiniMax-M2.7)
 * @param {number} opts.temperature - Temperature 0-1 (default: 0.3)
 * @param {number} opts.max_tokens - Max tokens (default: 300)
 * @returns {Promise<{success: boolean, result?: {content: string}, error?: string}>}
 */
async function understandImage(prompt, imagePath, opts = {}) {
  const {
    model = VISION_MODEL,
    temperature = 0.3,
    max_tokens = 300
  } = opts;

  try {
    let imageUrl = imagePath;
    let mimeType = 'image/jpeg';
    let imageData = '';
    
    // If local file, convert to base64 data URL
    if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://') && !imagePath.startsWith('data:')) {
      const buffer = readFileSync(resolve(imagePath));
      const ext = extname(imagePath).toLowerCase().slice(1);
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
      mimeType = mimeMap[ext] || 'image/jpeg';
      imageData = buffer.toString('base64');
      imageUrl = `data:${mimeType};base64,${imageData}`;
    }

    // Build content array for request
    const requestContent = [];
    if (imageData) {
      requestContent.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: imageData } });
    } else {
      requestContent.push({ type: 'image', source: { type: 'url', url: imageUrl } });
    }
    requestContent.push({ type: 'text', text: prompt });

    const resp = await fetch(`${MINIMAX_API_HOST}/v1/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: requestContent }],
        temperature,
        max_tokens,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return { success: false, error: `HTTP ${resp.status}: ${err}` };
    }

    const data = await resp.json();
    let content = '';
    for (const block of data.content || []) {
      if (block.type === 'text') content += block.text;
    }
    return { success: true, result: { content } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Translate text
 * @param {string} text - Text to translate
 * @param {Object} opts - Options
 * @param {string} opts.to - Target language (default: 'English')
 * @param {string} opts.from - Source language (default: 'auto')
 * @param {string} opts.model - Model name (default: MiniMax-M2.7)
 * @returns {Promise<{success: boolean, result?: {content: string}, error?: string}>}
 */
async function translate(text, opts = {}) {
  const { to = 'English', from = 'auto', model = MODEL } = opts;
  const systemPrompt = `You are a professional translator. Translate the following text to ${to}${from !== 'auto' ? ` from ${from}` : ''}. Only output the translated text, no explanations.`;
  return await chat(text, { system: systemPrompt, model, temperature: 0.3, max_tokens: 4096 });
}

/**
 * Web search using MiniMax search API
 * @param {string} query - Search query
 * @param {Object} opts - Options
 * @param {number} opts.count - Number of results (default: 10)
 * @returns {Promise<{success: boolean, result?: object, error?: string}>}
 */
async function webSearch(query, opts = {}) {
  const { count = 10 } = opts;

  try {
    const resp = await fetch(`${MINIMAX_API_HOST}/v1/coding_plan/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return { success: false, error: `HTTP ${resp.status}: ${err}` };
    }

    const data = await resp.json();
    const baseResp = data.base_resp || {};
    if (baseResp.status_code !== 0) {
      return { success: false, error: baseResp.status_msg || 'API error' };
    }

    return { success: true, result: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/index.js chat "message" [--model MODEL] [--stream]');
    console.log('  node scripts/index.js image "prompt" /path/to/image.jpg [--model MODEL]');
    console.log('  node scripts/index.js translate "text" --to Chinese [--from English]');
    console.log('  node scripts/index.js search "query" [--count N]');
    console.log('');
    console.log('Environment variables:');
    console.log('  MINIMAX_API_KEY      - API key (required)');
    console.log('  MINIMAX_API_HOST    - API host (default: https://api.minimaxi.com/anthropic)');
    console.log('  MINIMAX_MODEL       - chat model (default: MiniMax-M2.7)');
    console.log('  MINIMAX_VISION_MODEL - vision model (default: MiniMax-M2.7)');
    process.exit(0);
  }

  const command = args[0];
  const rest = args.slice(1);

  const getOpt = (args) => {
    const result = {};
    const remaining = [];
    const consumed = new Set();
    for (let i = 0; i < args.length; i++) {
      if (consumed.has(i)) continue;
      const opt = args[i];
      if (opt === '--model' && i + 1 < args.length) { result.model = args[i + 1]; consumed.add(i); consumed.add(i + 1); }
      else if (opt === '--stream') { result.stream = true; consumed.add(i); }
      else if (opt === '--to' && i + 1 < args.length) { result.to = args[i + 1]; consumed.add(i); consumed.add(i + 1); }
      else if (opt === '--from' && i + 1 < args.length) { result.from = args[i + 1]; consumed.add(i); consumed.add(i + 1); }
      else if (opt === '--count' && i + 1 < args.length) { result.count = parseInt(args[i + 1]); consumed.add(i); consumed.add(i + 1); }
      else if (!opt.startsWith('--')) { remaining.push(opt); consumed.add(i); }
    }
    return { parsed: result, remaining };
  };

  let result;
  switch (command) {
    case 'chat': {
      const msg = rest.find(a => !a.startsWith('--')) || '';
      const { parsed } = getOpt(rest);
      result = await chat(msg, parsed);
      break;
    }
    case 'image': {
      const prompt = rest.filter(a => !a.startsWith('--') && !a.startsWith('/')).join(' ');
      const imagePath = rest.find(a => a.startsWith('/'));
      const { parsed } = getOpt(rest);
      if (!imagePath) { console.error('Error: image path required'); process.exit(1); }
      result = await understandImage(prompt, imagePath, parsed);
      break;
    }
    case 'translate': {
      const text = rest.find(a => !a.startsWith('--')) || '';
      const { parsed } = getOpt(rest);
      result = await translate(text, parsed);
      break;
    }
    case 'search': {
      const query = rest.find(a => !a.startsWith('--')) || '';
      const { parsed } = getOpt(rest);
      result = await webSearch(query, parsed);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`); process.exit(1);
  }

  if (result?.success) {
    console.log(JSON.stringify(result.result, null, 2));
  } else {
    console.error('Error:', result?.error || 'Unknown error');
    process.exit(1);
  }
}

export { chat, understandImage, translate, webSearch };

// Run CLI if executed directly
main().catch(err => { console.error('Fatal error:', err.message); process.exit(1); });
