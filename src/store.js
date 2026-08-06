import { shrinkTasksForOverrun } from './schedule.js'

const STORAGE_KEY = 'tim-timer-state'
const TEMPLATES_KEY = 'tim-timer-templates'

function defaultState() {
  return {
    deadline: '',
    tasks: [],
    timer: { startedAt: null, pausedAt: null, totalPausedMs: 0 },
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    return { ...defaultState(), ...parsed, timer: { ...defaultState().timer, ...parsed.timer } }
  } catch {
    return defaultState()
  }
}

function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

let state = load()
let templates = loadTemplates()

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function saveTemplates() {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
}

export function getState() {
  return state
}

export function setDeadline(deadline) {
  state.deadline = deadline
  save()
}

export function addTask(name, estimateMin) {
  state.tasks.push({
    id: crypto.randomUUID(),
    name,
    estimateMin,
    done: false,
    completedAt: null,
  })
  save()
}

export function removeTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id)
  save()
}

export function updateTask(id, name, estimateMin) {
  const task = state.tasks.find((t) => t.id === id)
  if (!task) return
  task.name = name
  task.estimateMin = estimateMin
  save()
}

export function reorderTasks(orderedIds) {
  const byId = new Map(state.tasks.map((t) => [t.id, t]))
  state.tasks = orderedIds.map((id) => byId.get(id)).filter(Boolean)
  save()
}

export function markTaskDone(id, doneAt = Date.now()) {
  const task = state.tasks.find((t) => t.id === id)
  if (!task) return
  task.done = true
  task.completedAt = doneAt
  save()
}

export function unmarkTaskDone(id) {
  const task = state.tasks.find((t) => t.id === id)
  if (!task) return
  task.done = false
  task.completedAt = null
  save()
}

export function startTimer() {
  state.timer.startedAt = Date.now()
  state.timer.pausedAt = null
  state.timer.totalPausedMs = 0
  save()
}

export function isPaused() {
  return state.timer.pausedAt !== null
}

export function pauseTimer() {
  if (state.timer.pausedAt !== null) return
  state.timer.pausedAt = Date.now()
  save()
}

export function resumeTimer() {
  if (state.timer.pausedAt === null) return
  state.timer.totalPausedMs += Date.now() - state.timer.pausedAt
  state.timer.pausedAt = null
  save()
}

export function pauseOffsetMs() {
  const { pausedAt, totalPausedMs } = state.timer
  return totalPausedMs + (pausedAt !== null ? Date.now() - pausedAt : 0)
}

// Shrinks not-yet-started tasks proportionally so the plan still fits the
// deadline after the current task has run overrunMin minutes over.
export function shrinkRemainingTasks(currentIndex, overrunMin) {
  state.tasks = shrinkTasksForOverrun(state.tasks, currentIndex, overrunMin)
  save()
}

export function resetAll() {
  state = defaultState()
  save()
}

// --- Templates ---

export function getTemplates() {
  return templates
}

export function saveTemplate(name) {
  const tasks = state.tasks.map((t) => ({ name: t.name, estimateMin: t.estimateMin }))
  const existing = templates.find((tpl) => tpl.name === name)
  if (existing) {
    existing.tasks = tasks
  } else {
    templates.push({ id: crypto.randomUUID(), name, tasks })
  }
  saveTemplates()
}

export function deleteTemplate(id) {
  templates = templates.filter((tpl) => tpl.id !== id)
  saveTemplates()
}

export function applyTemplate(id) {
  const template = templates.find((tpl) => tpl.id === id)
  if (!template) return
  state.tasks = template.tasks.map((t) => ({
    id: crypto.randomUUID(),
    name: t.name,
    estimateMin: t.estimateMin,
    done: false,
    completedAt: null,
  }))
  save()
}
