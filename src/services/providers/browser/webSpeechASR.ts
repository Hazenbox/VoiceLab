/**
 * Web Speech API ASR Client
 * Browser-native speech recognition for Vercel deployment
 */

/**
 * ASR event callbacks
 */
export interface ASRCallbacks {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: 'idle' | 'connecting' | 'listening' | 'error') => void;
}

/**
 * Check if Web Speech API is supported in the current browser
 */
export function isWebSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * Get user-friendly error message for speech recognition errors
 */
function getErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'No speech detected. Please try speaking again.';
    case 'audio-capture':
      return 'Microphone not available. Please check your microphone settings.';
    case 'not-allowed':
      return 'Microphone access denied. Please allow microphone access and try again.';
    case 'network':
      return 'Network error during speech recognition. Please check your connection.';
    case 'service-not-allowed':
      return 'Speech recognition service not allowed. Please use Chrome, Edge, or Safari.';
    case 'language-not-supported':
      return 'Language not supported for speech recognition.';
    case 'aborted':
      return 'Speech recognition was stopped.';
    default:
      return `Speech recognition error: ${error}`;
  }
}

/**
 * Web Speech API ASR Client
 * Provides browser-native speech recognition that works without WebSocket
 */
export class WebSpeechASRClient {
  private recognition: SpeechRecognition | null = null;
  private callbacks: ASRCallbacks = {};
  private isListening = false;
  private restartOnEnd = true;
  private language = 'en-US';

  constructor(callbacks: ASRCallbacks = {}, language = 'en-US') {
    this.callbacks = callbacks;
    this.language = language;
  }

  /**
   * Connect and start speech recognition
   */
  async connect(): Promise<void> {
    if (!isWebSpeechSupported()) {
      const error = new Error(
        'Speech recognition is not supported in this browser. ' +
        'Please use Chrome, Edge, or Safari. ' +
        'Firefox users: enable "media.webspeech.recognition.enable" in about:config.'
      );
      this.callbacks.onError?.(error);
      this.callbacks.onStateChange?.('error');
      throw error;
    }

    this.callbacks.onStateChange?.('connecting');

    return new Promise((resolve, reject) => {
      try {
        // Get the SpeechRecognition constructor (with webkit prefix fallback)
        const SpeechRecognitionConstructor = 
          window.SpeechRecognition || window.webkitSpeechRecognition;
        
        this.recognition = new SpeechRecognitionConstructor();
        
        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.language;
        this.recognition.maxAlternatives = 1;

        // Handle results
        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          const resultIndex = event.resultIndex;
          const result = event.results[resultIndex];
          
          if (result) {
            const transcript = result[0].transcript;
            const isFinal = result.isFinal;
            
            console.log(`[WebSpeechASR] Transcript: "${transcript}" (final: ${isFinal})`);
            this.callbacks.onTranscript?.(transcript, isFinal);
          }
        };

        // Handle errors
        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('[WebSpeechASR] Error:', event.error, event.message);
          
          // Don't report 'aborted' or 'no-speech' as fatal errors
          if (event.error === 'aborted') {
            return;
          }
          
          if (event.error === 'no-speech') {
            // Just restart recognition, don't show error
            console.log('[WebSpeechASR] No speech detected, continuing to listen...');
            return;
          }

          const errorMessage = getErrorMessage(event.error);
          this.callbacks.onError?.(new Error(errorMessage));
          
          // Only change state to error for fatal errors
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            this.callbacks.onStateChange?.('error');
            this.restartOnEnd = false;
          }
        };

        // Handle recognition end (may need to restart)
        this.recognition.onend = () => {
          console.log('[WebSpeechASR] Recognition ended');
          
          if (this.isListening && this.restartOnEnd) {
            // Auto-restart to maintain continuous listening
            console.log('[WebSpeechASR] Auto-restarting recognition...');
            try {
              this.recognition?.start();
            } catch (e) {
              console.error('[WebSpeechASR] Failed to restart:', e);
            }
          } else {
            this.callbacks.onStateChange?.('idle');
          }
        };

        // Handle start
        this.recognition.onstart = () => {
          console.log('[WebSpeechASR] Recognition started');
          this.isListening = true;
          this.callbacks.onStateChange?.('listening');
        };

        // Start recognition
        this.recognition.start();
        this.restartOnEnd = true;
        
        // Resolve after a short delay to ensure it started
        setTimeout(() => {
          if (this.isListening) {
            resolve();
          } else {
            reject(new Error('Failed to start speech recognition'));
          }
        }, 500);

      } catch (error) {
        console.error('[WebSpeechASR] Failed to initialize:', error);
        this.callbacks.onStateChange?.('error');
        this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
        reject(error);
      }
    });
  }

  /**
   * Send audio data - NO-OP for Web Speech API
   * The browser handles audio capture internally
   */
  sendAudio(_audioData: Float32Array): void {
    // No-op: Web Speech API captures audio directly from the microphone
    // This method exists for interface compatibility with other ASR providers
  }

  /**
   * Disconnect and stop recognition
   */
  disconnect(): void {
    console.log('[WebSpeechASR] Disconnecting...');
    this.restartOnEnd = false;
    this.isListening = false;
    
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      this.recognition = null;
    }
    
    this.callbacks.onStateChange?.('idle');
  }

  /**
   * Check if currently listening
   */
  get connected(): boolean {
    return this.isListening;
  }

  /**
   * Update language for recognition
   */
  setLanguage(language: string): void {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
}

/**
 * Create a new Web Speech ASR client
 */
export function createWebSpeechASRClient(
  callbacks: ASRCallbacks = {},
  language = 'en-US'
): WebSpeechASRClient {
  return new WebSpeechASRClient(callbacks, language);
}
