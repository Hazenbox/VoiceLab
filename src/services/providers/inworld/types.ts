export interface InworldMessage {
  text: string;
}

export interface InworldResponse {
  sessionId?: string;
  interaction?: {
    text?: string;
    emotionalBehavior?: string;
  };
}

export interface InworldSendTextRequest {
  character: string;
  text: string;
  sessionId?: string;
  endUserFullname?: string;
  endUserId?: string;
}

export interface InworldServiceConfig {
  apiKey: string;
  character: string;
  proxyUrl?: string;
}

export interface InworldCallbacks {
  onResponse: (text: string) => void;
  onError: (error: Error) => void;
}
