const REPOS = [
  { name: 'aisdlc-orchestrator', label: 'Orchestrator', icon: '🔧', lang: 'Python' },
  { name: 'aisdlc-frontend',     label: 'Frontend',     icon: '⚛️',  lang: 'React' },
  { name: 'aisdlc-backend',      label: 'Backend',      icon: '☕',  lang: 'Spring Boot' },
  { name: 'aisdlc-infra',        label: 'Infra',        icon: '🏗️',  lang: 'Terraform' },
]

export default function RepoPanel({ stateSnapshot }) {
  const featureBranches = stateSnapshot?.values?.feature_branches || {}
  const filesChanged    = stateSnapshot?.values?.files_changed    || []

  const filesPerRepo = filesChanged.reduce((acc, f) => {
    acc[f.repo] = (acc[f.repo] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Repos</h2>
      <div className="space-y-2">
        {REPOS.map((r) => {
          const branch = featureBranches[r.name]
          const count  = filesPerRepo[r.name] || 0
          return (
            <div key={r.name} className="bg-dark-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>{r.icon}</span>
                <span className="text-sm text-gray-200 font-medium">{r.label}</span>
                <span className="text-[10px] text-gray-500 bg-dark-600 px-1.5 py-0.5 rounded ml-auto">
                  {r.lang}
                </span>
              </div>
              {branch ? (
                <div className="text-[10px] text-green-400 font-mono truncate">{branch}</div>
              ) : (
                <div className="text-[10px] text-gray-600">no branch yet</div>
              )}
              {count > 0 && (
                <div className="text-[10px] text-blue-400 mt-0.5">{count} file(s) changed</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
