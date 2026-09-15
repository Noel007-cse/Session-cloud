# SessionCloud — Audio to Word Cloud

A single-screen web tool that takes a mentorship session recording (live or uploaded), analyses it with AI, and renders a word cloud showing what the session was actually about — readable at a glance.

## What It Does (and What Actually Works)

All four required parts work end to end:

1. **Record live audio** — start/stop with a live red indicator and elapsed timer. Preview and playback before committing. Discard and re-record. Handles denied/missing microphone with a clear message explaining what to do.
2. **Upload an audio file** — file picker with drag-and-drop. Accepts MP3, WAV, M4A, AAC, OGG, WEBM, FLAC. Rejects anything else with a specific message. Shows file name, size, and duration. Validates the 25 MB limit instantly on the client before sending anything to the server.
3. **AI analysis** — audio is sent to a server-side API route (the key never touches the browser). Groq Whisper transcribes it; Groq Llama 3.3 extracts and normalises prominent terms (strips filler, stopwords, merges plurals/variants, assigns prominence by contextual importance — not raw frequency).
4. **Word cloud** — rendered as SVG with size reflecting prominence. Downloadable as a PNG. Words animate in with staggered spring physics. Click any word to remove it and the cloud re-renders without re-analysing.

### Bonus features implemented
- Full transcript shown alongside the cloud, copyable and downloadable as `.txt`.
- Click-to-remove words from the cloud with instant re-render and a "restore removed" button.
- Five colour schemes (Ocean, Sunset, Forest, Neon, Monochrome) — pick one and the cloud updates live.

### Unhappy paths handled
- **Microphone denied**: specific message with instructions to fix it (click the lock icon, allow, reload).
- **No microphone found**: separate message.
- **Wrong file format**: rejected instantly with the exact extension and what formats are accepted.
- **File too large**: rejected instantly with the file size and the 25 MB limit stated.
- **Empty file**: rejected.
- **Silent / no speech**: the AI returns an empty result and the app says so clearly.
- **API key missing**: clear server-side error telling the user to add the key.
- **API failure / rate limit**: specific error messages, not a frozen screen.
- **Every long operation**: a multi-step loading state with animated progress indicators and estimated timing.

---

## How to Run It Locally

```bash
# 1. Clone
git clone https://github.com/<YOUR_USERNAME>/sessioncloud.git
cd sessioncloud

# 2. Install
npm install

# 3. Set up your API key
cp .env.example .env.local
# Open .env.local and replace the placeholder with your Groq API key.
# Get a free key at https://console.groq.com/keys

# 4. Run
npm run dev
# Open http://localhost:3000
```

**Requirements**: Node.js 18+ and npm. That's it.

---

## AI Service: Why Groq

I chose **Groq** for two reasons:

1. **Speed.** Groq runs Whisper Large V3 on their LPU hardware and returns transcriptions in seconds, not minutes. For a tool where the whole point is "fast visual answer", making the user wait 90 seconds for OpenAI to process is a poor experience.
2. **Free tier.** The brief says "free tier is fine". Groq gives generous free API access to both Whisper (transcription) and Llama 3.3 70B (term extraction), so the live deployed URL works without a paid account.

The term extraction uses Llama 3.3 70B with a tightly constrained prompt that strips filler/stopwords, normalises plurals and case, groups synonyms, and returns prominence scores based on contextual importance — not raw word counting. This is the AI-in-the-loop the brief asks for.

---

## Key Decisions

### 1. Next.js with a server-side API route (not a client-only app)
The brief says "the key is not exposed". A client-only app that calls Groq directly would leak the API key in the browser's Network tab — anyone inspecting traffic could steal it. By routing through `/api/analyze`, the key stays in `process.env` on the server and never reaches the client.

### 2. One screen, not a wizard
The brief explicitly says "one screen that does one job well, not a landing page with a hero section". The entire app is a single view. Record and upload are two panels side by side (stacked on mobile), the result replaces the input, and "New Analysis" takes you back. No routing, no navigation, no pages.

### 3. No login, no persistence, no extras that weren't asked for
The brief warns "building [accounts] counts against you". I implemented session-only state. Past analyses are not saved. There is no landing page, no marketing copy, no feature cards. The bonus features I did build (transcript, word removal, colour schemes) are small, integrated, and all serve the core experience.

---

## Libraries & Tools

| Library | Purpose |
|---------|---------|
| [Next.js 16](https://nextjs.org/) | Framework — App Router for pages + API routes |
| [React 19](https://react.dev/) | UI rendering |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility CSS (used lightly alongside custom CSS) |
| [Groq SDK](https://www.npmjs.com/package/groq-sdk) | Server-side API client for Whisper + Llama |
| [d3-cloud](https://github.com/jasondavies/d3-cloud) | Word cloud layout algorithm |
| [html-to-image](https://github.com/bubkoo/html-to-image) | PNG export of the SVG word cloud |
| [Framer Motion](https://www.framer.com/motion/) | Animations and transitions |

No starter templates or boilerplate beyond `create-next-app`.

---

## AI Coding Tools

I used AI coding tools (GitHub Copilot / Gemini) for code generation, debugging, and writing this README. All code was reviewed, understood, and tested by me. The architecture decisions and prompt engineering are my own.

---

## What I'd Do With Another Week

1. **Speaker separation** — identify mentor vs. student turns and generate separate clouds or a combined one with colour coding. The brief said not to, but it would be the most valuable next feature.
2. **Session history** — save past analyses to localStorage or a lightweight DB so mentors can compare sessions over time.
3. **Comparative view** — upload two sessions side-by-side and highlight topics that appeared in one but not the other.
4. **Audio waveform** — replace the basic `<audio>` player with a proper waveform visualisation (using WaveSurfer.js) for more precise playback.
5. **Streaming transcription** — show partial transcript results as they arrive, so the user sees progress on long recordings instead of just a spinner.

---

Brief ref: TFG-WD-4417
