/**
 * Noise Suppression AudioWorklet Processor
 * 
 * Uses RNNoise (neural network-based noise suppression) to isolate voice
 * from background noise in real-time.
 * 
 * RNNoise expects:
 * - 48kHz sample rate
 * - 480 samples per frame (10ms)
 * - Mono audio
 * 
 * AudioWorklet provides:
 * - 128 samples per process() call at the AudioContext's sample rate
 * 
 * This processor handles buffering and sample rate conversion.
 */

// RNNoise frame size (at 48kHz)
const RNNOISE_SAMPLE_RATE = 48000;
const RNNOISE_FRAME_SIZE = 480;

class NoiseSuppressionProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // RNNoise state
    this.wasmModule = null;
    this.denoiseState = null;
    this.pcmInputBuffer = null;
    this.pcmOutputBuffer = null;
    this.isInitialized = false;
    this.enabled = true;
    
    // Buffering for sample rate conversion
    // We'll work at 48kHz internally and resample
    this.inputBuffer = new Float32Array(RNNOISE_FRAME_SIZE);
    this.inputBufferIndex = 0;
    this.outputBuffer = new Float32Array(RNNOISE_FRAME_SIZE);
    this.outputBufferIndex = 0;
    this.outputBufferAvailable = 0;
    
    // Resampling state
    this.inputSampleRate = 48000; // Will be updated from main thread
    this.resampleRatio = 1;
    
    // Handle messages from main thread
    this.port.onmessage = this.handleMessage.bind(this);
    
    console.log('[NoiseSuppressionProcessor] Created');
  }
  
  handleMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'init':
        this.initRNNoise();
        break;
      case 'enable':
        this.enabled = data;
        console.log('[NoiseSuppressionProcessor] Enabled:', this.enabled);
        break;
      case 'sampleRate':
        this.inputSampleRate = data;
        this.resampleRatio = RNNOISE_SAMPLE_RATE / this.inputSampleRate;
        console.log('[NoiseSuppressionProcessor] Sample rate:', data, 'Resample ratio:', this.resampleRatio);
        break;
    }
  }
  
  async initRNNoise() {
    try {
      console.log('[NoiseSuppressionProcessor] Initializing RNNoise...');
      
      // Import the sync module (has WASM inlined as base64)
      // Note: AudioWorklet can only import from the same origin
      importScripts('./rnnoise-sync.js');
      
      // createRNNWasmModuleSync is now available globally
      const moduleConfig = {
        // Prevent automatic WASM fetch - it's inlined in the sync version
      };
      
      this.wasmModule = await createRNNWasmModuleSync(moduleConfig);
      await this.wasmModule.ready;
      
      // Initialize RNNoise
      this.wasmModule._rnnoise_init();
      
      // Create denoise state
      this.denoiseState = this.wasmModule._rnnoise_create();
      
      if (!this.denoiseState) {
        throw new Error('Failed to create RNNoise denoise state');
      }
      
      // Allocate PCM buffers in WASM memory
      // RNNoise expects Int16 samples, but internally uses float
      // We'll pass float data scaled to Int16 range
      const floatByteSize = RNNOISE_FRAME_SIZE * 4; // Float32
      this.pcmInputBuffer = this.wasmModule._malloc(floatByteSize);
      this.pcmOutputBuffer = this.wasmModule._malloc(floatByteSize);
      
      if (!this.pcmInputBuffer || !this.pcmOutputBuffer) {
        throw new Error('Failed to allocate WASM memory');
      }
      
      this.isInitialized = true;
      console.log('[NoiseSuppressionProcessor] RNNoise initialized successfully');
      
      // Notify main thread
      this.port.postMessage({ type: 'initialized', success: true });
      
    } catch (error) {
      console.error('[NoiseSuppressionProcessor] Failed to initialize RNNoise:', error);
      this.port.postMessage({ type: 'initialized', success: false, error: error.message });
    }
  }
  
  /**
   * Process a frame through RNNoise
   * @param {Float32Array} inputFrame - Input frame (RNNOISE_FRAME_SIZE samples, normalized -1 to 1)
   * @param {Float32Array} outputFrame - Output frame buffer
   * @returns {number} Voice activity probability (0-1)
   */
  processFrame(inputFrame, outputFrame) {
    if (!this.isInitialized || !this.denoiseState) {
      outputFrame.set(inputFrame);
      return 0;
    }
    
    // RNNoise expects samples in Int16 range (-32768 to 32767)
    // Scale input and copy to WASM memory
    const inputView = new Float32Array(
      this.wasmModule.HEAPF32.buffer,
      this.pcmInputBuffer,
      RNNOISE_FRAME_SIZE
    );
    
    for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
      // Scale from [-1, 1] to [-32768, 32767]
      inputView[i] = inputFrame[i] * 32768;
    }
    
    // Process through RNNoise
    const vad = this.wasmModule._rnnoise_process_frame(
      this.denoiseState,
      this.pcmOutputBuffer,
      this.pcmInputBuffer
    );
    
    // Copy output and scale back to [-1, 1]
    const outputView = new Float32Array(
      this.wasmModule.HEAPF32.buffer,
      this.pcmOutputBuffer,
      RNNOISE_FRAME_SIZE
    );
    
    for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
      // Scale from [-32768, 32767] back to [-1, 1]
      outputFrame[i] = outputView[i] / 32768;
    }
    
    return vad;
  }
  
  /**
   * Simple linear resampling
   */
  resampleUp(input, inputRate, outputRate, outputLength) {
    const ratio = inputRate / outputRate;
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
      const frac = srcIndex - srcIndexFloor;
      
      output[i] = input[srcIndexFloor] * (1 - frac) + input[srcIndexCeil] * frac;
    }
    
    return output;
  }
  
  resampleDown(input, inputRate, outputRate, outputLength) {
    const ratio = inputRate / outputRate;
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
      const frac = srcIndex - srcIndexFloor;
      
      output[i] = input[srcIndexFloor] * (1 - frac) + input[srcIndexCeil] * frac;
    }
    
    return output;
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    // No input or not initialized - pass through silence
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }
    
    const inputChannel = input[0];
    const outputChannel = output[0];
    
    // If disabled or not initialized, pass through
    if (!this.enabled || !this.isInitialized) {
      outputChannel.set(inputChannel);
      return true;
    }
    
    // Resample input to 48kHz if needed
    let processInput;
    if (this.inputSampleRate !== RNNOISE_SAMPLE_RATE) {
      const upsampledLength = Math.ceil(inputChannel.length * this.resampleRatio);
      processInput = this.resampleUp(inputChannel, this.inputSampleRate, RNNOISE_SAMPLE_RATE, upsampledLength);
    } else {
      processInput = inputChannel;
    }
    
    // Process in frames
    let processedOutput = new Float32Array(processInput.length);
    let inputIdx = 0;
    let outputIdx = 0;
    
    // First, output any buffered samples from previous call
    while (this.outputBufferAvailable > 0 && outputIdx < processedOutput.length) {
      processedOutput[outputIdx++] = this.outputBuffer[this.outputBufferIndex++];
      this.outputBufferAvailable--;
      if (this.outputBufferIndex >= RNNOISE_FRAME_SIZE) {
        this.outputBufferIndex = 0;
      }
    }
    
    // Process input samples
    while (inputIdx < processInput.length) {
      // Fill input buffer
      while (this.inputBufferIndex < RNNOISE_FRAME_SIZE && inputIdx < processInput.length) {
        this.inputBuffer[this.inputBufferIndex++] = processInput[inputIdx++];
      }
      
      // When we have a full frame, process it
      if (this.inputBufferIndex >= RNNOISE_FRAME_SIZE) {
        const frameOutput = new Float32Array(RNNOISE_FRAME_SIZE);
        this.processFrame(this.inputBuffer, frameOutput);
        
        // Copy to output
        let frameIdx = 0;
        while (frameIdx < RNNOISE_FRAME_SIZE && outputIdx < processedOutput.length) {
          processedOutput[outputIdx++] = frameOutput[frameIdx++];
        }
        
        // Buffer remaining for next call
        if (frameIdx < RNNOISE_FRAME_SIZE) {
          this.outputBufferIndex = 0;
          this.outputBufferAvailable = RNNOISE_FRAME_SIZE - frameIdx;
          while (frameIdx < RNNOISE_FRAME_SIZE) {
            this.outputBuffer[this.outputBufferIndex + (frameIdx - (RNNOISE_FRAME_SIZE - this.outputBufferAvailable))] = frameOutput[frameIdx++];
          }
        }
        
        this.inputBufferIndex = 0;
      }
    }
    
    // Resample output back to original sample rate if needed
    if (this.inputSampleRate !== RNNOISE_SAMPLE_RATE) {
      const downsampled = this.resampleDown(processedOutput, RNNOISE_SAMPLE_RATE, this.inputSampleRate, outputChannel.length);
      outputChannel.set(downsampled);
    } else {
      // Copy what we have (may be less than outputChannel.length due to buffering)
      const copyLength = Math.min(outputIdx, outputChannel.length);
      for (let i = 0; i < copyLength; i++) {
        outputChannel[i] = processedOutput[i];
      }
      // Fill remaining with zeros
      for (let i = copyLength; i < outputChannel.length; i++) {
        outputChannel[i] = 0;
      }
    }
    
    return true;
  }
}

registerProcessor('noise-suppression-processor', NoiseSuppressionProcessor);
