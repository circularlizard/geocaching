'use client';

import { useState } from 'react';

export default function FoundItButton() {
  const [showMessage, setShowMessage] = useState(false);

  return (
    <div className="space-y-2">
      {!showMessage ? (
        <button
          onClick={() => setShowMessage(true)}
          className="w-full bg-green-100 text-green-700 font-semibold py-2 rounded-lg text-base hover:bg-green-200 transition-colors border border-green-300"
        >
          ✓ Found it!
        </button>
      ) : (
        <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-3 text-center">
          <p className="text-green-800 font-medium mb-1">Great!</p>
          <p className="text-green-700 text-sm">
            Scan the <strong>QR code</strong> inside the geocache box to record your find.
          </p>
          <button
            onClick={() => setShowMessage(false)}
            className="mt-2 text-xs text-green-600 hover:text-green-800 underline"
          >
            Hide
          </button>
        </div>
      )}
    </div>
  );
}
