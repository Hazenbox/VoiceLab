/**
 * Audio utility functions for encoding, decoding, and processing audio data
 */

/**
 * Encode Uint8Array to Base64 string
 */
export function encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode Base64 string to Uint8Array
 */
export function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert PCM16 data to AudioBuffer
 * @param data PCM16 data as Uint8Array
 * @param ctx AudioContext
 * @param sampleRate Sample rate of the audio
 * @param numChannels Number of audio channels
 */
export function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer {
  // PCM16 to Float32
  const numSamples = data.length / 2;
  const audioBuffer = ctx.createBuffer(numChannels, numSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let i = 0; i < numSamples; i++) {
    // Read 16-bit signed integer (little-endian)
    const int16 = dataView.getInt16(i * 2, true);
    // Convert to float in range [-1, 1]
    channelData[i] = int16 / 32768;
  }

  return audioBuffer;
}

/**
 * Convert Float32Array to PCM16 Base64 blob for sending to API
 */
export function createBlob(data: Float32Array): string {
  // Convert Float32 to PCM16
  const pcm16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    // Clamp to [-1, 1] range
    const s = Math.max(-1, Math.min(1, data[i]));
    // Convert to 16-bit signed integer
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  
  // Convert to Uint8Array
  const uint8 = new Uint8Array(pcm16.buffer);
  
  // Encode to Base64
  return encode(uint8);
}

/**
 * Decode MP3 data to AudioBuffer using Web Audio API
 */
export async function decodeMP3(
  data: ArrayBuffer,
  ctx: AudioContext
): Promise<AudioBuffer> {
  return await ctx.decodeAudioData(data);
}

/**
 * Resample AudioBuffer to a different sample rate
 */
export async function resampleAudio(
  buffer: AudioBuffer,
  targetSampleRate: number
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(buffer.duration * targetSampleRate),
    targetSampleRate
  );
  
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start();
  
  return await offlineCtx.startRendering();
}

/**
 * Generate a UUID for task IDs
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format time in mm:ss.ms format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Calculate waveform data from AudioBuffer for visualization
 */
export function getWaveformData(buffer: AudioBuffer, samples: number = 200): number[] {
  const channelData = buffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / samples);
  const waveform: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j] || 0);
    }
    waveform.push(sum / blockSize);
  }

  // Normalize
  const max = Math.max(...waveform);
  if (max > 0) {
    return waveform.map((v) => v / max);
  }
  return waveform;
}

/**
 * Create an AudioContext with the specified sample rate
 */
export function createAudioContext(sampleRate?: number): AudioContext {
  const options: AudioContextOptions = {};
  if (sampleRate) {
    options.sampleRate = sampleRate;
  }
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(options);
}

/**
 * Check if browser supports required audio APIs
 */
export function checkAudioSupport(): { supported: boolean; message?: string } {
  if (!window.AudioContext && !(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) {
    return { supported: false, message: 'AudioContext not supported' };
  }
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { supported: false, message: 'getUserMedia not supported' };
  }
  
  return { supported: true };
}

/**
 * Concatenate multiple AudioBuffers into one
 */
export function concatenateAudioBuffers(
  ctx: AudioContext,
  buffers: AudioBuffer[]
): AudioBuffer {
  if (buffers.length === 0) {
    return ctx.createBuffer(1, 1, ctx.sampleRate);
  }

  const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0);
  const result = ctx.createBuffer(
    buffers[0].numberOfChannels,
    totalLength,
    buffers[0].sampleRate
  );

  let offset = 0;
  for (const buffer of buffers) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      result.getChannelData(channel).set(buffer.getChannelData(channel), offset);
    }
    offset += buffer.length;
  }

  return result;
}
