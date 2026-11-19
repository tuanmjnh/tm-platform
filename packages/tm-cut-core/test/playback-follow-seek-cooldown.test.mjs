// The seek limit cycle: a corrective seek that repeats forever.
//
// Measured on the desktop shell 2026-11-18 (`/tmcut/editor?project=default`,
// Electron 44.10 / Chromium 152, a 1440x2560 / 24.45 s clip over `media://`):
//
//  * the same file in a BARE <video> played at 0.99x, `readyState` 4, one seek;
//  * the editor's element was written `currentTime` 10 times in 4 s, each write
//    exactly +0.300 s from where the element stood, every one from
//    `followElement` -> `step`;
//  * each write restarts the element's load, so the picture never advances on
//    its own — which is what the next tick's drift measures, so it seeks again.
//
// The old law only refused to seek an element that cannot present (`readyState`
// < 3) or is already seeking. It has no memory, so a seek that does not take
// effect is repeated at frame rate: the loop is self-sustaining and the viewer
// sees ~0.7x with a `waiting` event every couple of frames.
//
// What the law is missing is the other half of the same idea: a corrective seek
// is an expensive act (it aborts a load), so it must earn a quiet interval
// before it may happen again. If the element is still off target a few
// milliseconds later, seeking harder is exactly what starved it.
//
// Run: node --test test/playback-follow-seek-cooldown.test.mjs
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  planPlaybackFollow,
  TMCUT_PLAYBACK_DRIFT_TOLERANCE_SEC,
  TMCUT_PLAYBACK_SEEK_COOLDOWN_MS
} from '../src/playback.mjs'

const PRESENTING = 4
const FUTURE_DATA = 3

describe('a corrective seek earns a quiet interval', () => {
  it('the first drift past tolerance still seeks — the cooldown is not a ban', () => {
    const plan = planPlaybackFollow({
      targetSec: 1.0,
      elementSec: 0.5,
      readyState: PRESENTING,
      seeking: false,
      frozenMs: 0,
      sinceSeekMs: Infinity
    })
    assert.equal(plan.action, 'seek', 'a new drift must still be corrected')
    assert.equal(plan.playheadSec, 1.0)
  })

  it('a seek issued moments ago is not repeated — this is the measured cycle', () => {
    // The desktop trace: writes landing at 0.33, 0.63, 0.93 … i.e. target minus
    // element = one tolerance at write time (real clocks put it a hair over, and
    // that hair is what makes the law fire again). 40 ms after the previous
    // write the element has had no time to play, so writing again aborts the
    // very load this seek asked for.
    const plan = planPlaybackFollow({
      targetSec: 0.63,
      elementSec: 0.329,
      readyState: PRESENTING,
      seeking: false,
      frozenMs: 0,
      sinceSeekMs: 40
    })
    assert.notEqual(plan.action, 'seek', 'repeating the seek at frame rate is the stall itself')
    assert.equal(plan.action, 'hold', 'and the playhead is held on the picture meanwhile')
  })

  it('the cooldown is bounded: playback gets its window back', () => {
    const plan = planPlaybackFollow({
      targetSec: 1.4,
      elementSec: 0.9,
      readyState: PRESENTING,
      seeking: false,
      frozenMs: 0,
      sinceSeekMs: TMCUT_PLAYBACK_SEEK_COOLDOWN_MS + 1
    })
    assert.equal(plan.action, 'seek', 'after the window a real drift is corrected again')
  })

  it('a seek already running still owns the element', () => {
    const plan = planPlaybackFollow({
      targetSec: 2,
      elementSec: 1,
      readyState: FUTURE_DATA,
      seeking: true,
      sinceSeekMs: Infinity
    })
    assert.equal(plan.action, 'hold')
    assert.equal(plan.reason, 'seeking')
  })
})

describe('the cooldown never hides a real desync', () => {
  it('a jump far beyond tolerance is corrected immediately, cooldown or not', () => {
    // A scrub, a loop wrap or a clip change moves the timeline by seconds. That
    // is not the drift the cooldown is about: holding there would show the
    // wrong footage. The law must still land on the target at once.
    const plan = planPlaybackFollow({
      targetSec: 20,
      elementSec: 2,
      readyState: PRESENTING,
      seeking: false,
      frozenMs: 0,
      sinceSeekMs: 10
    })
    assert.equal(plan.action, 'seek', 'a multi-second desync is a jump, not drift')
    assert.equal(plan.playheadSec, 20)
  })

  it('drift just over tolerance inside the window is the case being held', () => {
    const justOver = TMCUT_PLAYBACK_DRIFT_TOLERANCE_SEC + 0.001
    const plan = planPlaybackFollow({
      targetSec: 5 + justOver,
      elementSec: 5,
      readyState: PRESENTING,
      seeking: false,
      frozenMs: 0,
      sinceSeekMs: 30
    })
    assert.equal(plan.action, 'hold', 'barely-over drift is what the cycle is made of')
  })

  it('a stall past the budget is still reported, cooldown or not', () => {
    const plan = planPlaybackFollow({
      targetSec: 5,
      elementSec: 5,
      readyState: PRESENTING,
      seeking: false,
      frozenMs: 4000,
      sinceSeekMs: 10
    })
    assert.equal(plan.action, 'stalled', 'the cooldown must not swallow the honest stall report')
  })

  it('no cooldown figure from the caller keeps the old behaviour', () => {
    const plan = planPlaybackFollow({
      targetSec: 1,
      elementSec: 0.5,
      readyState: PRESENTING,
      seeking: false,
      frozenMs: 0
    })
    assert.equal(plan.action, 'seek', 'a host that does not track seeks is unchanged')
  })
})
