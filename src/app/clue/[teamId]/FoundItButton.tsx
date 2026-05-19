'use client';

import { useState } from 'react';

export default function FoundItButton() {
  const [showMessage, setShowMessage] = useState(false);

  return (
    <div className="space-y-2">
      {!showMessage ? (
        <button
          onClick={() => setShowMessage(true)}
          className="w-full bg-green-600 text-white font-bold py-4 rounded-lg text-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          ✓ I Found It!
        </button>
      ) : (
        <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-4 text-center">
          <p className="text-green-800 font-semibold mb-2 text-lg">🎉 Great job!</p>
          <p className="text-green-700">
            Scan the <strong>QR code</strong> inside the geocache box to record your find.
          </p>
          <button
            onClick={() => setShowMessage(false)}
            className="mt-3 text-sm text-green-600 hover:text-green-800 underline"
          >
            Hide message
          </button>
        </div>
      )}
    </div>
  );
}
