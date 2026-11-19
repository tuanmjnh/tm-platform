// Slice A1 (playback stall) — when the preview may write `currentTime`, and where
// the playhead stands while the picture is not presenting.
//
// The bug this names: the preview's rAF loop computed a wall-clock target and,
// whenever the element trailed it by more than 0.3 s, wrote `currentTime`. On a
// source slower than real time the element is ALWAYS behind, so the loop sought
// on every tick; every `currentTime` write aborts the in-flight range load that
// was about to fill the buffer, so the buffer never grew, so the element stayed
// behind. Measured on the 1080p30 fixture served at ~256 KB/s: 40 seeks in 12 s,
// `readyState` pinned at 1, buffered end frozen at 0.8 s. With the seek law
// removed, the same source reached a 6.7 s buffer and recovered on its own.
//
// Two decisions live here rather than in the component:
//  * A corrective seek is only legal while the element is actually presenting
//    (`readyState >= HAVE_FUTURE_DATA`) and is not already seeking. Seeking a
//    stalled element is what turns a transient underrun into a permanent one.
//  * While it cannot present, the playhead follows the PICTURE, not the wall
//    clock. Letting wall time run through a frozen frame is what made the drift
//    unbounded in the first place, and it also detaches the transport readout
//    from anything the viewer can see.
//
// Pure: no timers, no element access. The host supplies the four numbers it
// already has and applies the answer.

/** `HTMLMediaElement.HAVE_FUTURE_DATA` — enough data to present the next frame. */
export const TMCUT_PLAYBACK_PRESENTING_READY_STATE = 3

/** How far the element may trail the target before a corrective seek is worth a fetch. */
export const TMCUT_PLAYBACK_DRIFT_TOLERANCE_SEC = 0.3

/**
 * How long the picture may sit frozen before the preview stops calling it
 * "buffering" and reports a stall. Short enough that a viewer is not left
 * waiting on a spinner that will never clear, long enough that a normal range
 * fetch under a slow link is not reported as a failure.
 */
export const TMCUT_PLAYBACK_STALL_LIMIT_MS = 3000

/**
 * How long a corrective seek must be left alone before another one is worth
 * issuing.
 *
 * A seek is not a correction, it is a RESTART of the element's load. Measured on
 * the desktop host 2026-11-18: a 1440x2560 clip over `media://` was written
 * `currentTime` ten times in four seconds, each write exactly one tolerance
 * (+0.300 s) ahead of the element, every one from the preview's own follow loop.
 * The picture never advanced by itself, because each write aborted the load the
 * previous one started — so the next tick measured the same drift and sought
 * again. The viewer saw ~0.7x with a `waiting` event every couple of frames,
 * while the SAME file in a bare `<video>` played at 0.99x.
 *
 * A quarter of a second is longer than the load restart takes and far too short
 * to be seen as a stall, so the element gets a window to play and the loop
 * measures a real drift next time instead of its own interruption.
 */
export const TMCUT_PLAYBACK_SEEK_COOLDOWN_MS = 250

/**
 * A desync this large is a jump (a scrub, a loop wrap, a clip change), not the
 * drift a corrective seek is for. It must land at once: holding on the old
 * picture would show the wrong footage.
 */
export const TMCUT_PLAYBACK_JUMP_SEC = 1

/**
 * @typedef {{ action: 'follow'|'seek'|'hold'|'stalled', playheadSec: number, reason: string }} PlaybackFollowPlan
 */

/**
 * What the preview loop should do this tick.
 *
 * @param {object} input
 * @param {number} input.targetSec   where the timeline's clock says the playhead is
 * @param {number} input.elementSec  where the playing element actually is
 * @param {number} input.readyState  `HTMLMediaElement.readyState`
 * @param {boolean} [input.seeking]  `HTMLMediaElement.seeking`
 * @param {number} [input.frozenMs]  how long `elementSec` has failed to advance while playing
 * @param {number} [input.sinceSeekMs] ms since this element was last given `currentTime`;
 *   omit it and the law behaves as before, so a host that does not track seeks is unchanged
 * @param {number} [input.toleranceSec]
 * @param {number} [input.stallLimitMs]
 * @param {number} [input.seekCooldownMs]
 * @param {number} [input.jumpSec]
 * @returns {PlaybackFollowPlan}
 */
export function planPlaybackFollow(input = {}) {
  const target = finiteOr0(input.targetSec)
  const element = Math.max(0, finiteOr0(input.elementSec))
  const readyState = Number.isFinite(input.readyState) ? Number(input.readyState) : 0
  const tolerance = Math.max(0, Number.isFinite(input.toleranceSec)
    ? Number(input.toleranceSec)
    : TMCUT_PLAYBACK_DRIFT_TOLERANCE_SEC)
  const stallLimit = Math.max(0, Number.isFinite(input.stallLimitMs)
    ? Number(input.stallLimitMs)
    : TMCUT_PLAYBACK_STALL_LIMIT_MS)
  const frozenMs = Math.max(0, finiteOr0(input.frozenMs))
  const cooldown = Math.max(0, Number.isFinite(input.seekCooldownMs)
    ? Number(input.seekCooldownMs)
    : TMCUT_PLAYBACK_SEEK_COOLDOWN_MS)
  const jump = Math.max(0, Number.isFinite(input.jumpSec)
    ? Number(input.jumpSec)
    : TMCUT_PLAYBACK_JUMP_SEC)
  const sinceSeekMs = Number.isFinite(input.sinceSeekMs) ? Number(input.sinceSeekMs) : Infinity

  // A picture that has not moved for the whole budget is not "buffering" any
  // more: it is a stall the viewer must be told about, and the playhead must
  // stop pretending to advance through it.
  if (frozenMs >= stallLimit) {
    return plan('stalled', element, 'frozen-past-budget')
  }

  // A seek that is already running owns the element. Writing `currentTime`
  // again aborts it, and the abort is what starves the buffer.
  if (input.seeking === true) return plan('hold', element, 'seeking')

  // No future data: there is no frame to present, so there is nothing to
  // correct towards. Seeking here restarts the load this element is waiting on.
  if (readyState < TMCUT_PLAYBACK_PRESENTING_READY_STATE) {
    return plan('hold', element, 'no-future-data')
  }

  // Presenting: the element has data and is not mid-seek, so a corrective seek
  // costs one range fetch and lands where the timeline says. This is the case
  // the tolerance was written for.
  //
  // The exception is a seek issued a moment ago. A write restarts the element's
  // load, so within that window the drift being measured is the drift the last
  // write CAUSED — repeating it is the self-sustaining loop measured on the
  // desktop host (10 writes in 4 s, every one exactly one tolerance ahead).
  // A desync past `jump` is not drift, though: a scrub or a loop wrap must land
  // at once, cooldown or not.
  const drift = Math.abs(element - target)
  if (drift > tolerance) {
    if (drift <= jump && sinceSeekMs < cooldown) {
      return plan('hold', element, 'seek-cooldown')
    }
    return plan('seek', target, 'drift')
  }

  return plan('follow', target, 'in-sync')
}

function plan(action, playheadSec, reason) {
  return Object.freeze({ action, playheadSec, reason })
}

function finiteOr0(value) {
  return Number.isFinite(value) ? Number(value) : 0
}
