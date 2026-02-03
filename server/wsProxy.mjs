/**
 * WebSocket and HTTP Proxy Server for DashScope APIs
 * 
 * This proxy is needed because:
 * 1. Browser WebSockets cannot send custom HTTP headers
 * 2. Browser fetch requests are blocked by CORS policy
 * DashScope requires Authorization header for authentication, so we proxy through
 * this server which adds the required headers.
 */
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const DASHSCOPE_API_KEY = process.env.VITE_DASHSCOPE_API_KEY;
const PROXY_PORT = process.env.WS_PROXY_PORT || 3001;

// DashScope endpoints
// Using international endpoints (dashscope-intl) for Singapore region API keys
const DASHSCOPE_ASR_ENDPOINT = 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime';
const DASHSCOPE_TTS_ENDPOINT = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';
const DASHSCOPE_TTS_HTTP_ENDPOINT = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2audio/generation';
const DASHSCOPE_LLM_HTTP_ENDPOINT = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

if (!DASHSCOPE_API_KEY) {
  console.error('Error: VITE_DASHSCOPE_API_KEY is not set in .env file');
  process.exit(1);
}

/**
 * HTTP Proxy Handler for LLM requests
 */
async function handleLLMProxy(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  
  // Read request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    console.log('[Proxy] LLM request received');
    
    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(body);
      console.log('[Proxy] LLM Request model:', requestData.model);
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
    
    // Convert to DashScope format
    const dashscopeRequest = {
      model: requestData.model,
      input: {
        messages: requestData.messages
      },
      parameters: {
        max_tokens: requestData.maxTokens || 150,
        temperature: requestData.temperature || 0.7,
        result_format: 'message'
      }
    };
    
    const postData = JSON.stringify(dashscopeRequest);
    
    // Prepare request options
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
      },
      rejectUnauthorized: false
    };
    
    console.log('[Proxy] Forwarding to DashScope LLM endpoint');
    
    // Forward request to DashScope
    const proxyReq = https.request(DASHSCOPE_LLM_HTTP_ENDPOINT, options, (proxyRes) => {
      console.log('[Proxy] DashScope LLM response status:', proxyRes.statusCode);
      
      // Set response headers
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(proxyRes.statusCode);
      
      // Pipe the response back to the client
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (error) => {
      console.error('[Proxy] LLM request error:', error.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy request failed', details: error.message }));
    });
    
    proxyReq.write(postData);
    proxyReq.end();
  });
}

/**
 * HTTP Proxy Handler for TTS requests
 */
async function handleTTSProxy(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  
  // Read request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    console.log('[Proxy] TTS request received');
    console.log('[Proxy] API Key loaded:', DASHSCOPE_API_KEY ? `${DASHSCOPE_API_KEY.substring(0, 10)}...` : 'MISSING');
    console.log('[Proxy] TTS Endpoint:', DASHSCOPE_TTS_HTTP_ENDPOINT);
    
    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(body);
      console.log('[Proxy] Request body:', JSON.stringify(requestData, null, 2));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
    
    // Prepare request to DashScope
    const postData = JSON.stringify(requestData);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'X-DashScope-DataInspection': 'enable',
        'Content-Length': Buffer.byteLength(postData),
      },
      rejectUnauthorized: false, // Allow self-signed certs in dev
    };
    
    // Forward request to DashScope
    console.log('[Proxy] Forwarding to DashScope TTS endpoint');
    console.log('[Proxy] Authorization header:', `Bearer ${DASHSCOPE_API_KEY.substring(0, 10)}...`);
    const proxyReq = https.request(DASHSCOPE_TTS_HTTP_ENDPOINT, options, (proxyRes) => {
      console.log(`[Proxy] TTS response status: ${proxyRes.statusCode}`);
      
      // Forward status code and headers
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      
      // Forward response body
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (error) => {
      console.error('[Proxy] TTS request error:', error.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy request failed', message: error.message }));
    });
    
    // Send request body
    proxyReq.write(postData);
    proxyReq.end();
  });
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'ws-proxy' }));
    return;
  }
  
  // TTS proxy endpoint
  if (req.url === '/api/tts') {
    handleTTSProxy(req, res);
    return;
  }
  
  // LLM proxy endpoint
  if (req.url === '/api/llm') {
    handleLLMProxy(req, res);
    return;
  }
  
  res.writeHead(404);
  res.end();
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (clientWs, req) => {
  const url = new URL(req.url, `http://localhost:${PROXY_PORT}`);
  const service = url.searchParams.get('service') || 'asr';
  const model = url.searchParams.get('model') || 'qwen3-asr-flash-realtime';
  
  console.log(`[Proxy] New client connection for service: ${service}, model: ${model}`);
  
  // Determine DashScope endpoint based on service
  let dashscopeUrl;
  if (service === 'asr') {
    dashscopeUrl = `${DASHSCOPE_ASR_ENDPOINT}?model=${model}`;
  } else if (service === 'tts') {
    dashscopeUrl = DASHSCOPE_TTS_ENDPOINT;
  } else {
    console.error(`[Proxy] Unknown service: ${service}`);
    clientWs.close(4000, 'Unknown service');
    return;
  }
  
  console.log(`[Proxy] Connecting to DashScope: ${dashscopeUrl}`);
  
  // Connect to DashScope with proper authentication headers
  // Note: rejectUnauthorized: false is for development only
  // In production, use proper SSL certificates
  const dashscopeWs = new WebSocket(dashscopeUrl, {
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
    rejectUnauthorized: false, // Allow self-signed certificates in development
  });
  
  // Handle DashScope connection open
  dashscopeWs.on('open', () => {
    console.log('[Proxy] Connected to DashScope');
  });
  
  // Forward messages from DashScope to client
  dashscopeWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data, { binary: isBinary });
    }
  });
  
  // Handle DashScope errors
  dashscopeWs.on('error', (error) => {
    console.error('[Proxy] DashScope WebSocket error:', error.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'error',
        error: {
          message: error.message,
          code: 'proxy_upstream_error',
        },
      }));
    }
  });
  
  // Handle DashScope close
  dashscopeWs.on('close', (code, reason) => {
    console.log(`[Proxy] DashScope connection closed: ${code} - ${reason.toString()}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason.toString());
    }
  });
  
  // Forward messages from client to DashScope
  clientWs.on('message', (data, isBinary) => {
    if (dashscopeWs.readyState === WebSocket.OPEN) {
      dashscopeWs.send(data, { binary: isBinary });
    }
  });
  
  // Handle client errors
  clientWs.on('error', (error) => {
    console.error('[Proxy] Client WebSocket error:', error.message);
  });
  
  // Handle client close
  clientWs.on('close', (code, reason) => {
    console.log(`[Proxy] Client connection closed: ${code} - ${reason}`);
    if (dashscopeWs.readyState === WebSocket.OPEN) {
      dashscopeWs.close(code, reason.toString());
    }
  });
});

// Start server
server.listen(PROXY_PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           DashScope WebSocket & HTTP Proxy Server              ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: Running                                               ║
║  Port: ${PROXY_PORT}                                                    ║
║  ASR WebSocket: ws://localhost:${PROXY_PORT}?service=asr&model=...    ║
║  TTS HTTP: http://localhost:${PROXY_PORT}/api/tts                     ║
║  Health Check: http://localhost:${PROXY_PORT}/health                   ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Proxy] Shutting down...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});
