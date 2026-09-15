# SessionCloud — Audio to Word Cloud

A single-screen web tool built for mentors to record or upload session audio, run it through AI for speech transcription and topic extraction, and render an interactive word cloud reflection map.

---

## 1. What Built & What Works

All four core requirements work end-to-end:

- **Live Audio Recording**: Start/stop controls, live recording status indicator, elapsed timer countdown, audio playback preview, and discard/re-record capability. Handles denied microphone permissions with an interactive guide.
- **Audio File Upload**: Drag-and-drop zone and native file picker. Validates file extension (MP3, WAV, M4A, AAC, OGG, WEBM, FLAC) and enforces the 25 MB ceiling on the client before uploading.
- **AI Analysis**: Audio is processed via a Next.js server-side API route. Transcribed using **Groq Whisper Large V3** and analyzed with **Groq Llama 3.3 70B** to extract grounded prominent terms (strips stop words/filler, normalizes plurals, and ranks terms by contextual relevance).
- **Interactive Word Cloud**: Rendered visually using SVG and `d3-cloud`. Interactive click-to-remove words with instant re-render, live color palette switcher (Sage, Ocean, Sunset, Monochrome), layout shape switcher, and 1-click PNG export.
- **Transcript Drawer & History**: Displays full spoken transcript with copy/download options, and saves past session word clouds locally via `localStorage`.

---

## 2. How to Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/Session-cloud.git
cd Session-cloud

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Open .env.local and add your Groq API key:
# GROQ_API_KEY=your_groq_api_key_here

# 4. Start the development server
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 3. AI Service Selection: Groq

I chose **Groq** for two specific reasons:
1. **Ultra-Fast LPU Inference**: Groq processes Whisper Large V3 audio transcriptions and Llama 3.3 70B term extractions in 1-3 seconds, providing instant visual payoff for mentors.
2. **Generous Free Tier**: Groq provides developer API keys with high rate limits for both speech-to-text and chat completion endpoints without credit card requirements.

---

## 4. Key Architectural Decisions

1. **Server-Side API Route (`/api/analyze`)**:
   - To keep the Groq API key secure and prevent exposure in browser network requests, all audio files are sent to a Next.js App Router API endpoint (`process.env.GROQ_API_KEY`).
2. **Strict Transcript Grounding Prompt**:
   - To prevent AI hallucination, the LLM prompt strictly enforces that extracted terms must be directly spoken in or grounded in the transcript.
3. **Responsive Ephemeral UX**:
   - Designed as a single-view, calm mentorship interface without multi-step wizard routing or accounts. Features mobile responsiveness down to 390px viewports.

---

## 5. Third-Party Libraries Used

- **Framework & UI**: `Next.js 16 (App Router)`, `React 19`, `Tailwind CSS 4`
- **AI SDK**: `groq-sdk` (for Whisper transcription & Llama term extraction)
- **Word Cloud Engine**: `d3-cloud` & `d3-scale` (for text layout algorithms)
- **Fonts**: `@next/font` (`Plus Jakarta Sans` & `Outfit`)

---

## 6. Use of AI Coding Tools

I used AI coding assistants (Gemini / Antigravity pair programmer) during development to assist with layout styling, setting up initial boilerplate type definitions, and refining d3-cloud layout math. All architectural design, prompt engineering, and security validations were verified and tested by me.

---

## 7. What I Would Build Next With Another Week

1. **Speaker Separation (Diarization)**: Differentiate mentor vs. student turns to color-code speaker contributions in the cloud.
2. **Waveform Audio Player**: Integrate `WaveSurfer.js` for visual audio scrubbing during review.
3. **Comparative Session Analytics**: Allow mentors to compare topic maps across multiple sessions over time.

---

Brief ref: TFG-WD-4417
