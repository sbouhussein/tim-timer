export function timeStringToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTimeString(totalMinutes) {
  const m = ((Math.round(totalMinutes) % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// Formats a 24-hour "HH:MM" string as 12-hour with AM/PM, e.g. "14:30" -> "2:30 PM".
export function formatTimeAmPm(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function totalEstimateMinutes(tasks) {
  return tasks.reduce((sum, t) => sum + t.estimateMin, 0)
}

export function computeStartByTime(tasks, deadline) {
  if (!deadline || tasks.length === 0) return null
  return minutesToTimeString(timeStringToMinutes(deadline) - totalEstimateMinutes(tasks))
}

function deadlineToEpoch(deadline) {
  const [h, m] = deadline.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

// Cumulative [{ id, startEpoch, endEpoch }] windows working backward from the
// deadline. pauseOffsetMs shifts the whole plan later by however long the
// timer has spent paused, so paused time doesn't eat into task windows.
export function computePlannedSchedule(tasks, deadline, pauseOffsetMs = 0) {
  const deadlineEpoch = deadlineToEpoch(deadline) + pauseOffsetMs
  let cursor = deadlineEpoch - totalEstimateMinutes(tasks) * 60000
  return tasks.map((t) => {
    const startEpoch = cursor
    const endEpoch = cursor + t.estimateMin * 60000
    cursor = endEpoch
    return { id: t.id, startEpoch, endEpoch }
  })
}

export function findCurrentTaskIndex(tasks) {
  return tasks.findIndex((t) => !t.done)
}

// Minutes behind (positive) or ahead (negative) schedule, based on the most
// recently completed task's actual completion time vs its planned end time.
// Returns null if nothing has been marked done yet.
export function computeScheduleDelta(tasks, plannedSchedule) {
  let last = null
  let lastIndex = -1
  tasks.forEach((t, i) => {
    if (t.done && t.completedAt && (!last || t.completedAt > last.completedAt)) {
      last = t
      lastIndex = i
    }
  })
  if (!last) return null
  const planned = plannedSchedule[lastIndex]
  if (!planned) return null
  return Math.round((last.completedAt - planned.endEpoch) / 60000)
}

// Shrinks tasks after currentIndex proportionally so their combined estimate
// drops by overrunMin, keeping the deadline reachable. Each task keeps a
// 1-minute floor. Tasks at or before currentIndex are left untouched.
export function shrinkTasksForOverrun(tasks, currentIndex, overrunMin) {
  const remaining = tasks.slice(currentIndex + 1).filter((t) => !t.done)
  const remainingTotal = totalEstimateMinutes(remaining)
  if (remainingTotal === 0 || overrunMin <= 0) return tasks

  const target = Math.max(remaining.length, remainingTotal - overrunMin)
  const ratio = target / remainingTotal

  return tasks.map((t, i) => {
    if (i <= currentIndex || t.done) return t
    return { ...t, estimateMin: Math.max(1, Math.round(t.estimateMin * ratio)) }
  })
}
