import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listProfilesByCategory,
  validateJiraProject,
  validateConfluenceSpace,
  createConfluenceSpace,
  registerProject,
  createCustomProfile,
} from '../utils/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'type',      label: 'Project Type' },
  { id: 'info',      label: 'Basic Info'   },
  { id: 'atlassian', label: 'Atlassian'    },
  { id: 'repos',     label: 'Repositories' },
  { id: 'review',    label: 'Review'       },
]

const REPO_ROLES = [
  { value: 'frontend',        label: 'Frontend (Web UI)'         },
  { value: 'backend',         label: 'Backend (REST / GraphQL)'  },
  { value: 'service',         label: 'Microservice'              },
  { value: 'function',        label: 'Serverless Function'       },
  { value: 'streaming',       label: 'Streaming (Kafka / SQS)'  },
  { value: 'mobile',          label: 'Mobile (iOS / Android)'    },
  { value: 'salesforce-core', label: 'Salesforce Core'           },
  { value: 'salesforce-b2c',  label: 'Salesforce B2C Commerce'   },
  { value: 'infra',           label: 'Infrastructure (IaC)'      },
  { value: 'ml',              label: 'ML / Data Pipeline'        },
  { value: 'library',         label: 'Shared Library / SDK'      },
]

const E2E_STRATEGY_LABELS = {
  playwright:           'Playwright (web)',
  detox:                'Detox (React Native)',
  appium:               'Appium (native mobile)',
  'flutter-integration': 'Flutter integration_test',
  'jest-only':          'Unit / integration tests only',
}

const EMPTY_CUSTOM_PROFILE = {
  id: '', label: '', extends: '', category: 'Custom',
  language: '', framework: '', build_tool: '', test_framework: '',
  deploy_target: '', build_command: '', test_command: '',
  dev_command: '', dev_port: 0, e2e_strategy: 'playwright',
  review_rules: '',
}

const EMPTY_REPO = { name: '', role: '', profile_id: '', github_url: '', language: '', framework: '', e2e_strategy: '' }

// ─── Small helpers ─────────────────────────────────────────────────────────────

function cls(...args) { return args.filter(Boolean).join(' ') }

function Input({ label, placeholder, value, onChange, mono, hint, disabled, rightSlot }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-400">{label}</label>}
      <div className="relative">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cls(
            'w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200',
            'focus:outline-none focus:border-blue-500/60 disabled:opacity-50',
            mono && 'font-mono tracking-wide',
            rightSlot && 'pr-10',
          )}
        />
        {rightSlot && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  )
}

function Select({ label, value, onChange, options, hint }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-gray-400">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/60"
      >
        <option value="">— select —</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  )
}

function ValidationBadge({ state }) {
  if (state === 'checking')   return <span className="text-yellow-400 text-xs animate-pulse">checking…</span>
  if (state === 'valid')      return <span className="text-green-400 text-base">✓</span>
  if (state === 'invalid')    return <span className="text-red-400 text-base">✗</span>
  if (state === 'auth_error') return <span className="text-orange-400 text-base">⚠</span>
  return null
}

function SectionTitle({ children }) {
  return <h3 className="text-sm font-semibold text-white mb-4">{children}</h3>
}

// ─── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done    = i < current
        const active  = i === current
        const last    = i === STEPS.length - 1
        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={cls(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                done   && 'bg-green-600 border-green-600 text-white',
                active && 'bg-blue-600 border-blue-500 text-white',
                !done && !active && 'bg-dark-700 border-dark-500 text-gray-500',
              )}>
                {done ? '✓' : i + 1}
              </div>
              <span className={cls(
                'text-[10px] whitespace-nowrap',
                active ? 'text-blue-400 font-semibold' : done ? 'text-green-500' : 'text-gray-600',
              )}>{s.label}</span>
            </div>
            {!last && (
              <div className={cls(
                'flex-1 h-0.5 mx-1 mb-4 transition-colors',
                done ? 'bg-green-600' : 'bg-dark-600',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 1: Project Type ──────────────────────────────────────────────────────

function Step1Type({ form, setForm }) {
  const opts = [
    {
      value: 'new',
      icon:  '🌱',
      title: 'New Project',
      desc:  'Starting from scratch. The platform will help scaffold your Jira project, Confluence space, and CI/CD pipelines.',
      bullets: ['Platform creates Confluence space', 'Guided repo setup', 'CI/CD templates generated'],
    },
    {
      value: 'existing',
      icon:  '🔗',
      title: 'Existing Project',
      desc:  'Connect your team\'s existing Jira project, Confluence space, and GitHub repos. Platform learns your codebase.',
      bullets: ['Validate existing Jira & Confluence', 'Auto-detect tech stack from repos', 'Brownfield-aware code generation'],
    },
  ]

  return (
    <div>
      <SectionTitle>What are you setting up?</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        {opts.map(o => (
          <button
            key={o.value}
            onClick={() => setForm(f => ({ ...f, project_type: o.value }))}
            className={cls(
              'text-left p-5 rounded-xl border-2 transition-all',
              form.project_type === o.value
                ? 'border-blue-500 bg-blue-900/20'
                : 'border-dark-500 bg-dark-700 hover:border-dark-400',
            )}
          >
            <div className="text-3xl mb-3">{o.icon}</div>
            <div className="font-semibold text-white text-base mb-1">{o.title}</div>
            <p className="text-gray-400 text-xs mb-3 leading-relaxed">{o.desc}</p>
            <ul className="space-y-1">
              {o.bullets.map(b => (
                <li key={b} className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <span className="text-blue-500">›</span> {b}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step 2: Basic Info ────────────────────────────────────────────────────────

function Step2Info({ form, setForm }) {
  function field(key) {
    return val => setForm(f => ({ ...f, [key]: val }))
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle>Tell us about your project</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Application / Project name *"
          placeholder="e.g. Payment Gateway"
          value={form.name}
          onChange={field('name')}
        />
        <Input
          label="Team name *"
          placeholder="e.g. Payments Team"
          value={form.team}
          onChange={field('team')}
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Brief description of what this application does…"
          rows={3}
          className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-blue-500/60"
        />
      </div>
    </div>
  )
}

// ─── Step 3: Atlassian ────────────────────────────────────────────────────────

function Step3Atlassian({ form, setForm, validation, setValidation }) {

  const isNew = form.project_type === 'new'

  function suggest(name) {
    if (!name) return ''
    return name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  }

  useEffect(() => {
    if (isNew && form.name && !form.jira_project_key) {
      setForm(f => ({ ...f, jira_project_key: suggest(f.name), confluence_space_key: suggest(f.name) }))
    }
  }, [form.name, isNew])

  async function checkJira(key) {
    if (!key || key.length < 2) return
    setValidation(v => ({ ...v, jira: 'checking' }))
    try {
      const r = await validateJiraProject(key)
      const state = r.auth_error ? 'auth_error' : r.exists ? 'valid' : 'invalid'
      setValidation(v => ({ ...v, jira: state, jiraInfo: r }))
    } catch {
      setValidation(v => ({ ...v, jira: 'invalid' }))
    }
  }

  async function checkConfluence(key) {
    if (!key || key.length < 2) return
    setValidation(v => ({ ...v, confluence: 'checking' }))
    try {
      const r = await validateConfluenceSpace(key)
      const state = r.auth_error ? 'auth_error' : r.exists ? 'valid' : 'invalid'
      setValidation(v => ({ ...v, confluence: state, confluenceInfo: r }))
    } catch {
      setValidation(v => ({ ...v, confluence: 'invalid' }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>
        {isNew ? 'Set up your Jira project and Confluence space' : 'Connect your existing Jira and Confluence'}
      </SectionTitle>

      {/* Jira */}
      <div className="bg-dark-700 rounded-xl p-4 border border-dark-500">
        <div className="flex items-center gap-2 mb-3">
          <img src="https://www.atlassian.com/dam/jcr:b544af14-8f6e-4b2f-b097-b7ce9b4f8936/Jira-Mark-Dark.svg"
               className="w-5 h-5" alt="" onError={e => e.target.style.display='none'} />
          <span className="font-semibold text-white text-sm">Jira Project</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Project key *"
            placeholder="e.g. PAY"
            value={form.jira_project_key}
            onChange={v => { setForm(f => ({ ...f, jira_project_key: v.toUpperCase() })); setValidation(v2 => ({ ...v2, jira: null })) }}
            mono
            rightSlot={<ValidationBadge state={validation.jira} />}
          />
          <div className="flex flex-col justify-end">
            <button
              onClick={() => checkJira(form.jira_project_key)}
              disabled={!form.jira_project_key}
              className="bg-dark-600 hover:bg-dark-500 text-gray-300 text-xs px-4 py-2 rounded-lg border border-dark-500 disabled:opacity-40"
            >
              Validate key
            </button>
          </div>
        </div>
        {validation.jiraInfo?.exists && (
          <p className="text-xs text-green-400 mt-2">
            Found: <strong>{validation.jiraInfo.name}</strong> —{' '}
            <a href={validation.jiraInfo.url} target="_blank" rel="noreferrer" className="underline">open board ↗</a>
          </p>
        )}
        {validation.jira === 'invalid' && !isNew && (
          <p className="text-xs text-red-400 mt-2">Project not found. Check the key or create it in Jira first.</p>
        )}
        {validation.jira === 'invalid' && isNew && (
          <p className="text-xs text-yellow-400 mt-2">Key available — will create this project for you.</p>
        )}
        {validation.jira === 'auth_error' && (
          <p className="text-xs text-orange-400 mt-2">
            {validation.jiraInfo?.error || 'Jira API credentials invalid.'}{' '}
            <span className="text-gray-400">The project may still exist — fix credentials then re-validate.</span>
          </p>
        )}
      </div>

      {/* Confluence */}
      <div className="bg-dark-700 rounded-xl p-4 border border-dark-500">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📘</span>
          <span className="font-semibold text-white text-sm">Confluence Space</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Space key *"
            placeholder="e.g. PAY"
            value={form.confluence_space_key}
            onChange={v => { setForm(f => ({ ...f, confluence_space_key: v.toUpperCase() })); setValidation(v2 => ({ ...v2, confluence: null })) }}
            mono
            rightSlot={<ValidationBadge state={validation.confluence} />}
          />
          <div className="flex flex-col justify-end">
            <button
              onClick={() => checkConfluence(form.confluence_space_key)}
              disabled={!form.confluence_space_key}
              className="bg-dark-600 hover:bg-dark-500 text-gray-300 text-xs px-4 py-2 rounded-lg border border-dark-500 disabled:opacity-40"
            >
              Validate space
            </button>
          </div>
        </div>
        {validation.confluenceInfo?.exists && (
          <p className="text-xs text-green-400 mt-2">
            Found: <strong>{validation.confluenceInfo.name}</strong> —{' '}
            <a href={validation.confluenceInfo.url} target="_blank" rel="noreferrer" className="underline">open space ↗</a>
          </p>
        )}
        {isNew && validation.confluence === 'invalid' && (
          <p className="text-xs text-yellow-400 mt-2">Space available — platform will create it with a homepage.</p>
        )}
        {!isNew && validation.confluence === 'invalid' && (
          <p className="text-xs text-red-400 mt-2">Space not found. Check the key or ask your Confluence admin to create it.</p>
        )}
        {validation.confluence === 'auth_error' && (
          <p className="text-xs text-orange-400 mt-2">
            {validation.confluenceInfo?.error || 'Confluence API credentials invalid.'}{' '}
            <span className="text-gray-400">The space may still exist — fix credentials then re-validate.</span>
          </p>
        )}
      </div>

      {/* Execution methodology */}
      <div className="bg-dark-700 rounded-xl p-4 border border-dark-500">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⚙️</span>
          <span className="font-semibold text-white text-sm">Execution Methodology</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Methodology</label>
          <select
            value={form.methodology}
            onChange={e => setForm(f => ({ ...f, methodology: e.target.value }))}
            className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/60"
          >
            {METHODOLOGY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500 mt-1">
            Auto-detect reads the Jira board type at registration. You can override if needed.
            Affects story point handling and sprint assignment during pipeline runs.
          </p>
          {form.methodology === 'kanban' && (
            <p className="text-[11px] text-yellow-400 mt-1">
              Kanban: story points will be omitted from Jira issues; pipeline focuses on continuous flow.
            </p>
          )}
        </div>
      </div>

      {isNew && (
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-3 text-xs text-blue-300 leading-relaxed">
          For a new project, the platform will create the Confluence space automatically and seed it with a project homepage.
          The Jira project must be created manually in Jira (the API token requires admin rights for project creation) —
          we'll validate it's ready before you proceed.
        </div>
      )}
    </div>
  )
}

// ─── Custom Profile Form ───────────────────────────────────────────────────────

function CustomProfileForm({ profilesByCategory, onSaved, onCancel }) {
  const [form,    setForm]    = useState(EMPTY_CUSTOM_PROFILE)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const allProfiles = Object.values(profilesByCategory).flat()

  async function handleSave() {
    if (!form.id || !form.label) { setError('Profile ID and label are required'); return }
    if (!/^[a-z0-9-]+$/.test(form.id)) { setError('Profile ID must be lowercase letters, numbers, and hyphens only'); return }
    setSaving(true)
    setError('')
    try {
      const saved = await createCustomProfile({ ...form, dev_port: Number(form.dev_port) || 0 })
      onSaved(saved)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function f(key) { return val => setForm(p => ({ ...p, [key]: val })) }

  return (
    <div className="mt-3 bg-dark-600 border border-blue-700/40 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-blue-300">Create custom profile</span>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 text-xs">✕ cancel</button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Input label="Profile ID *" placeholder="e.g. sfcc-pwakit-custom" value={form.id} onChange={f('id')} mono
          hint="Lowercase, hyphens only" />
        <Input label="Display label *" placeholder="e.g. SFCC PWA Kit + Custom Lib" value={form.label} onChange={f('label')} />
      </div>

      <div className="mb-2">
        <label className="text-xs text-gray-400 block mb-1">Extends (optional)</label>
        <select
          value={form.extends}
          onChange={e => setForm(p => ({ ...p, extends: e.target.value }))}
          className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/60"
        >
          <option value="">— none (define all fields) —</option>
          {allProfiles.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        {form.extends && (
          <p className="text-[11px] text-blue-400 mt-1">
            Inherits all fields from the parent — only specify what differs.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Input label="Language" placeholder="e.g. TypeScript / React" value={form.language} onChange={f('language')} />
        <Input label="Framework" placeholder="e.g. PWA Kit (Retail React App)" value={form.framework} onChange={f('framework')} />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Input label="Deploy target" placeholder="e.g. Salesforce MRT" value={form.deploy_target} onChange={f('deploy_target')} />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">E2E strategy</label>
          <select
            value={form.e2e_strategy}
            onChange={e => setForm(p => ({ ...p, e2e_strategy: e.target.value }))}
            className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/60"
          >
            {Object.entries(E2E_STRATEGY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-2">
        <label className="text-xs text-gray-400 block mb-1">Review rules (optional)</label>
        <textarea
          value={form.review_rules}
          onChange={e => setForm(p => ({ ...p, review_rules: e.target.value }))}
          placeholder="Stack-specific review checklist — e.g. 'Check for governor limits, missing bulk patterns…'"
          rows={3}
          className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-blue-500/60"
        />
      </div>

      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded-lg"
      >
        {saving ? 'Saving…' : 'Save custom profile'}
      </button>
    </div>
  )
}

// ─── Step 4: Repositories ─────────────────────────────────────────────────────

function Step4Repos({ form, setForm, profilesByCategory, onProfileCreated }) {
  const [showCustomForm, setShowCustomForm] = useState(false)

  function addRepo() {
    setForm(f => ({ ...f, repos: [...f.repos, { ...EMPTY_REPO }] }))
  }

  function removeRepo(i) {
    setForm(f => ({ ...f, repos: f.repos.filter((_, idx) => idx !== i) }))
  }

  function updateRepo(i, key, val) {
    setForm(f => {
      const repos = [...f.repos]
      repos[i] = { ...repos[i], [key]: val }

      if (key === 'profile_id') {
        const profile = Object.values(profilesByCategory).flat().find(p => p.id === val)
        if (profile) {
          repos[i].language     = profile.language  || ''
          repos[i].framework    = profile.framework || ''
          repos[i].e2e_strategy = profile.e2e_strategy || 'playwright'
        }
      }
      return { ...f, repos }
    })
  }

  // Group by category for the <optgroup> select
  const profileGrouped = Object.entries(profilesByCategory).map(([cat, profiles]) => ({
    label: cat,
    options: profiles.map(p => ({
      value:   p.id,
      label:   p.label,
      extends: p.extends || '',
    })),
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Repositories</SectionTitle>
        <button
          onClick={addRepo}
          className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg"
        >
          + Add repo
        </button>
      </div>

      {form.repos.length === 0 && (
        <div className="text-center py-10 text-gray-600 text-sm border border-dashed border-dark-500 rounded-xl">
          No repositories added yet.<br />
          <button onClick={addRepo} className="text-blue-400 hover:text-blue-300 mt-2">Add your first repo →</button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {form.repos.map((repo, i) => (
          <div key={i} className="bg-dark-700 border border-dark-500 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-300">Repo {i + 1}</span>
              <button onClick={() => removeRepo(i)} className="text-red-500 hover:text-red-400 text-xs">remove</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input
                label="Repository name *"
                placeholder="e.g. payment-api"
                value={repo.name}
                onChange={v => updateRepo(i, 'name', v)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Role *</label>
                <select
                  value={repo.role}
                  onChange={e => updateRepo(i, 'role', e.target.value)}
                  className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/60"
                >
                  <option value="">— select role —</option>
                  {REPO_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            {/* Profile selector */}
            <div className="mb-2">
              <label className="text-xs text-gray-400 block mb-1">Technology profile *</label>
              <select
                value={repo.profile_id}
                onChange={e => updateRepo(i, 'profile_id', e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/60"
              >
                <option value="">— select profile —</option>
                {profileGrouped.map(group => (
                  <optgroup key={group.label} label={`── ${group.label} ──`}>
                    {group.options.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}{o.extends ? ` [↑ ${o.extends}]` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Profile metadata badges */}
            {repo.profile_id && (() => {
              const profile = Object.values(profilesByCategory).flat().find(p => p.id === repo.profile_id)
              return profile ? (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {profile.language     && <span className="bg-dark-600 text-blue-300  text-[11px] px-2 py-0.5 rounded">{profile.language}</span>}
                  {profile.framework    && <span className="bg-dark-600 text-green-300 text-[11px] px-2 py-0.5 rounded">{profile.framework}</span>}
                  {profile.e2e_strategy && (
                    <span className="bg-dark-600 text-purple-300 text-[11px] px-2 py-0.5 rounded">
                      E2E: {E2E_STRATEGY_LABELS[profile.e2e_strategy] || profile.e2e_strategy}
                    </span>
                  )}
                  {profile.extends && (
                    <span className="bg-blue-900/30 text-blue-400 text-[11px] px-2 py-0.5 rounded border border-blue-700/30">
                      extends {profile.extends}
                    </span>
                  )}
                  {profile.category === 'Custom' && (
                    <span className="bg-yellow-900/30 text-yellow-400 text-[11px] px-2 py-0.5 rounded">custom</span>
                  )}
                </div>
              ) : null
            })()}

            <Input
              label="GitHub URL (optional)"
              placeholder="https://github.com/org/repo-name"
              value={repo.github_url}
              onChange={v => updateRepo(i, 'github_url', v)}
              hint="Used to scan existing code patterns on registration."
            />
          </div>
        ))}
      </div>

      {/* Custom profile creation */}
      <div className="border-t border-dark-600 pt-3">
        {!showCustomForm ? (
          <button
            onClick={() => setShowCustomForm(true)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            + Create custom profile for a non-standard tech stack
          </button>
        ) : (
          <CustomProfileForm
            profilesByCategory={profilesByCategory}
            onSaved={saved => {
              onProfileCreated(saved)
              setShowCustomForm(false)
            }}
            onCancel={() => setShowCustomForm(false)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Step 5: Review ───────────────────────────────────────────────────────────

function Step5Review({ form, saving, error, onSave }) {
  const isNew = form.project_type === 'new'

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle>Review and register</SectionTitle>

      {/* Project card */}
      <div className="bg-dark-700 border border-dark-500 rounded-xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-lg font-bold text-white">{form.name || '—'}</div>
            <div className="text-xs text-gray-400">{form.team}</div>
          </div>
          <span className={cls(
            'text-xs px-2 py-0.5 rounded-full',
            isNew ? 'bg-green-900/40 text-green-400' : 'bg-blue-900/40 text-blue-400',
          )}>
            {isNew ? '🌱 New' : '🔗 Existing'}
          </span>
        </div>
        {form.description && <p className="text-gray-400 text-xs mb-4 leading-relaxed">{form.description}</p>}

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-dark-800 rounded-lg p-3">
            <div className="text-gray-500 mb-1">Jira Project</div>
            <div className="font-mono font-bold text-white">{form.jira_project_key || '—'}</div>
          </div>
          <div className="bg-dark-800 rounded-lg p-3">
            <div className="text-gray-500 mb-1">Confluence Space</div>
            <div className="font-mono font-bold text-white">{form.confluence_space_key || '—'}</div>
          </div>
          <div className="bg-dark-800 rounded-lg p-3">
            <div className="text-gray-500 mb-1">Methodology</div>
            <div className="font-semibold text-white capitalize">
              {form.methodology || <span className="text-gray-500 font-normal">auto-detect</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Repos */}
      {form.repos.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-2">{form.repos.length} Repositor{form.repos.length === 1 ? 'y' : 'ies'}</div>
          <div className="flex flex-col gap-2">
            {form.repos.map((r, i) => (
              <div key={i} className="bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-semibold text-white">{r.name || '—'}</span>
                {r.role        && <span className="text-gray-500">{r.role}</span>}
                {r.profile_id  && <span className="bg-dark-600 text-blue-300 px-1.5 py-0.5 rounded">{r.profile_id}</span>}
                {r.language    && <span className="text-blue-300">{r.language}</span>}
                {r.e2e_strategy && (
                  <span className="bg-dark-600 text-purple-300 px-1.5 py-0.5 rounded">
                    {E2E_STRATEGY_LABELS[r.e2e_strategy] || r.e2e_strategy}
                  </span>
                )}
                {r.github_url && (
                  <a href={r.github_url} target="_blank" rel="noreferrer"
                     className="ml-auto text-gray-500 hover:text-gray-300 underline truncate max-w-[160px]">
                    {r.github_url.replace('https://github.com/', '')} ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isNew && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 text-xs text-yellow-300 leading-relaxed">
          Clicking "Register" will create the Confluence space <strong>{form.confluence_space_key}</strong> and
          seed it with a project homepage. Make sure the Jira project <strong>{form.jira_project_key}</strong> already
          exists before running your first pipeline.
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-xs text-red-400">{error}</div>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="self-end bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white font-semibold text-sm px-8 py-2.5 rounded-xl transition-colors"
      >
        {saving ? 'Registering…' : 'Register Project →'}
      </button>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const METHODOLOGY_OPTIONS = [
  { value: '',        label: 'Auto-detect from Jira board' },
  { value: 'scrum',   label: 'Scrum — sprint-based, story points, velocity' },
  { value: 'kanban',  label: 'Kanban — continuous flow, WIP limits' },
  { value: 'other',   label: 'Other / custom' },
]

const INIT_FORM = {
  project_type:         '',   // 'new' | 'existing'
  name:                 '',
  team:                 '',
  description:          '',
  jira_project_key:     '',
  confluence_space_key: '',
  methodology:          '',   // '' = auto-detect
  repos:                [],
}

export default function RegisterProject() {
  const navigate = useNavigate()
  const [step,       setStep]       = useState(0)
  const [form,       setForm]       = useState(INIT_FORM)
  const [validation, setValidation] = useState({ jira: null, confluence: null, jiraInfo: null, confluenceInfo: null })
  const [profiles,   setProfiles]   = useState({})
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')

  useEffect(() => {
    listProfilesByCategory()
      .then(setProfiles)
      .catch(() => setProfiles({}))
  }, [])

  // ── Validation ─────────────────────────────────────────────────────────────

  function canAdvance() {
    if (step === 0) return !!form.project_type
    if (step === 1) return !!form.name.trim() && !!form.team.trim()
    if (step === 2) return !!form.jira_project_key && !!form.confluence_space_key
    if (step === 3) return true  // repos are optional but at least one should have a name
    return true
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      // For new projects, create the Confluence space first
      if (form.project_type === 'new' && validation.confluence !== 'valid') {
        await createConfluenceSpace({
          key:         form.confluence_space_key,
          name:        form.name,
          description: form.description,
        })
      }

      const saved = await registerProject({
        name:                 form.name,
        team:                 form.team,
        jira_project_key:     form.jira_project_key,
        confluence_space_key: form.confluence_space_key,
        methodology:          form.methodology,
        repos: form.repos
          .filter(r => r.name)
          .map(r => ({
            name:         r.name,
            role:         r.role         || '',
            profile_id:   r.profile_id   || '',
            language:     r.language     || '',
            url:          r.github_url   || '',
            e2e_strategy: r.e2e_strategy || '',
          })),
      })

      // Navigate back to pipeline with the new project selected
      navigate(`/?project=${saved.id}`)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-dark-600 bg-dark-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            ← Pipeline
          </button>
          <span className="text-gray-600">|</span>
          <span className="text-white font-semibold">Register Team Project</span>
        </div>
        <span className="text-xs text-gray-600">Step {step + 1} of {STEPS.length}</span>
      </header>

      {/* Content */}
      <div className="flex-1 flex justify-center py-10 px-4">
        <div className="w-full max-w-2xl">

          <StepIndicator current={step} />

          <div className="bg-dark-800 border border-dark-600 rounded-2xl p-8">
            {step === 0 && <Step1Type form={form} setForm={setForm} />}
            {step === 1 && <Step2Info form={form} setForm={setForm} />}
            {step === 2 && (
              <Step3Atlassian
                form={form}
                setForm={setForm}
                validation={validation}
                setValidation={setValidation}
              />
            )}
            {step === 3 && (
              <Step4Repos
                form={form}
                setForm={setForm}
                profilesByCategory={profiles}
                onProfileCreated={saved => {
                  setProfiles(prev => {
                    const cat = saved.category || 'Custom'
                    const existing = prev[cat] || []
                    return { ...prev, [cat]: [...existing, saved] }
                  })
                }}
              />
            )}
            {step === 4 && (
              <Step5Review
                form={form}
                saving={saving}
                error={saveError}
                onSave={handleSave}
              />
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30 px-4 py-2"
            >
              ← Back
            </button>
            {step < STEPS.length - 1 && (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance()}
                className="bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-sm font-semibold px-6 py-2 rounded-xl transition-colors"
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
