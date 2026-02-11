# Jio Voice Designer

AI-powered voice prototyping tool for designing and testing Jio's voice assistant persona with Text-to-Speech and real-time conversation capabilities.

## Features

- **Text-to-Speech Mode**: Convert written text into spoken audio with customizable voice parameters
- **Tap-to-Talk Mode**: Real-time voice conversations with an AI assistant
- **Configurable Provider**: Switch between Alibaba CosyVoice and Google Gemini
- **Voice Persona Configuration**: Customize tone, vibe, pace, and response length
- **Audio Waveform Player**: Visualize and control playback of generated audio
- **Dark/Light Theme**: Toggle between color modes

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite 7.x
- **Language**: TypeScript 5.8
- **Styling**: Tailwind CSS
- **TTS Providers**: 
  - Alibaba DashScope (CosyVoice) - Default
  - Google Gemini (Fallback)

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- Alibaba DashScope API key (for CosyVoice)
- Google Gemini API key (optional, for fallback)
- HuggingFace API key (for RAG semantic search)
- Convex account (for knowledge base and vector search)

### Installation

```bash
# Navigate to the project directory
cd voice-designer

# Install dependencies
npm install

# Copy environment template and add your API keys
cp .env.example .env
```

### Configuration

Edit `.env` file with your API keys:

```bash
# TTS Provider Configuration
VITE_TTS_PROVIDER=alibaba
VITE_CONVERSATION_PROVIDER=alibaba

# Alibaba DashScope API Key
VITE_DASHSCOPE_API_KEY=your_dashscope_api_key_here

# Google Gemini API Key (optional)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### RAG Setup (Required for Production)

RAG (Retrieval-Augmented Generation) is always enabled and provides semantic search for contextual knowledge enrichment.

#### 1. Set up Convex

```bash
# Install Convex CLI
npm install -g convex

# Initialize Convex (if not already done)
npx convex dev

# Get your Convex URL from the output and add to .env:
# VITE_CONVEX_URL=https://your-project.convex.cloud
```

#### 2. Configure HuggingFace API Key

1. Get a free API key from [HuggingFace](https://huggingface.co/settings/tokens)
2. Go to [Convex Dashboard](https://dashboard.convex.dev/)
3. Select your project → Settings → Environment Variables
4. Add: `HUGGINGFACE_API_KEY` with your key

#### 3. Seed Knowledge Base

```bash
cd voice-designer

# Seed knowledge items (avoid words, preferred words, etc.)
npx convex run seed:seedAll

# Verify seeding
npx convex run seed:checkSeedStatus
```

#### 4. Generate Embeddings

```bash
# Generate 384-dimensional embeddings (processes 50 items per call)
npx convex run embeddings:backfillEmbeddings

# Run multiple times until all items have embeddings
# Check progress:
npx convex run seed:checkSeedStatus
```

**Note:** The embedding generation uses BAAI/bge-small-en-v1.5 model and may take several runs to complete for ~600+ knowledge items.

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
voice-designer/
├── src/
│   ├── App.tsx                 # Main application component
│   ├── main.tsx               # React entry point
│   ├── index.css              # Global styles with Tailwind
│   ├── types.ts               # TypeScript type definitions
│   ├── constants.ts           # Configuration & system prompts
│   ├── config/
│   │   └── providers.ts       # Provider configuration
│   ├── services/
│   │   ├── audioUtils.ts      # Audio encoding/decoding utilities
│   │   └── providers/
│   │       ├── types.ts       # Provider interfaces
│   │       ├── index.ts       # Provider factory
│   │       ├── alibaba/       # Alibaba CosyVoice & Qwen providers
│   │       └── gemini/        # Google Gemini providers
│   └── components/
│       ├── AudioPlayer.tsx    # Waveform visualization & playback
│       ├── ConfigPanel.tsx    # Left sidebar configuration
│       ├── CustomSelect.tsx   # Dropdown component
│       ├── DocumentationPanel.tsx # Help documentation
│       ├── LabeledSlider.tsx  # Discrete slider with labels
│       ├── StatusIndicator.tsx # State badge
│       ├── SoundWave.tsx      # Sound wave animation
│       └── VoiceSelector.tsx  # Voice gender radio group
├── .env.example               # Environment template
└── package.json
```

## Provider Architecture

The application uses a provider abstraction layer that allows easy switching between different TTS and conversation services:

- **TTSProvider**: Interface for text-to-speech synthesis
- **ConversationProvider**: Interface for real-time voice conversations

### Alibaba DashScope (Default)

- **TTS**: CosyVoice v3 Flash via HTTP API
- **Conversation**: Qwen ASR + Qwen LLM + CosyVoice TTS pipeline

### Google Gemini (Fallback)

- **TTS**: Gemini 2.0 Flash with audio modality
- **Conversation**: Gemini Live API via WebSocket

## Voice Options

### Alibaba CosyVoice (English)

| Voice | Gender | Language |
|-------|--------|----------|
| Eva (loongeva_v2) | Female | British English |
| Brian (loongbrian_v2) | Male | British English |
| Abby (loongabby_v2) | Female | American English |
| David (loongdavid_v2) | Male | American English |

### Google Gemini

| Voice | Gender | Language |
|-------|--------|----------|
| Kore | Female | Indian English |
| Puck | Male | Indian English |

## Configuration Options

| Setting | Type | Options | Description |
|---------|------|---------|-------------|
| Voice Model | Radio | Female / Male | Selects voice persona |
| Tone Definition | Textarea | Free text | Describes the AI's personality |
| Vibe | Dropdown | Calm / Warm / Energetic / Professional | Emotional style |
| Greeting | Input | Free text | Initial greeting message |
| Pace | Slider | Slow / Medium / Fast | Speech rate |
| Response Length | Slider | Short / Medium / Long | Verbosity control |
| Theme | Toggle | Light / Dark | UI color mode |

## API Documentation

For more details on the underlying APIs:

- [Alibaba CosyVoice API](https://www.alibabacloud.com/help/en/model-studio/cosyvoice-large-model-for-speech-synthesis/)
- [Alibaba Qwen TTS API](https://www.alibabacloud.com/help/en/model-studio/qwen-tts-api)
- [Google Gemini API](https://ai.google.dev/docs)

## License

Internal use only - Jio Platforms Limited
# Force rebuild with feature flags Wed Feb 11 20:10:59 IST 2026
