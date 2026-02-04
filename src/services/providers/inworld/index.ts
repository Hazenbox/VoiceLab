import type { 
  InworldServiceConfig, 
  InworldCallbacks, 
  InworldSendTextRequest,
  InworldResponse 
} from './types';

export class InworldService {
  private config: InworldServiceConfig;
  private sessionId?: string;
  private callbacks?: InworldCallbacks;

  constructor(config: InworldServiceConfig) {
    this.config = config;
  }

  /**
   * Set callbacks for response and error handling
   */
  setCallbacks(callbacks: InworldCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Send a text message to the Inworld character
   * Uses SimpleSendText API for automatic session management
   */
  async sendText(text: string, userId: string = 'user-001'): Promise<string> {
    try {
      const requestBody: InworldSendTextRequest = {
        character: this.config.character,
        text,
        endUserFullname: 'User',
        endUserId: userId,
      };

      // Include sessionId if we have one for conversation continuity
      if (this.sessionId) {
        requestBody.sessionId = this.sessionId;
      }

      // Use proxy if configured, otherwise direct API call
      const url = this.config.proxyUrl 
        ? `${this.config.proxyUrl}/api/inworld/simpleSendText`
        : `https://api.inworld.ai/v1/${this.config.character}:simpleSendText`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Inworld API error: ${response.status} - ${errorText}`);
      }

      const data: InworldResponse = await response.json();

      // Store sessionId for future requests
      if (data.sessionId) {
        this.sessionId = data.sessionId;
      }

      // Extract the response text
      const responseText = data.interaction?.text || 'No response received';

      // Call success callback
      if (this.callbacks?.onResponse) {
        this.callbacks.onResponse(responseText);
      }

      return responseText;
    } catch (error) {
      console.error('Inworld service error:', error);
      
      // Call error callback
      if (this.callbacks?.onError) {
        this.callbacks.onError(
          error instanceof Error ? error : new Error('Unknown error occurred')
        );
      }

      throw error;
    }
  }

  /**
   * Reset the conversation by clearing the session ID
   */
  resetSession(): void {
    this.sessionId = undefined;
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | undefined {
    return this.sessionId;
  }
}

/**
 * Create an Inworld service instance
 */
export function createInworldService(): InworldService {
  const apiKey = import.meta.env.VITE_INWORLD_API_KEY;
  const character = import.meta.env.VITE_INWORLD_CHARACTER;
  
  if (!apiKey) {
    throw new Error('VITE_INWORLD_API_KEY is not configured');
  }

  if (!character) {
    throw new Error('VITE_INWORLD_CHARACTER is not configured');
  }

  // Use proxy for API calls
  const proxyUrl = `http://${import.meta.env.VITE_WS_PROXY_HOST || 'localhost'}:${import.meta.env.VITE_WS_PROXY_PORT || 3001}`;

  return new InworldService({
    apiKey,
    character,
    proxyUrl,
  });
}
