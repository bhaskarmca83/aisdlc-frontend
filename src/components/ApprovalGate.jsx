import { useState } from 'react'

export default function ApprovalGate({ status, onApprove }) {
  const [reason, setReason] = useState('')
  const waiting = status === 'awaiting_approval'

  if (!waiting) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center mt-8">
        {status === 'idle' ? 'Gate will appear here during pipeline run' : 'Gate passed or not reached'}
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-yellow-400 text-xl">🔐</span>
          <h3 className="text-yellow-300 font-semibold">Human Approval Required</h3>
        </div>
        <p className="text-gray-400 text-sm">
          The pipeline has paused after design generation. Review the design artifacts and approve or reject to continue.
        </p>
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Reason (optional)</label>
        <textarea
          className="w-full bg-dark-700 border border-dark-600 rounded p-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-yellow-500/50"
          rows={3}
          placeholder="Add a note..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onApprove(true, reason)}
          className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          ✅ Approve
        </button>
        <button
          onClick={() => onApprove(false, reason)}
          className="flex-1 bg-red-800 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          ❌ Reject
        </button>
      </div>
    </div>
  )
}
