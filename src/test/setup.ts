// Test setup for Node environment with browser API mocks
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// =============================================================================
// AudioContext Mock
// =============================================================================

class MockAudioBuffer {
  numberOfChannels = 1;
  length: number;
  sampleRate: number;
  duration: number;
  private channelData: Float32Array[];

  constructor(options: { numberOfChannels?: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels || 1;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    this.channelData = Array(this.numberOfChannels)
      .fill(null)
      .map(() => new Float32Array(options.length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channelData[channel] || new Float32Array(this.length);
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel?: number): void {
    const source = this.channelData[channelNumber];
    const start = startInChannel || 0;
    destination.set(source.slice(start, start + destination.length));
  }

  copyToChannel(source: Float32Array, channelNumber: number, startInChannel?: number): void {
    const start = startInChannel || 0;
    this.channelData[channelNumber].set(source, start);
  }
}

class MockAudioBufferSourceNode {
  buffer: MockAudioBuffer | null = null;
  onended: (() => void) | null = null;
  playbackRate = { value: 1 };
  loop = false;
  loopStart = 0;
  loopEnd = 0;

  connect() {
    return this;
  }

  disconnect() {}

  start() {
    // Simulate audio playback ending
    setTimeout(() => {
      this.onended?.();
    }, 100);
  }

  stop() {
    this.onended?.();
  }
}

class MockGainNode {
  gain = { value: 1 };

  connect() {
    return this;
  }

  disconnect() {}
}

class MockAnalyserNode {
  fftSize = 2048;
  frequencyBinCount = 1024;

  connect() {
    return this;
  }

  disconnect() {}

  getByteFrequencyData(array: Uint8Array) {
    array.fill(128);
  }

  getByteTimeDomainData(array: Uint8Array) {
    array.fill(128);
  }
}

class MockAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running';
  sampleRate = 44100;
  destination = {};
  currentTime = 0;

  constructor(options?: { sampleRate?: number }) {
    if (options?.sampleRate) {
      this.sampleRate = options.sampleRate;
    }
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }

  createGain() {
    return new MockGainNode();
  }

  createAnalyser() {
    return new MockAnalyserNode();
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  async decodeAudioData(
    _arrayBuffer: ArrayBuffer,
    successCallback?: (buffer: MockAudioBuffer) => void
  ): Promise<MockAudioBuffer> {
    const buffer = new MockAudioBuffer({
      numberOfChannels: 1,
      length: 44100,
      sampleRate: this.sampleRate,
    });
    successCallback?.(buffer);
    return buffer;
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }
}

class MockOfflineAudioContext extends MockAudioContext {
  async startRendering(): Promise<MockAudioBuffer> {
    return new MockAudioBuffer({
      numberOfChannels: 1,
      length: 44100,
      sampleRate: this.sampleRate,
    });
  }
}

// =============================================================================
// MediaDevices Mock
// =============================================================================

class MockMediaStream {
  id = 'mock-stream-id';
  active = true;

  getTracks() {
    return [
      {
        stop: vi.fn(),
        enabled: true,
        kind: 'audio',
        label: 'Mock Audio Track',
      },
    ];
  }

  getAudioTracks() {
    return this.getTracks();
  }

  getVideoTracks() {
    return [];
  }
}

const mockMediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
  enumerateDevices: vi.fn().mockResolvedValue([]),
  getDisplayMedia: vi.fn().mockResolvedValue(new MockMediaStream()),
};

// =============================================================================
// localStorage Mock
// =============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

// =============================================================================
// WebSocket Mock
// =============================================================================

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send = vi.fn();
  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
  });
}

// =============================================================================
// Fetch Mock
// =============================================================================

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(''),
  blob: vi.fn().mockResolvedValue(new Blob()),
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  headers: new Headers(),
});

// =============================================================================
// ResizeObserver Mock
// =============================================================================

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// =============================================================================
// IntersectionObserver Mock
// =============================================================================

class MockIntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds: number[] = [];

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

// =============================================================================
// matchMedia Mock
// =============================================================================

const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// =============================================================================
// Navigator Mock Extensions
// =============================================================================

const navigatorMock = {
  mediaDevices: mockMediaDevices,
  onLine: true,
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  userAgent: 'vitest',
  language: 'en-US',
  languages: ['en-US', 'en'],
  platform: 'test',
  connection: undefined,
  mozConnection: undefined,
  webkitConnection: undefined,
};

// =============================================================================
// Setup and Teardown
// =============================================================================

beforeAll(() => {
  // Create global window object for Node environment
  const windowMock = {
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    navigator: navigatorMock,
    localStorage: localStorageMock,
    matchMedia: mockMatchMedia,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  
  vi.stubGlobal('window', windowMock);
  
  // Install mocks
  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.stubGlobal('webkitAudioContext', MockAudioContext);
  vi.stubGlobal('OfflineAudioContext', MockOfflineAudioContext);
  vi.stubGlobal('AudioBuffer', MockAudioBuffer);
  vi.stubGlobal('localStorage', localStorageMock);
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.stubGlobal('fetch', mockFetch);
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  vi.stubGlobal('matchMedia', mockMatchMedia);
  vi.stubGlobal('navigator', navigatorMock);
  
  // Mock document
  vi.stubGlobal('document', {
    body: { style: { overflow: '' } },
    activeElement: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn().mockReturnValue([]),
  });

  // Mock requestAnimationFrame
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));

  // Mock URL.createObjectURL and revokeObjectURL
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
  
  // Mock btoa and atob for base64 encoding in Node.js
  vi.stubGlobal('btoa', (str: string) => {
    // Use Node.js Buffer for base64 encoding
    return Buffer.from(str, 'binary').toString('base64');
  });
  vi.stubGlobal('atob', (str: string) => {
    // Use Node.js Buffer for base64 decoding
    return Buffer.from(str, 'base64').toString('binary');
  });
});

afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Clear localStorage
  localStorageMock.clear();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// =============================================================================
// Test Utilities
// =============================================================================

export {
  MockAudioContext,
  MockAudioBuffer,
  MockMediaStream,
  MockWebSocket,
  localStorageMock,
  mockFetch,
  mockMediaDevices,
  mockMatchMedia,
};

// Helper to create mock AudioBuffer with data
export function createMockAudioBuffer(
  options: { duration?: number; sampleRate?: number; channels?: number } = {}
): MockAudioBuffer {
  const sampleRate = options.sampleRate || 44100;
  const duration = options.duration || 1;
  const channels = options.channels || 1;
  const length = Math.floor(sampleRate * duration);

  return new MockAudioBuffer({
    numberOfChannels: channels,
    length,
    sampleRate,
  });
}

// Helper to simulate network offline
export function setNetworkOffline(): void {
  Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
  window.dispatchEvent(new Event('offline'));
}

// Helper to simulate network online
export function setNetworkOnline(): void {
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  window.dispatchEvent(new Event('online'));
}

// Helper to wait for async updates
export function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
