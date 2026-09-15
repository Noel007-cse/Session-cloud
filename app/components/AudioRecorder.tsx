'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MAX_DURATION_SECONDS } from '../lib/constants';

interface AudioRecorderProps {
  onAudioReady: (blob: Blob) => void;
  onRecordingStateChange?: (isRecording: boolean, hasRecordedAudio: boolean) => void;
  disabled?: boolean;
}

export default function AudioRecorder({ onAudioReady, onRecordingStateChange, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(MAX_DURATION_SECONDS);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    onRecordingStateChange?.(false, true);
  }, [onRecordingStateChange]);

  const startRecording = async () => {
    setMicError(null);
    setAudioUrl(null);
    setAudioBlob(null);
    chunksRef.current = [];
    setSecondsLeft(MAX_DURATION_SECONDS);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const type = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      onRecordingStateChange?.(true, false);

      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      setMicError('Microphone access was denied or not supported on this device.');
      setIsRecording(false);
      onRecordingStateChange?.(false, false);
    }
  };

  const handleConfirm = () => {
    if (audioBlob) {
      onAudioReady(audioBlob);
    }
  };

  const handleDiscard = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    onRecordingStateChange?.(false, false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const elapsedSeconds = MAX_DURATION_SECONDS - secondsLeft;
  const elapsedMin = Math.floor(elapsedSeconds / 60);
  const elapsedSec = (elapsedSeconds % 60).toString().padStart(2, '0');

  return (
    <div className="card-box">
      <div className="card-header-bar">
        <span className="card-type-tag">Live Session</span>
        <span className="card-meta-tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Up to 10 minutes
        </span>
      </div>

      <div className="card-body-content">
        {!isRecording && !audioBlob && (
          <>
            <button
              className="record-circle-btn"
              onClick={startRecording}
              disabled={disabled}
              title="Click to start recording"
            >
              <div className="record-circle-inner">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </div>
            </button>

            <h3 className="card-action-title">Record in Person</h3>
            <p className="card-action-subtitle">
              Sit together, place your device on the table, and have your natural conversation.
            </p>

            <button
              className="btn-navy-full"
              onClick={startRecording}
              disabled={disabled}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
              </svg>
              Start Recording
            </button>
            <span className="btn-subtext">No tricky toggles or audio setup needed</span>
          </>
        )}

        {isRecording && (
          <div className="recording-active-box">
            <div className="pulse-indicator">
              <span className="pulse-dot" />
              RECORDING LIVE
            </div>
            <div className="timer-display">
              {elapsedMin}:{elapsedSec}
            </div>
            <button className="btn-stop-rec" onClick={stopRecording}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              Stop & Save Session
            </button>
          </div>
        )}

        {!isRecording && audioBlob && (
          <div className="recording-active-box">
            <h3 className="card-action-title" style={{ fontSize: '18px' }}>Session Recorded</h3>
            <audio src={audioUrl || ''} controls style={{ width: '100%', margin: '14px 0' }} />
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button className="btn-navy-full" onClick={handleConfirm} disabled={disabled}>
                Analyze Conversation
              </button>
              <button className="btn-gray-full" style={{ width: 'auto' }} onClick={handleDiscard}>
                Discard
              </button>
            </div>
          </div>
        )}

        {micError && (
          <p style={{ color: '#c53030', fontSize: '12px', marginTop: '10px' }}>{micError}</p>
        )}
      </div>
    </div>
  );
}
