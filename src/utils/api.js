const BASE = 'http://localhost:8000'

export async function startPipeline({ idea, projectName, confluencePageUrl }) {
  const res = await fetch(`${BASE}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idea,
      project_name: projectName,
      confluence_page_url: confluencePageUrl || '',
    }),
  })
  if (!res.ok) throw new Error(`Pipeline start failed: ${res.status}`)
  return res.json()
}

export async function getStatus(executionId) {
  const res = await fetch(`${BASE}/api/pipeline/${executionId}/status`)
  if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`)
  return res.json()
}

export async function getStateSnapshot(executionId) {
  const res = await fetch(`${BASE}/api/pipeline/${executionId}/state`)
  if (!res.ok) throw new Error(`State fetch failed: ${res.status}`)
  return res.json()
}

export async function approveGate(executionId, { approved = true, reason = '' } = {}) {
  const res = await fetch(`${BASE}/api/gate/${executionId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved, reason }),
  })
  if (!res.ok) throw new Error(`Gate approval failed: ${res.status}`)
  return res.json()
}
