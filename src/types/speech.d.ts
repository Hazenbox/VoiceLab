/**
 * Web Speech API TypeScript Declarations
 * For browser-native speech recognition
 */

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  grammars: SpeechGrammarList;
  
  start(): void;
  stop(): void;
  abort(): void;
  
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
  onnomatch: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
  readonly interpretation: unknown;
  readonly emma: Document | null;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}

type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';

interface SpeechGrammarList {
  readonly length: number;
  item(index: number): SpeechGrammar;
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
  [index: number]: SpeechGrammar;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

// Constructor types
declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var SpeechGrammarList: {
  prototype: SpeechGrammarList;
  new(): SpeechGrammarList;
};

declare var webkitSpeechGrammarList: {
  prototype: SpeechGrammarList;
  new(): SpeechGrammarList;
};

// Extend Window interface
interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
  SpeechGrammarList: typeof SpeechGrammarList;
  webkitSpeechGrammarList: typeof SpeechGrammarList;
}
