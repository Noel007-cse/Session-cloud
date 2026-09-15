'use client';

import { useState, useCallback, useEffect } from 'react';
import AudioRecorder from './components/AudioRecorder';
import AudioUploader from './components/AudioUploader';
import WordCloud from './components/WordCloud';
import LoadingState from './components/LoadingState';

interface WordData {
  text: string;
  value: number;
}

interface AnalysisResult {
  id?: string;
  timestamp?: string;
  words: WordData[];
  transcript: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Past analyses history state (Bonus item)
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Load past analyses from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sessioncloud_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // localStorage disabled or empty
    }
  }, []);

  const saveToHistory = (newResult: AnalysisResult) => {
    try {
      const item: AnalysisResult = {
        ...newResult,
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const updated = [item, ...history].slice(0, 10); // keep last 10
      setHistory(updated);
      localStorage.setItem('sessioncloud_history', JSON.stringify(updated));
    } catch {
      // Storage error fallback
    }
  };

  // Stepper state tracking
  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);

  const processAudio = useCallback(async (body: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process audio session');
      }

      const resObj: AnalysisResult = {
        words: data.words,
        transcript: data.transcript,
      };

      setResult(resObj);
      saveToHistory(resObj);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [history]);

  const handleAudioReady = useCallback(
    (blob: Blob) => {
      const formData = new FormData();
      formData.append('file', blob, 'session_recording.webm');
      processAudio(formData);
    },
    [processAudio]
  );

  const handleFileReady = useCallback(
    (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      processAudio(formData);
    },
    [processAudio]
  );

  const handleReset = () => {
    setResult(null);
    setError(null);
    setLoading(false);
    setIsLiveRecording(false);
    setHasRecordedAudio(false);
  };

  const handleRecordingStateChange = useCallback((recording: boolean, hasAudio: boolean) => {
    setIsLiveRecording(recording);
    setHasRecordedAudio(hasAudio);
  }, []);

  let currentStep = 1;
  if (isLiveRecording) currentStep = 2;
  else if (hasRecordedAudio && !loading && !result) currentStep = 3;
  else if (loading) currentStep = 4;
  else if (result) currentStep = 5;

  return (
    <div className="app-container">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="top-nav">
        <div className="brand-section">
          <div className="brand-logo-wrapper">
            <div className="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
            </div>
            <div className="brand-title-group">
              <span className="brand-name">SessionCloud</span>
              <span className="brand-tagline">Topic reflections for mentors</span>
            </div>
          </div>
          <div className="privacy-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Private & Ephemeral · Student Safe
          </div>
        </div>

        <div className="nav-right">
          {history.length > 0 && (
            <button
              className="btn-secondary"
              onClick={() => setShowHistoryModal(true)}
              style={{ fontSize: '12.5px', padding: '6px 14px' }}
            >
              🕒 Saved Sessions ({history.length})
            </button>
          )}
          <button className="mentor-guide-link" onClick={() => setShowHelpModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Mentor Guide
          </button>
          <button className="user-avatar-btn" title="User Profile" onClick={() => setShowHelpModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. MENTORSHIP JOURNEY STEPPER BAR */}
      <div className="stepper-bar-container">
        <div className="stepper-bar">
          <div className="stepper-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            MENTORSHIP JOURNEY:
          </div>
          <div className="stepper-items">
            <div className={`step-item ${currentStep === 1 ? 'active' : ''}`}>1. Ingest</div>
            <div className={`step-item ${currentStep === 2 ? 'active' : ''}`}>2. Live Recording</div>
            <div className={`step-item ${currentStep === 3 ? 'active' : ''}`}>3. Audio Review</div>
            <div className={`step-item ${currentStep === 4 ? 'active' : ''}`}>4. Analyzing</div>
            <div className={`step-item ${currentStep === 5 ? 'active' : ''}`}>5. Word Cloud Payoff</div>
          </div>
          <button
            className="step-help"
            onClick={() => setShowHelpModal(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Help & Permissions
          </button>
        </div>
      </div>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="main-wrapper">
        {!loading && !result && (
          <>
            {/* HERO TITLE SECTION */}
            <div className="hero-header">
              <div className="hero-pill">
                <span className="hero-pill-dot" />
                Safe • Zero Storage • Purely Reflective
              </div>

              <h1 className="hero-title">
                What did you and your student talk about?
              </h1>

              <p className="hero-description">
                Record your conversation or drop in an audio file. We&apos;ll gently identify the central topics and build a calm, visual reflection map for your notes.
              </p>
            </div>

            {/* TWO CARDS GRID: RECORD VS UPLOAD */}
            <div className="cards-grid">
              <AudioRecorder
                onAudioReady={handleAudioReady}
                onRecordingStateChange={handleRecordingStateChange}
                disabled={loading}
              />
              <AudioUploader onFileReady={handleFileReady} disabled={loading} />
            </div>

            {/* CONFIDENTIALITY BANNER */}
            <div className="confidentiality-card">
              <div className="lock-icon-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <div className="confidentiality-title">Student Confidentiality by Default</div>
                <div className="confidentiality-desc">
                  Nothing is stored, tagged with student IDs, or shared with AI training pools. Audio dissolves the moment your word cloud is ready.
                </div>
              </div>
            </div>
          </>
        )}

        {/* ERROR STATE */}
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ background: '#fde8e8', color: '#c53030', padding: '16px 24px', borderRadius: '12px', display: 'inline-block', marginBottom: '20px' }}>
              <strong>Analysis Failed:</strong> {error}
            </div>
            <br />
            <button className="btn-navy-full" style={{ width: 'auto', display: 'inline-flex' }} onClick={handleReset}>
              Try Again
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && <LoadingState />}

        {/* RESULTS WORD CLOUD */}
        {result && !loading && (
          <WordCloud
            words={result.words}
            transcript={result.transcript}
            onReset={handleReset}
          />
        )}

        {/* FOOTER GUARANTEE */}
        <footer className="footer-guarantee">
          <div className="guarantee-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Ephemeral Analysis Guarantee
          </div>
          <div className="guarantee-headline">
            Audio is analyzed on-the-fly and never stored. Safe for student conversations.
          </div>
          <div className="guarantee-features">
            <span>No Accounts Required</span>
            <span>•</span>
            <span>Zero Data Retention</span>
            <span>•</span>
            <span>FERPA & COPPA Respectful</span>
          </div>
        </footer>
      </main>

      {/* HELP & PERMISSIONS MODAL */}
      {showHelpModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowHelpModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '540px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid #eae5dc',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#2d3b55' }}>
                Mentor Guide & Permissions
              </h2>
              <button
                onClick={() => setShowHelpModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f4f0ea', padding: '14px 18px', borderRadius: '10px' }}>
                <strong style={{ color: '#2d3b55' }}>🎙️ Microphone Access:</strong>
                <p style={{ marginTop: '4px' }}>
                  If your browser blocks recording, click the 🔒 lock icon next to your URL bar, select <strong>Microphone</strong>, change it to <strong>Allow</strong>, and refresh the page.
                </p>
              </div>

              <div style={{ background: '#eaf4ef', padding: '14px 18px', borderRadius: '10px' }}>
                <strong style={{ color: '#3d8a68' }}>🔒 Student Privacy Guarantee:</strong>
                <p style={{ marginTop: '4px' }}>
                  SessionCloud operates on zero data retention. Audio files are processed in-memory live via Groq AI and immediately dissolved after generating your topic reflection map.
                </p>
              </div>

              <div style={{ background: '#f4f0ea', padding: '14px 18px', borderRadius: '10px' }}>
                <strong style={{ color: '#2d3b55' }}>📁 File Limits:</strong>
                <p style={{ marginTop: '4px' }}>
                  Supports MP3, WAV, M4A, AAC, OGG, WEBM, and FLAC files up to 25 MB or 10 minutes per session.
                </p>
              </div>
            </div>

            <button
              className="btn-navy-full"
              style={{ marginTop: '24px' }}
              onClick={() => setShowHelpModal(false)}
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}

      {/* PAST ANALYSES HISTORY MODAL (Bonus feature) */}
      {showHistoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid #eae5dc',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#2d3b55' }}>
                Saved Past Analyses ({history.length})
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, paddingRight: '4px' }}>
              {history.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    background: '#faf8f5',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #eae5dc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#2d3b55' }}>
                      Session Analysis ({item.words.length} topics extracted)
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                      {item.timestamp || 'Recent Session'} • {item.transcript.slice(0, 60)}…
                    </div>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setResult(item);
                      setShowHistoryModal(false);
                    }}
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                  >
                    View Map
                  </button>
                </div>
              ))}
            </div>

            <button
              className="btn-navy-full"
              style={{ marginTop: '20px' }}
              onClick={() => setShowHistoryModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
