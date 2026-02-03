/**
 * WebSocket Proxy Server for DashScope ASR
 * 
 * This proxy is needed because browser WebSockets cannot send custom HTTP headers.
 * DashScope requires Authorization header for authentication, so we proxy through
 * this server which adds the required headers.
 */
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
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
const DASHSCOPE_ASR_ENDPOINT = 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime';
const DASHSCOPE_TTS_ENDPOINT = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';

if (!DASHSCOPE_API_KEY) {
  console.error('Error: VITE_DASHSCOPE_API_KEY is not set in .env file');
  process.exit(1);
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'ws-proxy' }));
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
  const dashscopeWs = new WebSocket(dashscopeUrl, {
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
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
║           DashScope WebSocket Proxy Server                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Status: Running                                               ║
║  Port: ${PROXY_PORT}                                                    ║
║  ASR Endpoint: ws://localhost:${PROXY_PORT}?service=asr&model=...      ║
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
