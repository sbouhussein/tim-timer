import Sortable from 'sortablejs'
import './style.css'
import * as store from './store.js'
import { computePlannedSchedule, findCurrentTaskIndex } from './schedule.js'
import { renderSetupView, renderRunningView, setView, showToast } from './render.js'
import { createTicker } from './timer.js'
import { requestPermission, notifyTaskExpired } from './notify.js'
import { renderSponsors } from './sponsors.js'

const $ = (id) => document.getElementById(id)

let ticker = null
let editingTaskId = null

function refreshSetup() {
  renderSetupView(store.getState(), { editingTaskId, templates: store.getTemplates() })
}

function currentPlannedSchedule() {
  const state = store.getState()
  return computePlannedSchedule(state.tasks, state.deadline, store.pauseOffsetMs())
}

function tickRunning(now) {
  renderRunningView(store.getState(), currentPlannedSchedule(), now, store.isPaused())
}

function markCurrentTaskDone() {
  const state = store.getState()
  const currentIndex = findCurrentTaskIndex(state.tasks)
  if (currentIndex === -1) return
  store.markTaskDone(state.tasks[currentIndex].id)
  tickRunning(Date.now())
}

function togglePause() {
  if (store.isPaused()) {
    store.resumeTimer()
  } else {
    store.pauseTimer()
  }
  tickRunning(Date.now())
}

function enterRunningView() {
  setView('running')
  ticker = createTicker({
    onTick: tickRunning,
    onTaskExpired: (task) => {
      notifyTaskExpired(task.name)
      showToast(`Time's up: ${task.name}`)
    },
  })
  ticker.start(() => [store.getState(), currentPlannedSchedule()])
}

function enterSetupView() {
  if (ticker) {
    ticker.stop()
    ticker = null
  }
  setView('setup')
  editingTaskId = null
  refreshSetup()
}

// --- Setup view interactions ---

$('deadline-input').addEventListener('change', (e) => {
  store.setDeadline(e.target.value)
  refreshSetup()
})

$('add-task-form').addEventListener('submit', (e) => {
  e.preventDefault()
  const nameInput = $('task-name-input')
  const estimateInput = $('task-estimate-input')
  const name = nameInput.value.trim()
  const estimateMin = Number(estimateInput.value)
  if (!name || !estimateMin || estimateMin <= 0) return
  store.addTask(name, estimateMin)
  nameInput.value = ''
  estimateInput.value = ''
  nameInput.focus()
  refreshSetup()
})

$('task-list').addEventListener('click', (e) => {
  const editButton = e.target.closest('button[data-action="edit"]')
  if (editButton) {
    editingTaskId = editButton.closest('li').dataset.id
    refreshSetup()
    return
  }

  const saveButton = e.target.closest('button[data-action="save-edit"]')
  if (saveButton) {
    const li = saveButton.closest('li')
    const name = li.querySelector('[data-field="name"]').value.trim()
    const estimateMin = Number(li.querySelector('[data-field="estimate"]').value)
    if (name && estimateMin > 0) store.updateTask(li.dataset.id, name, estimateMin)
    editingTaskId = null
    refreshSetup()
    return
  }

  const cancelButton = e.target.closest('button[data-action="cancel-edit"]')
  if (cancelButton) {
    editingTaskId = null
    refreshSetup()
    return
  }

  const removeButton = e.target.closest('button[data-action="remove"]')
  if (removeButton) {
    store.removeTask(removeButton.closest('li').dataset.id)
    refreshSetup()
  }
})

$('task-list').addEventListener('keydown', (e) => {
  if (!e.target.closest('li')?.dataset.id) return
  if (e.key === 'Enter' && e.target.dataset.field) {
    e.target.closest('li').querySelector('button[data-action="save-edit"]').click()
  } else if (e.key === 'Escape' && e.target.dataset.field) {
    editingTaskId = null
    refreshSetup()
  }
})

new Sortable($('task-list'), {
  handle: '.drag-handle',
  animation: 150,
  onEnd: () => {
    const orderedIds = Array.from($('task-list').children).map((li) => li.dataset.id)
    store.reorderTasks(orderedIds)
    refreshSetup()
  },
})

$('start-button').addEventListener('click', () => {
  requestPermission()
  store.startTimer()
  enterRunningView()
})

// --- Templates ---

$('template-select').addEventListener('change', () => {
  $('delete-template-button').disabled = !$('template-select').value
})

$('load-template-button').addEventListener('click', () => {
  const id = $('template-select').value
  if (!id) return
  if (store.getState().tasks.length > 0 && !confirm('Replace the current task list with this template?')) return
  store.applyTemplate(id)
  refreshSetup()
})

$('save-template-button').addEventListener('click', () => {
  if (store.getState().tasks.length === 0) return
  const name = prompt('Template name?')
  if (!name || !name.trim()) return
  store.saveTemplate(name.trim())
  refreshSetup()
  showToast(`Saved template "${name.trim()}"`)
})

$('delete-template-button').addEventListener('click', () => {
  const id = $('template-select').value
  if (!id) return
  if (!confirm('Delete this template?')) return
  store.deleteTemplate(id)
  refreshSetup()
})

// --- Running view interactions ---

$('running-task-list').addEventListener('click', (e) => {
  const button = e.target.closest('button[data-action="done"]')
  if (!button) return
  store.markTaskDone(button.closest('li').dataset.id)
  tickRunning(Date.now())
})

$('pause-button').addEventListener('click', togglePause)

$('shrink-plan-button').addEventListener('click', () => {
  const state = store.getState()
  const currentIndex = findCurrentTaskIndex(state.tasks)
  if (currentIndex === -1) return
  const plannedWindow = currentPlannedSchedule()[currentIndex]
  const overrunMin = Math.round((Date.now() - plannedWindow.endEpoch) / 60000)
  if (overrunMin < 1) return
  store.shrinkRemainingTasks(currentIndex, overrunMin)
  tickRunning(Date.now())
  showToast('Remaining tasks shrunk to fit the deadline')
})

$('reset-button').addEventListener('click', () => {
  if (!confirm('Reset all tasks and start over?')) return
  store.resetAll()
  enterSetupView()
})

// --- Keyboard shortcuts (running view only) ---

document.addEventListener('keydown', (e) => {
  if ($('running-view').classList.contains('hidden')) return
  if (e.target.closest('input, textarea, select')) return

  if (e.code === 'Space') {
    e.preventDefault()
    markCurrentTaskDone()
  } else if (e.key === 'p' || e.key === 'P') {
    e.preventDefault()
    togglePause()
  }
})

// --- Init ---

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

if (store.getState().timer.startedAt) {
  enterRunningView()
} else {
  enterSetupView()
}

renderSponsors()
