'use client';

import { useState, useEffect } from 'react';

const STEPS = [
  'Uploading conversation audio securely…',
  'Transcribing speech with precision AI…',
  'Gently identifying central topics…',
  'Extracting key terms for reflection…',
  'Building visual reflection map…',
];

export default function LoadingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="calm-loading-card">
      <div className="pulse-spinner-outer">
        <div className="pulse-spinner-inner">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="M4.93 4.93l2.83 2.83" />
            <path d="M16.24 16.24l2.83 2.83" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
            <path d="M4.93 19.07l2.83-2.83" />
            <path d="M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
      </div>

      <h3 className="loading-step-title">{STEPS[step]}</h3>

      <div className="calm-progress-bar">
        <div className="calm-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <p className="loading-subtext">Usually takes 15–30 seconds. Audio is analyzed live and never stored.</p>
    </div>
  );
}
