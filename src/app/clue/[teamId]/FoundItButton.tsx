'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import QrScanner from 'qr-scanner';

type Mode = 'idle' | 'scanning' | 'error';

export default function FoundItButton() {
  const [mode, setMode] = useState<Mode>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  const stopScanner = useCallback(() => {
    qrScannerRef.current?.stop();
    qrScannerRef.current?.destroy();
    qrScannerRef.current = null;
  }, []);

  useEffect(() => {
    if (mode !== 'scanning' || !videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        stopScanner();
        window.location.href = result.data;
      },
      {
        preferredCamera: 'environment',
        returnDetailedScanResult: true,
        highlightScanRegion: false,
        highlightCodeOutline: false,
      }
    );
    qrScannerRef.current = scanner;

    scanner.start().catch(() => {
      stopScanner();
      setMode('error');
      setErrorMsg('Camera access was denied. Please use your camera app to scan the QR code inside the geocache box.');
    });

    return stopScanner;
  }, [mode, stopScanner]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  function startScanning() {
    setMode('scanning');
    setErrorMsg('');
  }

  function cancel() {
    stopScanner();
    setMode('idle');
  }

  if (mode === 'scanning') {
    return (
      <div className="space-y-3">
        <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 border-4 border-white/80 rounded-2xl" />
          </div>
        </div>
        <p className="text-sm text-gray-600 text-center">
          Point the camera at the <strong>QR code</strong> inside the geocache box — it will scan automatically.
        </p>
        <button
          onClick={cancel}
          className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (mode === 'error') {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-4 text-center">
          <p className="text-amber-800 font-semibold mb-1">📷 Scan the QR code</p>
          <p className="text-sm text-amber-700">{errorMsg || 'Use your camera app to scan the QR code inside the geocache box.'}</p>
        </div>
        <button
          onClick={() => setMode('idle')}
          className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startScanning}
      className="w-full bg-green-600 text-white font-bold py-4 rounded-lg text-lg hover:bg-green-700 transition-colors shadow-sm"
    >
      📷 I Found It — Scan QR Code
    </button>
  );
}
