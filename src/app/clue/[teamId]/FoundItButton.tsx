'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type Mode = 'idle' | 'scanning' | 'no-support' | 'error';

export default function FoundItButton() {
  const [mode, setMode] = useState<Mode>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  function scanFrame(detector: unknown) {
    if (!videoRef.current) return;
    (detector as { detect: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> })
      .detect(videoRef.current)
      .then((barcodes) => {
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          stopCamera();
          window.location.href = barcodes[0].rawValue;
        } else {
          rafRef.current = requestAnimationFrame(() => scanFrame(detector));
        }
      })
      .catch(() => {
        rafRef.current = requestAnimationFrame(() => scanFrame(detector));
      });
  }

  async function startScanning() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMode('no-support');
      return;
    }
    setMode('scanning');
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if ('BarcodeDetector' in window) {
        // @ts-ignore — BarcodeDetector is a newer API not yet in all TS libs
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        scanFrame(detector);
      }
      // If BarcodeDetector isn't available the video feed still shows so the
      // user can manually read the QR and open the URL via the system camera.
    } catch {
      setMode('error');
      setErrorMsg('Camera access was denied. Please use your camera app to scan the QR code inside the geocache box.');
    }
  }

  function cancel() {
    stopCamera();
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
        {'BarcodeDetector' in window ? (
          <p className="text-sm text-gray-600 text-center">
            Point the camera at the <strong>QR code</strong> inside the geocache box — it will scan automatically.
          </p>
        ) : (
          <p className="text-sm text-gray-600 text-center">
            Use your camera app to scan the <strong>QR code</strong> inside the geocache box.
          </p>
        )}
        <button
          onClick={cancel}
          className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (mode === 'error' || mode === 'no-support') {
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
