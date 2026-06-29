const BASE = 'http://localhost:8001'

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function listProfiles() {
  const res = await fetch(`${BASE}/api/profiles`)
  if (!res.ok) throw new Error('Failed to load profiles')
  return res.json()
}

export async function listProfilesByCategory() {
  const res = await fetch(`${BASE}/api/profiles/categories`)
  if (!res.ok) throw new Error('Failed to load profiles')
  return res.json()
}

export async function getProfile(id) {
  const res = await fetch(`${BASE}/api/profiles/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`Profile '${id}' not found`)
  return res.json()
}

export async function createCustomProfile(data) {
  const res = await fetch(`${BASE}/api/profiles/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to create profile: ${res.status}`)
  }
  return res.json()
}

export async function listCustomProfiles() {
  const res = await fetch(`${BASE}/api/profiles/custom`)
  if (!res.ok) throw new Error('Failed to load custom profiles')
  return res.json()
}

export async function deleteCustomProfile(id) {
  const res = await fetch(`${BASE}/api/profiles/custom/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

// ─── Validation ───────────────────────────────────────────────────────────────

export async function validateJiraProject(key) {
  const res = await fetch(`${BASE}/api/validate/jira/${encodeURIComponent(key)}`)
  if (!res.ok) throw new Error(`Jira validation failed: ${res.status}`)
  return res.json()   // { exists, key, name, url }
}

export async function validateConfluenceSpace(key) {
  const res = await fetch(`${BASE}/api/validate/confluence/${encodeURIComponent(key)}`)
  if (!res.ok) throw new Error(`Confluence validation failed: ${res.status}`)
  return res.json()   // { exists, key, name, homepage_id, url }
}

export async function createConfluenceSpace({ key, name, description }) {
  const res = await fetch(`${BASE}/api/validate/confluence/create-space`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, name, description }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Space creation failed: ${res.status}`)
  }
  return res.json()
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function listProjects() {
  const res = await fetch(`${BASE}/api/projects`)
  if (!res.ok) throw new Error(`Failed to load projects: ${res.status}`)
  return res.json()
}

export async function registerProject(data) {
  const res = await fetch(`${BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to register project: ${res.status}`)
  }
  return res.json()
}

export async function deleteProject(id) {
  const res = await fetch(`${BASE}/api/projects/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function startPipeline({ idea, projectConfigId, confluencePageUrl }) {
  const res = await fetch(`${BASE}/api/pipeline/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idea,
      project_config_id:   projectConfigId  || '',
      confluence_page_url: confluencePageUrl || '',
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Pipeline start failed: ${res.status}`)
  }
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
