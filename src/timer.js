import { findCurrentTaskIndex } from './schedule.js'

export function formatClock(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// Ticks once per second, calling onTick(now) every time and onTaskExpired(task)
// the first time the current task's planned end time is crossed.
export function createTicker({ onTick, onTaskExpired }) {
  const notified = new Set()
  let intervalId = null

  function tick(state, plannedSchedule) {
    const now = Date.now()
    const currentIndex = findCurrentTaskIndex(state.tasks)
    if (currentIndex !== -1) {
      const task = state.tasks[currentIndex]
      const window = plannedSchedule[currentIndex]
      if (window && now >= window.endEpoch && !notified.has(task.id)) {
        notified.add(task.id)
        onTaskExpired(task)
      }
    }
    onTick(now)
  }

  return {
    start(getStateAndSchedule) {
      tick(...getStateAndSchedule())
      intervalId = setInterval(() => tick(...getStateAndSchedule()), 1000)
    },
    stop() {
      clearInterval(intervalId)
      intervalId = null
    },
  }
}
