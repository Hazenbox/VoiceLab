/**
 * Noise Suppression Service
 * 
 * Manages RNNoise-based noise suppression using AudioWorklet.
 * Provides superior voice isolation compared to browser built-in
 * noise suppression by using a neural network trained on voice/noise data.
 * 
 * Usage:
 * ```typescript
 * const noiseSuppression = new NoiseSuppressionService();
 * await noiseSuppression.initialize(audioContext);
 * 
 * // Insert into audio graph
 * const source = audioContext.createMediaStreamSource(stream);
 * const destination = audioContext.createScriptProcessor(...);
 * noiseSuppression.connect(source, destination);
 * 
 * // Later, cleanup
 * noiseSuppression.disconnect();
 * ```
 */

export class NoiseSuppressionService {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: AudioNode | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private enabled = true;

  /**
   * Initialize the noise suppression service
   * @param audioContext - The AudioContext to use
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(audioContext: AudioContext): Promise<void> {
    // Return existing init promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Already initialized
    if (this.isInitialized && this.audioContext === audioContext) {
      return;
    }

    this.audioContext = audioContext;

    this.initPromise = this._doInitialize();
    
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async _doInitialize(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not set');
    }

    try {
      console.log('[NoiseSuppression] Loading AudioWorklet module...');
      
      // Load the worklet module
      await this.audioContext.audioWorklet.addModule('/noiseSuppressionProcessor.js');
      
      console.log('[NoiseSuppression] Creating AudioWorkletNode...');
      
      // Create the worklet node
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        'noise-suppression-processor',
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        }
      );

      // Wait for initialization confirmation from worklet
      const initPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Noise suppression initialization timed out'));
        }, 10000);

        this.workletNode!.port.onmessage = (event) => {
          if (event.data.type === 'initialized') {
            clearTimeout(timeout);
            if (event.data.success) {
              console.log('[NoiseSuppression] Worklet initialized successfully');
              resolve();
            } else {
              reject(new Error(event.data.error || 'Failed to initialize noise suppression'));
            }
          }
        };
      });

      // Send sample rate to worklet
      this.workletNode.port.postMessage({
        type: 'sampleRate',
        data: this.audioContext.sampleRate,
      });

      // Trigger RNNoise initialization in worklet
      this.workletNode.port.postMessage({ type: 'init' });

      await initPromise;
      
      this.isInitialized = true;
      console.log('[NoiseSuppression] Service initialized');

    } catch (error) {
      console.error('[NoiseSuppression] Failed to initialize:', error);
      this.workletNode = null;
      throw error;
    }
  }

  /**
   * Connect the noise suppression between source and destination nodes
   * @param source - Source audio node (e.g., MediaStreamSourceNode)
   * @param destination - Destination audio node (e.g., ScriptProcessorNode)
   */
  connect(source: AudioNode, destination: AudioNode): void {
    this.sourceNode = source;

    if (this.workletNode && this.isInitialized) {
      // Insert worklet between source and destination
      source.connect(this.workletNode);
      this.workletNode.connect(destination);
      console.log('[NoiseSuppression] Connected to audio graph');
    } else {
      // Fallback: direct connection
      console.warn('[NoiseSuppression] Not initialized, using direct connection');
      source.connect(destination);
    }
  }

  /**
   * Disconnect the noise suppression from the audio graph
   */
  disconnect(): void {
    try {
      if (this.workletNode) {
        this.workletNode.disconnect();
      }
      if (this.sourceNode) {
        this.sourceNode.disconnect();
      }
    } catch (error) {
      // Ignore disconnect errors
      console.warn('[NoiseSuppression] Error during disconnect:', error);
    }

    this.sourceNode = null;
    console.log('[NoiseSuppression] Disconnected from audio graph');
  }

  /**
   * Enable or disable noise suppression
   * When disabled, audio passes through unchanged
   * @param enabled - Whether to enable noise suppression
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'enable',
        data: enabled,
      });
    }
    
    console.log('[NoiseSuppression] Enabled:', enabled);
  }

  /**
   * Check if noise suppression is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if the service is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.workletNode !== null;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.disconnect();
    
    if (this.workletNode) {
      this.workletNode.port.close();
      this.workletNode = null;
    }
    
    this.audioContext = null;
    this.isInitialized = false;
    console.log('[NoiseSuppression] Service destroyed');
  }
}

// Singleton instance for app-wide use
let noiseSuppressionInstance: NoiseSuppressionService | null = null;

/**
 * Get or create the noise suppression service instance
 */
export function getNoiseSuppressionService(): NoiseSuppressionService {
  if (!noiseSuppressionInstance) {
    noiseSuppressionInstance = new NoiseSuppressionService();
  }
  return noiseSuppressionInstance;
}

/**
 * Check if the browser supports AudioWorklet (required for noise suppression)
 */
export function isNoiseSuppressionSupported(): boolean {
  return typeof AudioWorkletNode !== 'undefined';
}
