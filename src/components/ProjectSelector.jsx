import { useState, useEffect } from 'react'
import { listProjects, registerProject, deleteProject } from '../utils/api'

const EMPTY_FORM = {
  name: '', team: '', jira_project_key: '', confluence_space_key: '',
  repos: [{ name: '', language: '', url: '' }],
}

export default function ProjectSelector({ selectedId, onSelect, disabled }) {
  const [projects,    setProjects]    = useState([])
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    try { setProjects(await listProjects()) } catch { /* backend not ready */ }
  }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function setRepo(i, key, val) {
    setForm(f => {
      const repos = [...f.repos]
      repos[i] = { ...repos[i], [key]: val }
      return { ...f, repos }
    })
  }

  function addRepo() {
    setForm(f => ({ ...f, repos: [...f.repos, { name: '', language: '', url: '' }] }))
  }

  function removeRepo(i) {
    setForm(f => ({ ...f, repos: f.repos.filter((_, idx) => idx !== i) }))
  }

  async function handleSave() {
    setError('')
    if (!form.name || !form.jira_project_key || !form.confluence_space_key) {
      setError('Name, Jira key and Confluence space are required.')
      return
    }
    setSaving(true)
    try {
      const created = await registerProject({
        ...form,
        repos: form.repos.filter(r => r.name),
      })
      await fetchProjects()
      onSelect(created.id)
      setShowForm(false)
      setForm(EMPTY_FORM)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    await deleteProject(id)
    if (selectedId === id) onSelect('')
    fetchProjects()
  }

  const selected = projects.find(p => p.id === selectedId)

  return (
    <div className="flex flex-col gap-2">
      {/* Selector row */}
      <div className="flex gap-2 items-center">
        <select
          value={selectedId}
          onChange={e => onSelect(e.target.value)}
          disabled={disabled}
          className="flex-1 bg-dark-700 border border-dark-600 rounded px-3 py-1.5 text-sm text-gray-200
                     focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
        >
          <option value="">— Select a team project —</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.jira_project_key} / {p.confluence_space_key})
            </option>
          ))}
        </select>
        <button
          onClick={() => { setShowForm(s => !s); setError('') }}
          disabled={disabled}
          title="Register new project"
          className="bg-dark-600 hover:bg-dark-500 text-gray-300 text-xs px-3 py-1.5 rounded
                     border border-dark-500 disabled:opacity-40 whitespace-nowrap"
        >
          {showForm ? '✕ Cancel' : '+ Register'}
        </button>
      </div>

      {/* Selected project details */}
      {selected && !showForm && (
        <div className="text-[11px] text-gray-500 flex gap-3 px-1">
          <span>Team: <span className="text-gray-400">{selected.team}</span></span>
          <span>Jira: <span className="text-blue-400 font-mono">{selected.jira_project_key}</span></span>
          <span>Space: <span className="text-blue-400 font-mono">{selected.confluence_space_key}</span></span>
          {selected.repos?.length > 0 && (
            <span>Repos: <span className="text-gray-400">{selected.repos.map(r => r.name).join(', ')}</span></span>
          )}
          <button
            onClick={e => handleDelete(selected.id, e)}
            className="ml-auto text-red-600 hover:text-red-400"
            title="Delete project config"
          >
            delete
          </button>
        </div>
      )}

      {/* Registration form */}
      {showForm && (
        <div className="bg-dark-700 border border-dark-500 rounded-lg p-3 flex flex-col gap-2 text-sm">
          <div className="text-xs font-semibold text-gray-300 mb-1">Register Team Project</div>

          <div className="flex gap-2">
            <input
              placeholder="Project / App name *"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              className="flex-1 bg-dark-800 border border-dark-600 rounded px-2 py-1 text-gray-200 text-xs focus:outline-none focus:border-blue-500/50"
            />
            <input
              placeholder="Team name"
              value={form.team}
              onChange={e => setField('team', e.target.value)}
              className="flex-1 bg-dark-800 border border-dark-600 rounded px-2 py-1 text-gray-200 text-xs focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Jira project key * (e.g. PAY)"
              value={form.jira_project_key}
              onChange={e => setField('jira_project_key', e.target.value.toUpperCase())}
              className="flex-1 bg-dark-800 border border-dark-600 rounded px-2 py-1 text-gray-200 text-xs font-mono focus:outline-none focus:border-blue-500/50"
            />
            <input
              placeholder="Confluence space * (e.g. PAY)"
              value={form.confluence_space_key}
              onChange={e => setField('confluence_space_key', e.target.value.toUpperCase())}
              className="flex-1 bg-dark-800 border border-dark-600 rounded px-2 py-1 text-gray-200 text-xs font-mono focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Repos */}
          <div className="text-[11px] text-gray-400 mt-1">Repositories (optional)</div>
          {form.repos.map((r, i) => (
            <div key={i} className="flex gap-1 items-center">
              <input
                placeholder="Repo name"
                value={r.name}
                onChange={e => setRepo(i, 'name', e.target.value)}
                className="flex-1 bg-dark-800 border border-dark-600 rounded px-2 py-1 text-gray-200 text-xs focus:outline-none focus:border-blue-500/50"
              />
              <input
                placeholder="Language"
                value={r.language}
                onChange={e => setRepo(i, 'language', e.target.value)}
                className="w-24 bg-dark-800 border border-dark-600 rounded px-2 py-1 text-gray-200 text-xs focus:outline-none focus:border-blue-500/50"
              />
              <input
                placeholder="GitHub URL"
                value={r.url}
                onChange={e => setRepo(i, 'url', e.target.value)}
                className="flex-1 bg-dark-800 border border-dark-600 rounded px-2 py-1 text-gray-200 text-xs focus:outline-none focus:border-blue-500/50"
              />
              {form.repos.length > 1 && (
                <button onClick={() => removeRepo(i)} className="text-red-500 hover:text-red-400 text-xs px-1">✕</button>
              )}
            </div>
          ))}
          <button
            onClick={addRepo}
            className="text-[11px] text-blue-400 hover:text-blue-300 text-left"
          >
            + Add repo
          </button>

          {error && <div className="text-red-400 text-xs">{error}</div>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-semibold py-1.5 px-4 rounded self-end"
          >
            {saving ? 'Saving…' : 'Save Project'}
          </button>
        </div>
      )}
    </div>
  )
}
