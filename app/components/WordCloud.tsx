'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import cloud from 'd3-cloud';
import { scaleLinear } from 'd3-scale';

interface WordData {
  text: string;
  value: number;
}

interface LayoutWord {
  text: string;
  size: number;
  value: number;
  x: number;
  y: number;
  rotate: number;
  font: string;
}

interface WordCloudProps {
  words: WordData[];
  transcript: string;
  onReset: () => void;
}

const COLOR_SCHEMES: Record<string, string[]> = {
  sage: ['#2d3b55', '#3d8a68', '#b8523a', '#5c4d7d', '#2563eb', '#059669'],
  ocean: ['#0284c7', '#0d9488', '#2563eb', '#0369a1', '#1d4ed8', '#0f766e'],
  sunset: ['#d97706', '#dc2626', '#b91c1c', '#c05621', '#9a3412', '#ea580c'],
  monochrome: ['#1e293b', '#334155', '#475569', '#64748b', '#0f172a', '#475569'],
};

export default function WordCloud({ words, transcript, onReset }: WordCloudProps) {
  const [layoutWords, setLayoutWords] = useState<LayoutWord[]>([]);
  const [removedWords, setRemovedWords] = useState<Set<string>>(new Set());
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<string>('sage');
  const [cloudShape, setCloudShape] = useState<'rectangular' | 'arch'>('rectangular');
  const containerRef = useRef<HTMLDivElement>(null);

  const activeWords = useMemo(
    () => words.filter((w) => !removedWords.has(w.text)),
    [words, removedWords]
  );

  const activeColors = COLOR_SCHEMES[selectedScheme] || COLOR_SCHEMES.sage;

  useEffect(() => {
    if (activeWords.length === 0) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = Math.max(340, Math.min(500, width * 0.55));

    const maxVal = Math.max(...activeWords.map((w) => w.value));
    const fontScale = scaleLinear().domain([1, maxVal]).range([16, 60]).clamp(true);

    const layout = cloud<WordData>()
      .size([width, height])
      .words(activeWords.map((w) => ({ ...w })))
      .padding(8)
      .rotate(() => {
        if (cloudShape === 'arch') {
          return Math.random() > 0.5 ? 0 : (Math.random() > 0.5 ? 90 : -90);
        }
        return Math.random() > 0.8 ? 90 * (Math.random() > 0.5 ? 1 : -1) : 0;
      })
      .fontSize((d) => fontScale(d.value!))
      .font('Outfit, sans-serif')
      .fontWeight('700')
      .on('end', (output) => {
        setLayoutWords(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          output.map((w: any) => ({
            text: w.text as string,
            size: w.size as number,
            value: w.value as number,
            x: w.x as number,
            y: w.y as number,
            rotate: w.rotate as number,
            font: w.font as string,
          }))
        );
      });

    layout.start();
  }, [activeWords, cloudShape]);

  const removeWord = useCallback((word: string) => {
    setRemovedWords((prev) => new Set(prev).add(word));
  }, []);

  const restoreAll = useCallback(() => {
    setRemovedWords(new Set());
  }, []);

  const downloadPNG = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', '#faf8f5');
    clone.insertBefore(rect, clone.firstChild);

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = 'sessioncloud-reflection-map.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  }, []);

  const copyTranscript = useCallback(() => {
    navigator.clipboard.writeText(transcript);
  }, [transcript]);

  const downloadTranscript = useCallback(() => {
    const blob = new Blob([transcript], { type: 'text/plain' });
    const a = document.createElement('a');
    a.download = 'sessioncloud-transcript.txt';
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  }, [transcript]);

  const width = containerRef.current?.clientWidth || 800;
  const height = Math.max(340, Math.min(500, width * 0.55));

  return (
    <div className="results-card">
      <div className="results-header-bar">
        <h2 className="results-title">Conversation Topic Map</h2>
        <div className="results-actions">
          <button className="btn-secondary" onClick={onReset}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            New Session
          </button>
          {removedWords.size > 0 && (
            <button className="btn-secondary" onClick={restoreAll}>
              Restore ({removedWords.size})
            </button>
          )}
          <button className="btn-secondary" onClick={() => setShowTranscript(!showTranscript)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            {showTranscript ? 'Hide Notes' : 'View Full Transcript'}
          </button>
          <button className="btn-navy-full" style={{ width: 'auto', padding: '8px 18px', fontSize: '13px' }} onClick={downloadPNG}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Map PNG
          </button>
        </div>
      </div>

      {/* Bonus Controls Bar: Colour Scheme & Shape Pickers */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '12px 16px', background: '#f4f0ea', borderRadius: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#2d3b55' }}>Palette:</span>
          {Object.keys(COLOR_SCHEMES).map((scheme) => (
            <button
              key={scheme}
              onClick={() => setSelectedScheme(scheme)}
              style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '11.5px',
                fontWeight: '600',
                border: selectedScheme === scheme ? '2px solid #2d3b55' : '1px solid #cbd5e1',
                background: selectedScheme === scheme ? '#2d3b55' : 'white',
                color: selectedScheme === scheme ? 'white' : '#475569',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {scheme}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#2d3b55' }}>Layout Shape:</span>
          <button
            onClick={() => setCloudShape('rectangular')}
            style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: '600',
              border: cloudShape === 'rectangular' ? '2px solid #2d3b55' : '1px solid #cbd5e1',
              background: cloudShape === 'rectangular' ? '#2d3b55' : 'white',
              color: cloudShape === 'rectangular' ? 'white' : '#475569',
              cursor: 'pointer',
            }}
          >
            Horizontal
          </button>
          <button
            onClick={() => setCloudShape('arch')}
            style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11.5px',
              fontWeight: '600',
              border: cloudShape === 'arch' ? '2px solid #2d3b55' : '1px solid #cbd5e1',
              background: cloudShape === 'arch' ? '#2d3b55' : 'white',
              color: cloudShape === 'arch' ? 'white' : '#475569',
              cursor: 'pointer',
            }}
          >
            Mixed Radial
          </button>
        </div>
      </div>

      <div className="cloud-display-wrapper" ref={containerRef}>
        <svg width={width} height={height}>
          <g transform={`translate(${width / 2},${height / 2})`}>
            {layoutWords.map((w, i) => (
              <text
                key={`${w.text}-${i}`}
                textAnchor="middle"
                transform={`translate(${w.x},${w.y}) rotate(${w.rotate})`}
                style={{
                  fontSize: `${w.size}px`,
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 700,
                  fill: activeColors[i % activeColors.length],
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onClick={() => removeWord(w.text)}
              >
                {w.text}
              </text>
            ))}
          </g>
        </svg>
      </div>
      <p className="cloud-hint-text">Click on any topic word to prune it from your reflection map.</p>

      {showTranscript && transcript && (
        <div className="transcript-drawer" style={{ marginTop: '20px' }}>
          <div className="transcript-drawer-header">
            <h3 className="transcript-drawer-title">Full Conversation Transcript</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" onClick={copyTranscript}>
                Copy Text
              </button>
              <button className="btn-secondary" onClick={downloadTranscript}>
                Download .TXT
              </button>
            </div>
          </div>
          <p className="transcript-body-text">{transcript}</p>
        </div>
      )}
    </div>
  );
}
