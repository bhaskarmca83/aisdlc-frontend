export default function MemoryViewer({ stateSnapshot }) {
  if (!stateSnapshot?.values) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center mt-8">
        Run the pipeline to see live state
      </div>
    )
  }

  const v = stateSnapshot.values
  const fields = [
    { label: 'Project',       value: v.project_name },
    { label: 'Stage',         value: v.current_stage },
    { label: 'Tech Stack',    value: (v.tech_stack || []).join(', ') },
    { label: 'Requirements',  value: `${(v.requirements || []).length} items` },
    { label: 'Stories',       value: `${(v.stories || []).length} created` },
    { label: 'Files Changed', value: `${(v.files_changed || []).length} files` },
    { label: 'Test Result',   value: v.test_result ? (v.test_result.passed ? '✅ Passed' : '❌ Failed') : '—' },
    { label: 'Review',        value: v.review_result?.verdict || '—' },
    { label: 'Deploy',        value: JSON.stringify(v.deploy_status || {}) },
    { label: 'E2E',           value: v.e2e_results?.passed !== undefined ? (v.e2e_results.passed ? '✅ Passed' : '❌ Failed') : '—' },
    { label: 'Retry Count',   value: v.retry_count ?? 0 },
    { label: 'Error',         value: v.error || '—' },
  ]

  return (
    <div className="p-3 overflow-y-auto h-full">
      <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-3">Live SDLCState</h3>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.label} className="bg-dark-700 rounded p-2">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">{f.label}</div>
            <div className="text-xs text-gray-200 mt-0.5 break-all">{String(f.value ?? '—')}</div>
          </div>
        ))}
      </div>

      {v.architecture_decisions?.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">ADRs</h4>
          {v.architecture_decisions.map((adr, i) => (
            <div key={i} className="bg-dark-700 rounded p-2 mb-1 text-xs text-gray-300">
              <strong>{adr.id}:</strong> {adr.decision}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
