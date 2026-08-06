import { computeStartByTime, findCurrentTaskIndex, computeScheduleDelta, formatTimeAmPm } from './schedule.js'
import { formatClock } from './timer.js'

const $ = (id) => document.getElementById(id)

export function renderSetupView(state, { editingTaskId = null, templates = [] } = {}) {
  $('deadline-input').value = state.deadline

  const startBy = computeStartByTime(state.tasks, state.deadline)
  $('start-by-readout').textContent = startBy ? formatTimeAmPm(startBy) : '--:--'

  const list = $('task-list')
  list.innerHTML = ''
  state.tasks.forEach((task) => {
    const li = document.createElement('li')
    li.dataset.id = task.id

    if (task.id === editingTaskId) {
      li.className = 'flex items-center gap-2 rounded-xl bg-slate-800 border border-indigo-500 ring-1 ring-indigo-500/30 px-3 py-2 shadow-sm'

      const nameInput = document.createElement('input')
      nameInput.type = 'text'
      nameInput.value = task.name
      nameInput.dataset.field = 'name'
      nameInput.className = 'flex-1 min-w-0 rounded-md bg-slate-900 border border-slate-700 px-2 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500'

      const estimateInput = document.createElement('input')
      estimateInput.type = 'number'
      estimateInput.min = '1'
      estimateInput.step = '1'
      estimateInput.value = String(task.estimateMin)
      estimateInput.dataset.field = 'estimate'
      estimateInput.className = 'w-16 rounded-md bg-slate-900 border border-slate-700 px-2 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500'

      li.append(nameInput, estimateInput)
      li.insertAdjacentHTML(
        'beforeend',
        `<button type="button" data-action="save-edit" class="text-emerald-400 hover:text-emerald-300 px-1 transition-colors">✓</button>
         <button type="button" data-action="cancel-edit" class="text-slate-500 hover:text-red-400 px-1 transition-colors">✕</button>`,
      )
      list.appendChild(li)
      nameInput.focus()
      nameInput.select()
      return
    }

    li.className = 'flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 shadow-sm transition-colors hover:border-slate-600'
    li.innerHTML = `
      <span class="drag-handle text-slate-500 select-none">⠿</span>
      <span class="flex-1 truncate">${escapeHtml(task.name)}</span>
      <span class="text-slate-400 text-sm tabular-nums">${task.estimateMin} min</span>
      <button type="button" data-action="edit" class="text-slate-500 hover:text-indigo-400 px-1 transition-colors">✎</button>
      <button type="button" data-action="remove" class="text-slate-500 hover:text-red-400 px-1 transition-colors">✕</button>
    `
    list.appendChild(li)
  })

  const templateSelect = $('template-select')
  const selectedValue = templateSelect.value
  templateSelect.innerHTML = '<option value="">Load template…</option>'
  templates.forEach((tpl) => {
    const option = document.createElement('option')
    option.value = tpl.id
    option.textContent = `${tpl.name} (${tpl.tasks.length})`
    templateSelect.appendChild(option)
  })
  if (templates.some((tpl) => tpl.id === selectedValue)) templateSelect.value = selectedValue

  $('delete-template-button').disabled = !templateSelect.value
  $('start-button').disabled = state.tasks.length === 0 || !state.deadline
}

export function renderRunningView(state, plannedSchedule, now, isPaused) {
  const currentIndex = findCurrentTaskIndex(state.tasks)
  const currentTask = currentIndex === -1 ? null : state.tasks[currentIndex]
  const currentWindow = currentIndex === -1 ? null : plannedSchedule[currentIndex]
  const overrunMs = currentWindow ? now - currentWindow.endEpoch : 0
  const isOverrun = !!currentWindow && overrunMs > 0

  $('current-task-name').textContent = currentTask ? currentTask.name : 'All done'
  $('current-task-time-left').textContent = currentWindow
    ? (isOverrun ? '+' : '') + formatClock(isOverrun ? overrunMs : currentWindow.endEpoch - now)
    : '--:--'
  $('current-task-time-left').classList.toggle('text-red-400', isOverrun)

  $('pause-button').textContent = isPaused ? 'Resume' : 'Pause'
  $('pause-button').disabled = !currentTask
  $('paused-pill').classList.toggle('hidden', !isPaused)

  const nextTask = currentIndex === -1 ? null : state.tasks[currentIndex + 1]
  $('next-task-name').textContent = nextTask ? nextTask.name : '—'

  const deadlineEpoch = plannedSchedule.length
    ? plannedSchedule[plannedSchedule.length - 1].endEpoch
    : now
  $('total-time-left').textContent = formatClock(deadlineEpoch - now)

  const list = $('running-task-list')
  list.innerHTML = ''
  state.tasks.forEach((task) => {
    const li = document.createElement('li')
    li.dataset.id = task.id
    li.className = `flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm transition-colors ${
      task.done ? 'bg-slate-900/60 border-slate-800 text-slate-500' : 'bg-slate-800/80 border-slate-700'
    }`
    li.innerHTML = `
      <span class="flex-1 truncate ${task.done ? 'line-through' : ''}">${escapeHtml(task.name)}</span>
      <span class="text-sm tabular-nums text-slate-400">${task.estimateMin} min</span>
      ${
        task.done
          ? '<span class="text-emerald-400 text-sm px-1">✓</span>'
          : '<button type="button" data-action="done" class="text-xs rounded-md bg-emerald-600 px-2 py-1 shadow-sm transition-colors hover:bg-emerald-500 active:scale-[0.97]">Done</button>'
      }
    `
    list.appendChild(li)
  })

  const overrunBanner = $('overrun-banner')
  const overrunMin = isOverrun ? Math.round(overrunMs / 60000) : 0
  const hasShrinkableTasks = state.tasks.slice(currentIndex + 1).some((t) => !t.done)
  if (isOverrun && overrunMin >= 1 && hasShrinkableTasks) {
    overrunBanner.classList.remove('hidden')
    $('overrun-banner-text').textContent = `${overrunMin} min over — shrink the rest of the plan to still hit your deadline?`
  } else {
    overrunBanner.classList.add('hidden')
  }

  const delta = computeScheduleDelta(state.tasks, plannedSchedule)
  const banner = $('delta-banner')
  if (delta === null) {
    banner.classList.add('hidden')
  } else {
    banner.classList.remove('hidden')
    if (delta > 0) {
      banner.textContent = `${delta} min behind schedule`
      banner.className = 'rounded-xl px-4 py-2 text-center font-medium transition-colors bg-red-900/60 border border-red-800/50 text-red-300'
    } else if (delta < 0) {
      banner.textContent = `${-delta} min ahead of schedule`
      banner.className = 'rounded-xl px-4 py-2 text-center font-medium transition-colors bg-emerald-900/60 border border-emerald-800/50 text-emerald-300'
    } else {
      banner.textContent = 'On schedule'
      banner.className = 'rounded-xl px-4 py-2 text-center font-medium transition-colors bg-slate-800/80 border border-slate-700 text-slate-300'
    }
  }
}

export function setView(mode) {
  $('setup-view').classList.toggle('hidden', mode !== 'setup')
  $('running-view').classList.toggle('hidden', mode !== 'running')
}

let toastTimeout = null
export function showToast(message) {
  const toast = $('toast')
  toast.textContent = message
  toast.classList.remove('hidden')
  clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 4000)
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
