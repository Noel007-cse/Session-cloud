'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { BRIEF_REF_5190_MAX_BYTES, formatFileSize } from '../lib/constants';

interface AudioUploaderProps {
  onFileReady: (file: File) => void;
  disabled?: boolean;
}

export default function AudioUploader({ onFileReady, disabled }: AudioUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = (file: File) => {
    setError(null);
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i)) {
      setError('Please upload a valid audio file (MP3, WAV, M4A, WEBM, FLAC, OGG).');
      return;
    }
    if (file.size > BRIEF_REF_5190_MAX_BYTES) {
      setError('File size exceeds the 25MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onFileReady(selectedFile);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="card-box">
      <div className="card-header-bar">
        <span className="card-type-tag">From Saved File</span>
        <span className="card-meta-tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Max 25MB
        </span>
      </div>

      <div className="card-body-content">
        {!selectedFile ? (
          <>
            <div
              className={`upload-drop-box ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <div className="upload-icon-circle">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m16 16-4-4-4 4" />
                </svg>
              </div>
              <h3 className="card-action-title" style={{ fontSize: '18px', margin: 0 }}>
                Upload an Audio File
              </h3>
              <p className="card-action-subtitle" style={{ fontSize: '12.5px', margin: 0 }}>
                Drag and drop an existing recording from your voice memos or phone here.
              </p>
            </div>

            <button
              className="btn-gray-full"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 4 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              Choose file from computer
            </button>
            <span className="btn-subtext">Accepts common audio files (MP3, M4A, WAV)</span>
          </>
        ) : (
          <div style={{ width: '100%' }}>
            <div className="file-selected-card">
              <div className="file-details-left">
                <div className="file-icon-bg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <div>
                  <div className="file-name-text">{selectedFile.name}</div>
                  <div className="file-size-text">{formatFileSize(selectedFile.size)}</div>
                </div>
              </div>
              <button className="remove-file-btn" onClick={handleRemove} title="Remove file">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <button className="btn-navy-full" onClick={handleConfirm} disabled={disabled}>
              Analyze Selected File
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden-file-input"
          onChange={handleChange}
        />

        {error && (
          <p style={{ color: '#c53030', fontSize: '12px', marginTop: '10px' }}>{error}</p>
        )}
      </div>
    </div>
  );
}
