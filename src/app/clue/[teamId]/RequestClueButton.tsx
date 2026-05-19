'use client';

import { useState } from 'react';

interface Props {
  teamId: number;
  currentPoints: number;
  afterPoints: number;
  nextClueNum: 2 | 3;
}

export default function RequestClueButton({ teamId, currentPoints, afterPoints, nextClueNum }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
        <p className="font-semibold text-amber-900 text-center">
          Requesting Clue {nextClueNum} will reduce your score from{' '}
          <strong>{currentPoints} pts</strong> to <strong>{afterPoints} pt{afterPoints !== 1 ? 's' : ''}</strong>.
        </p>
        <p className="text-sm text-amber-700 text-center">Are you sure you need another clue?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <form action={`/api/clue/${teamId}/request-next`} method="post" className="flex-1">
            <button
              type="submit"
              className="w-full bg-amber-500 text-white font-bold py-3 rounded-lg hover:bg-amber-600 transition-colors"
            >
              Yes, show Clue {nextClueNum}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg text-base hover:bg-gray-200 transition-colors border border-gray-300"
    >
      Need another clue? Request Clue {nextClueNum}
    </button>
  );
}
