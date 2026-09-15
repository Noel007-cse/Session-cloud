import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { BRIEF_REF_5190_MAX_BYTES } from '@/app/lib/constants';

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

/** Model fallback chain — tries developer-plan models first, enterprise as fallback */
const CHAT_MODELS = [
  'openai/gpt-oss-120b',        // Production — best quality, available on developer plan
  'openai/gpt-oss-20b',         // Production — fastest, available on developer plan
  'qwen/qwen3.8-27b',           // Preview — good quality
  'qwen/qwen3.6-27b',           // Preview — good quality
  'llama-3.3-70b-versatile',    // Enterprise-only fallback
  'llama-3.1-8b-instant',       // Enterprise-only fallback
];

const SYSTEM_PROMPT = `You are an expert content analyst. Your job is to read a transcript and extract the **specific topics, subjects, and domain-relevant concepts** that the speaker is actually talking about.

STEP 1 — Identify what this audio is about (e.g. a programming tutorial, a biology lecture, a career advice session, a cooking demo, a math class, etc.)

STEP 2 — Extract 15 to 50 terms that capture THE SPECIFIC SUBJECT MATTER. These should be words/phrases a viewer would use to describe what the content covers.

WHAT TO EXTRACT (good examples):
- Subject-specific nouns: "python", "machine learning", "photosynthesis", "calculus", "guitar", "resume"
- Domain concepts: "recursion", "cell division", "chord progression", "compound interest"  
- Proper nouns mentioned: names of tools, frameworks, people, places, theories
- Specific actions being taught/discussed: "debugging", "titration", "improvisation"
- Key themes: "career growth", "time management", "study habits"

WHAT TO ALWAYS SKIP — these are NEVER useful in a word cloud:
- Generic verbs: watch, read, find, get, go, come, make, take, give, see, look, know, think, want, need, try, use, say, tell, put, keep, let, begin, start, seem, help, show, turn, play, run, move, live, happen, work, call, feel, ask, leave
- Time/quantity words: day, hour, minute, second, week, month, year, time, today, tomorrow, lot, bit, thing, stuff, way, part, number, kind, type, sort, couple, bunch
- Generic nouns: video, audio, book, film, page, file, document, episode, chapter, person, people, world, place, side, end, point, fact, case, example, question, answer, problem, idea, reason, result, group, area
- Pronouns and references: something, everything, anything, nothing, someone, everyone, one, other, another
- Vague adjectives: good, bad, great, nice, big, small, new, old, different, important, interesting, real, right, wrong, sure, able, hard, easy

SCORING:
- The single most central topic = 100
- Supporting concepts = 40–80
- Briefly mentioned specifics = 10–35
- Score reflects how CENTRAL and SPECIFIC the term is, not just frequency

NORMALIZATION:
- Lowercase everything
- Merge plurals: "algorithms" → "algorithm"
- Merge verb forms: "debugging" → "debug" (ONLY if the root is the domain term)
- Keep multi-word terms together when they form a concept: "machine learning" not "machine" + "learning"

OUTPUT FORMAT — respond with ONLY this JSON, nothing else:
{"words":[{"text":"python","value":100},{"text":"recursion","value":85},{"text":"algorithm","value":70},{"text":"data structure","value":55},{"text":"binary tree","value":40}]}`;

export async function POST(request: NextRequest) {
  try {
    const groq = getGroqClient();
    if (!groq) {
      return NextResponse.json(
        { error: 'AI service is not configured. Please add GROQ_API_KEY to your .env.local file.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = (formData.get('file') || formData.get('audio')) as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }

    // Server-side size validation
    if (audioFile.size > BRIEF_REF_5190_MAX_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the 25 MB limit (${(audioFile.size / 1024 / 1024).toFixed(1)} MB).` },
        { status: 400 }
      );
    }

    // Step 1: Transcribe with Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      language: 'en',
      response_format: 'verbose_json',
    });

    const transcript = transcription.text?.trim();
    console.log('[SessionCloud] Transcript length:', transcript?.length ?? 0);

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        {
          error: 'The audio appears to be silent or contains no recognisable speech. Please try a different recording.',
          transcript: '',
          words: [],
        },
        { status: 200 }
      );
    }

    // Step 2: Use LLM to extract prominent terms with intelligent normalisation
    let extraction = null;
    let usedModel = '';
    let lastError: unknown = null;

    for (const model of CHAT_MODELS) {
      try {
        extraction = await groq.chat.completions.create({
          model,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Transcript:\n\n${transcript}` },
          ],
        });
        usedModel = model;
        console.log(`[SessionCloud] Used model: ${model}`);
        break;
      } catch (err: unknown) {
        lastError = err;
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
          console.warn(`[SessionCloud] Model ${model} not available, trying next...`);
          continue;
        }
        throw err;
      }
    }

    if (!extraction) {
      console.error('[SessionCloud] All chat models failed:', lastError);
      return NextResponse.json(
        { error: 'No AI chat model is currently available. Please try again later or check your Groq account.' },
        { status: 500 }
      );
    }

    // Step 3: Parse the LLM response — handle various output formats robustly
    let words: { text: string; value: number }[] = [];
    const rawContent = extraction.choices[0]?.message?.content?.trim() || '';
    console.log('[SessionCloud] Raw AI response (first 500 chars):', rawContent.substring(0, 500));

    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(rawContent);

      if (Array.isArray(parsed)) {
        // Direct array: [{"text":"...", "value":...}, ...]
        words = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Wrapped object: {"words":[...]} or {"terms":[...]} or {"results":[...]}
        const arrayField = Object.values(parsed).find((v) => Array.isArray(v));
        if (arrayField && Array.isArray(arrayField)) {
          words = arrayField;
        }
      }
    } catch {
      // JSON.parse failed — try extracting JSON from text (code fences, etc.)
      try {
        const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          words = JSON.parse(jsonMatch[0]);
        } else {
          const objMatch = rawContent.match(/\{[\s\S]*\}/);
          if (objMatch) {
            const obj = JSON.parse(objMatch[0]);
            const arrayField = Object.values(obj).find((v) => Array.isArray(v));
            if (arrayField && Array.isArray(arrayField)) {
              words = arrayField;
            }
          }
        }
      } catch {
        console.error('[SessionCloud] Failed to parse AI response:', rawContent.substring(0, 200));
        return NextResponse.json(
          {
            error: 'Failed to extract terms from the transcript. The AI response was malformed.',
            transcript,
            words: [],
          },
          { status: 200 }
        );
      }
    }

    console.log(`[SessionCloud] Parsed ${words.length} raw words from ${usedModel}`);

    // Normalise field names — different models may use different keys
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    words = words.map((w: any) => {
      const text = w.text || w.word || w.term || w.name || w.label || '';
      const value = w.value || w.score || w.weight || w.frequency || w.prominence || w.count || 50;
      return { text: String(text), value: Number(value) };
    });

    // Filter out any weird entries
    words = words
      .filter((w) => w.text && typeof w.text === 'string' && w.text.length > 1 && typeof w.value === 'number' && w.value > 0)
      .map((w) => ({ text: w.text.toLowerCase().trim(), value: Math.min(100, Math.max(1, Math.round(w.value))) }));

    // Deduplicate
    const seen = new Map<string, number>();
    for (const w of words) {
      const existing = seen.get(w.text);
      if (!existing || w.value > existing) {
        seen.set(w.text, w.value);
      }
    }
    // Fallback: If AI term extraction returns empty (e.g. short conversational greetings like "hello hello"),
    // extract prominent non-stopword terms directly from transcript as fallback so a word cloud is always rendered.
    if (words.length === 0 && transcript && transcript.length > 0) {
      const stopwords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me']);
      const rawWords = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1 && !stopwords.has(w));
      const counts = new Map<string, number>();
      for (const rw of rawWords) {
        counts.set(rw, (counts.get(rw) || 0) + 1);
      }
      const maxCount = Math.max(...Array.from(counts.values()), 1);
      words = Array.from(counts.entries()).map(([text, count]) => ({
        text,
        value: Math.min(100, Math.max(30, Math.round((count / maxCount) * 100))),
      }));
    }

    console.log(`[SessionCloud] Final word count: ${words.length}`);

    return NextResponse.json({
      transcript,
      words,
    });
  } catch (error: unknown) {
    console.error('Analysis error:', error);

    // Handle specific Groq API errors
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status: number; message?: string };
      if (apiError.status === 413) {
        return NextResponse.json(
          { error: 'The audio file is too large for the AI service. Please try a shorter recording.' },
          { status: 400 }
        );
      }
      if (apiError.status === 429) {
        return NextResponse.json(
          { error: 'The AI service is temporarily busy. Please wait a moment and try again.' },
          { status: 429 }
        );
      }
    }

    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: `Analysis failed: ${message}. Please check your API key and try again.` },
      { status: 500 }
    );
  }
}
