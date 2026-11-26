// src/time.mjs
var TICKS_PER_SECOND = 12e4;
function secToTicks(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.round(seconds * TICKS_PER_SECOND);
}
function ticksToSec(ticks) {
  if (!Number.isFinite(ticks) || ticks <= 0) return 0;
  return ticks / TICKS_PER_SECOND;
}
var KNOWN_FRAME_RATES = [
  { numerator: 24, denominator: 1 },
  { numerator: 25, denominator: 1 },
  { numerator: 30, denominator: 1 },
  { numerator: 60, denominator: 1 },
  { numerator: 120, denominator: 1 },
  { numerator: 24e3, denominator: 1001 },
  { numerator: 3e4, denominator: 1001 },
  { numerator: 6e4, denominator: 1001 }
];
function floatEquals(a, b, epsilon = 1e-3) {
  return Math.abs(a - b) < epsilon;
}
function fpsToRational(fps) {
  const value = Number(fps);
  if (!Number.isFinite(value) || value <= 0) return { numerator: 30, denominator: 1 };
  for (const known of KNOWN_FRAME_RATES) {
    if (floatEquals(value, known.numerator / known.denominator)) {
      return { numerator: known.numerator, denominator: known.denominator };
    }
  }
  return { numerator: Math.round(value * 1e3), denominator: 1e3 };
}
function rationalToFloat(rate) {
  if (!rate || !Number.isFinite(rate.numerator) || !Number.isFinite(rate.denominator) || rate.denominator === 0) {
    return 30;
  }
  return rate.numerator / rate.denominator;
}
function ticksPerFrame(rate) {
  const fps = rationalToFloat(rate);
  if (!(fps > 0)) return TICKS_PER_SECOND / 30;
  return TICKS_PER_SECOND / fps;
}
function snapToFrame(ticks, rate) {
  const per = ticksPerFrame(rate);
  if (!(per > 0)) return Math.max(0, Math.round(ticks));
  return Math.max(0, Math.round(ticks / per) * Math.round(per));
}
function ticksToFrames(ticks, rate) {
  const per = ticksPerFrame(rate);
  if (!(per > 0)) return 0;
  return Math.max(0, Math.floor(ticks / per));
}
function formatTimecode(ticks, rate) {
  const safe = Number.isFinite(ticks) && ticks > 0 ? ticks : 0;
  const nominalFps = Math.max(1, Math.round(rationalToFloat(rate)));
  const totalFrames = Math.floor(safe / TICKS_PER_SECOND * nominalFps);
  const ff = totalFrames % nominalFps;
  const totalSeconds = Math.floor(totalFrames / nominalFps);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);
  const pad2 = (n, len = 2) => String(n).padStart(len, "0");
  const base = `${pad2(mm)}:${pad2(ss)}:${pad2(ff)}`;
  return hh > 0 ? `${pad2(hh)}:${base}` : base;
}

// src/clock.mjs
function finiteOr(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function createClock(rate) {
  const per = ticksPerFrame(rate);
  const safePer = per > 0 ? per : 1;
  const frameIndexAt = (ticks) => ticksToFrames(finiteOr(ticks, 0), rate);
  const frameStartAt = (index) => {
    const safe = Math.max(0, Math.floor(finiteOr(index, 0)));
    return Math.max(0, Math.round(safe * safePer));
  };
  return Object.freeze({
    fps: rationalToFloat(rate),
    ticksPerFrame: safePer,
    frameIndexAt,
    frameStartAt,
    nextFrameStart: (ticks) => frameStartAt(frameIndexAt(ticks) + 1),
    snap: (ticks) => snapToFrame(finiteOr(ticks, 0), rate),
    /** Start ticks of every frame in the half-open span [startTick, endTick). */
    frameStarts: (startTick, endTick) => {
      const start = Math.max(0, finiteOr(startTick, 0));
      const end = finiteOr(endTick, 0);
      if (!(end > start)) return [];
      const first = Math.ceil(start / safePer);
      const last = Math.ceil(end / safePer);
      const starts = [];
      for (let index = first; index < last; index++) starts.push(Math.round(index * safePer));
      return starts;
    },
    /** Frames needed to cover a duration (ceil, so a partial frame counts). */
    durationFrames: (durationTicks2) => Math.ceil(Math.max(0, finiteOr(durationTicks2, 0)) / safePer)
  });
}

// src/pace.mjs
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function wholeFrames(value) {
  return Math.max(0, Math.floor(isFiniteNumber(value) ? value : 0));
}
function createFramePace(clock) {
  const usable = clock && typeof clock.frameIndexAt === "function" && typeof clock.frameStartAt === "function";
  if (!usable) {
    throw new TypeError("createFramePace needs a clock from createClock(rate)");
  }
  let armed = false;
  let anchorMs = 0;
  let anchorFrame = 0;
  let anchorRate = 0;
  let lastFrame = 0;
  function landOn(frame) {
    const safe = wholeFrames(frame);
    return Object.freeze({ frame: safe, startTicks: clock.frameStartAt(safe) });
  }
  function arm(timestamp, rate, frame) {
    armed = true;
    anchorMs = timestamp;
    anchorRate = rate;
    anchorFrame = frame;
    lastFrame = frame;
  }
  function at(timestampMs, rate, currentFrame) {
    const position = wholeFrames(currentFrame);
    const timestamp = isFiniteNumber(timestampMs) ? timestampMs : 0;
    const factor = isFiniteNumber(rate) ? rate : 1;
    if (!armed || factor !== anchorRate || position !== lastFrame) {
      arm(timestamp, factor, position);
      return landOn(position);
    }
    const elapsedTicks = Math.round(Math.max(0, timestamp - anchorMs) * (TICKS_PER_SECOND / 1e3));
    const advanced = clock.frameIndexAt(elapsedTicks * Math.abs(factor));
    const next = anchorFrame + (factor < 0 ? -advanced : advanced);
    lastFrame = Math.max(0, next);
    return landOn(next);
  }
  return Object.freeze({
    at,
    /** Forget the anchor: the next call starts a fresh segment at the frame it is given. */
    reset() {
      armed = false;
      anchorMs = 0;
      anchorFrame = 0;
      anchorRate = 0;
      lastFrame = 0;
    }
  });
}

// src/playback.mjs
var TMCUT_PLAYBACK_PRESENTING_READY_STATE = 3;
var TMCUT_PLAYBACK_DRIFT_TOLERANCE_SEC = 0.3;
var TMCUT_PLAYBACK_STALL_LIMIT_MS = 3e3;
var TMCUT_PLAYBACK_SEEK_COOLDOWN_MS = 250;
var TMCUT_PLAYBACK_JUMP_SEC = 1;
function planPlaybackFollow(input = {}) {
  const target = finiteOr0(input.targetSec);
  const element = Math.max(0, finiteOr0(input.elementSec));
  const readyState = Number.isFinite(input.readyState) ? Number(input.readyState) : 0;
  const tolerance = Math.max(0, Number.isFinite(input.toleranceSec) ? Number(input.toleranceSec) : TMCUT_PLAYBACK_DRIFT_TOLERANCE_SEC);
  const stallLimit = Math.max(0, Number.isFinite(input.stallLimitMs) ? Number(input.stallLimitMs) : TMCUT_PLAYBACK_STALL_LIMIT_MS);
  const frozenMs = Math.max(0, finiteOr0(input.frozenMs));
  const cooldown = Math.max(0, Number.isFinite(input.seekCooldownMs) ? Number(input.seekCooldownMs) : TMCUT_PLAYBACK_SEEK_COOLDOWN_MS);
  const jump = Math.max(0, Number.isFinite(input.jumpSec) ? Number(input.jumpSec) : TMCUT_PLAYBACK_JUMP_SEC);
  const sinceSeekMs = Number.isFinite(input.sinceSeekMs) ? Number(input.sinceSeekMs) : Infinity;
  if (frozenMs >= stallLimit) {
    return plan("stalled", element, "frozen-past-budget");
  }
  if (input.seeking === true) return plan("hold", element, "seeking");
  if (readyState < TMCUT_PLAYBACK_PRESENTING_READY_STATE) {
    return plan("hold", element, "no-future-data");
  }
  const drift = Math.abs(element - target);
  if (drift > tolerance) {
    if (drift <= jump && sinceSeekMs < cooldown) {
      return plan("hold", element, "seek-cooldown");
    }
    return plan("seek", target, "drift");
  }
  return plan("follow", target, "in-sync");
}
function plan(action, playheadSec, reason) {
  return Object.freeze({ action, playheadSec, reason });
}
function finiteOr0(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

// src/keyframes.mjs
var KEYFRAME_EASINGS = ["linear", "ease-in", "ease-out", "ease-in-out", "step"];
function isValidNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}
function sortedFor(clip, prop) {
  const list = Array.isArray(clip?.keyframes) ? clip.keyframes : [];
  return list.filter((k) => k && k.prop === prop && isValidNumber(k.t) && isValidNumber(k.value)).slice().sort((a, b) => a.t - b.t);
}
function easedU(easing, u) {
  if (easing === "ease-in") return u * u;
  if (easing === "ease-out") return 1 - (1 - u) * (1 - u);
  if (easing === "ease-in-out") return u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
  return u;
}
function evalKeyframe(clip, prop, atTicks) {
  const kf = sortedFor(clip, prop);
  if (kf.length === 0 || !isValidNumber(atTicks)) return void 0;
  if (atTicks <= kf[0].t) return kf[0].value;
  const last = kf[kf.length - 1];
  if (atTicks >= last.t) return last.value;
  let i = 0;
  while (i + 1 < kf.length && kf[i + 1].t <= atTicks) i++;
  const a = kf[i];
  const b = kf[i + 1];
  const span = b.t - a.t;
  if (span <= 0 || atTicks === a.t) return a.value;
  if (a.easing === "step") return a.value;
  const u = (atTicks - a.t) / span;
  return a.value + (b.value - a.value) * easedU(a.easing, u);
}
function keyframeAt(clip, prop, atTicks, toleranceTicks = 0) {
  if (!Array.isArray(clip?.keyframes) || !isValidNumber(atTicks)) return null;
  const tol = Math.max(0, isValidNumber(toleranceTicks) ? toleranceTicks : 0);
  let best = null;
  let bestDist = Infinity;
  for (const k of clip.keyframes) {
    if (!k || k.prop !== prop || !isValidNumber(k.t)) continue;
    const d = Math.abs(k.t - atTicks);
    if (d <= tol && d < bestDist) {
      best = k;
      bestDist = d;
    }
  }
  return best;
}
function setKeyframe(clip, prop, atTicks, value, easing) {
  if (!clip || !prop || !isValidNumber(atTicks) || !isValidNumber(value)) return null;
  if (!Array.isArray(clip.keyframes)) clip.keyframes = [];
  const existing = clip.keyframes.find((k) => k && k.prop === prop && k.t === atTicks);
  if (existing) {
    existing.value = value;
    if (easing !== void 0) existing.easing = easing;
    return existing;
  }
  const kf = { t: atTicks, prop, value };
  if (easing !== void 0) kf.easing = easing;
  clip.keyframes.push(kf);
  clip.keyframes.sort((a, b) => (a?.t ?? 0) - (b?.t ?? 0));
  return kf;
}
function removeKeyframe(clip, prop, atTicks, toleranceTicks = 0) {
  const hit = keyframeAt(clip, prop, atTicks, toleranceTicks);
  if (!hit) return false;
  const idx = clip.keyframes.indexOf(hit);
  clip.keyframes.splice(idx, 1);
  return true;
}
function propsWithKeyframes(clip) {
  const list = Array.isArray(clip?.keyframes) ? clip.keyframes : [];
  const props = [];
  for (const k of list) {
    if (k && k.prop && !props.includes(k.prop)) props.push(k.prop);
  }
  return props;
}
function keyframeTimes(clip, prop) {
  return sortedFor(clip, prop).map((k) => k.t);
}

// src/audio.mjs
function isFiniteNumber2(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function durationTicks(clip) {
  const direct = clip?.timeline?.duration;
  if (isFiniteNumber2(direct) && direct > 0) return direct;
  if (isFiniteNumber2(clip?.in) && isFiniteNumber2(clip?.out) && clip.out > clip.in) {
    const speed2 = isFiniteNumber2(clip?.speed) && clip.speed > 0 ? clip.speed : 1;
    return Math.max(1, Math.round(secToTicks((clip.out - clip.in) / speed2)));
  }
  const sourceIn = clip?.source?.in ?? 0;
  const sourceOut = clip?.source?.out ?? sourceIn;
  const speed = isFiniteNumber2(clip?.speed) && clip.speed > 0 ? clip.speed : 1;
  return Math.max(1, Math.round((Math.max(sourceOut, sourceIn + 1) - sourceIn) / speed));
}
function fadeDuration(clip, edge) {
  if (!clip || typeof clip !== "object" || edge !== "in" && edge !== "out") return 0;
  const raw = edge === "in" ? clip.fade?.in : clip.fade?.out;
  if (!isFiniteNumber2(raw) || raw <= 0) return 0;
  return Math.min(raw, Math.floor(durationTicks(clip) / 2));
}
function gainAt(clip, atTicks) {
  if (!clip || typeof clip !== "object") return 0;
  const duration = durationTicks(clip);
  const at = Math.min(Math.max(0, isFiniteNumber2(atTicks) ? atTicks : 0), duration);
  const volumeRaw = isFiniteNumber2(clip.volume) ? clip.volume : 100;
  const volume = Math.min(1, Math.max(0, volumeRaw / 100));
  const fadeIn = fadeDuration(clip, "in");
  const fadeOut = fadeDuration(clip, "out");
  let envelope = 1;
  if (fadeIn > 0 && at < fadeIn) envelope = at / fadeIn;
  if (fadeOut > 0 && at > duration - fadeOut) {
    envelope = Math.min(envelope, (duration - at) / fadeOut);
  }
  return volume * envelope;
}
function isTrackMuted(track) {
  return !!track?.muted;
}

// src/retime.mjs
var MIN_SPAN_TICKS = TICKS_PER_SECOND / 5;
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function finiteOr2(v, fallback) {
  return Number.isFinite(v) ? v : fallback;
}
function validateSpeed(speed) {
  const v = Number(speed);
  if (!Number.isFinite(v)) return 1;
  return v < 0.01 ? 0.01 : v;
}
function isRetimed(clip) {
  if (!clip) return false;
  return validateSpeed(clip.speed ?? 1) !== 1 || !!clip.reverse;
}
function timelineToSource(clip, atTicks) {
  const speed = validateSpeed(clip?.speed);
  const inT = finiteOr2(clip?.in, 0);
  const outT = finiteOr2(clip?.out, 0);
  const lo = Math.min(inT, outT);
  const hi = Math.max(inT, outT);
  const duration = Math.max(0, (outT - inT) / speed);
  const t = clamp(Number.isFinite(atTicks) ? atTicks : 0, 0, duration);
  const src = clip?.reverse ? outT - t * speed : inT + t * speed;
  return clamp(src, lo, hi);
}
function sourceToTimeline(clip, sourceTicks) {
  const speed = validateSpeed(clip?.speed);
  const inT = finiteOr2(clip?.in, 0);
  const outT = finiteOr2(clip?.out, 0);
  const duration = Math.max(0, (outT - inT) / speed);
  const s = clamp(Number.isFinite(sourceTicks) ? sourceTicks : 0, Math.min(inT, outT), Math.max(inT, outT));
  const t = clip?.reverse ? (outT - s) / speed : (s - inT) / speed;
  return clamp(t, 0, duration);
}
function withSpeed(clip, speed) {
  const next = { ...clip || {}, speed: validateSpeed(speed) };
  const inT = finiteOr2(next.in, 0);
  if (!Number.isFinite(next.out) || next.out < inT + MIN_SPAN_TICKS) {
    next.out = inT + MIN_SPAN_TICKS;
  }
  return next;
}
function isRamped(clip) {
  const pts = Array.isArray(clip?.speedPoints) ? clip.speedPoints : [];
  return pts.filter((p) => p && Number.isFinite(p.t) && Number.isFinite(p.speed)).length >= 2;
}
var ELEMENT_RATE_MIN = 0.25;
var ELEMENT_RATE_MAX = 16;
function clampedElementRate(rate, shuttle = 1) {
  const base = Number(rate);
  const clock = Number(shuttle);
  const composed = Number.isFinite(base) ? base : 1;
  const factor = Number.isFinite(clock) && clock !== 0 ? Math.abs(clock) : 1;
  return Math.min(ELEMENT_RATE_MAX, Math.max(ELEMENT_RATE_MIN, composed * factor));
}
function elementRate(clip, atTicks, shuttle = 1) {
  return clampedElementRate(speedAt(clip, atTicks), shuttle);
}
function sortedPoints(clip) {
  return (Array.isArray(clip?.speedPoints) ? clip.speedPoints : []).filter((p) => p && Number.isFinite(p.t) && Number.isFinite(p.speed)).map((p) => ({ t: p.t, speed: p.speed < 0.01 ? 0.01 : p.speed })).sort((a, b) => a.t - b.t);
}
function speedAt(clip, atTicks) {
  const pts = sortedPoints(clip);
  if (pts.length < 2) return validateSpeed(clip?.speed);
  const at = Number.isFinite(atTicks) ? atTicks : 0;
  if (at <= pts[0].t) return pts[0].speed;
  const last = pts[pts.length - 1];
  if (at >= last.t) return last.speed;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (at >= a.t && at <= b.t) {
      const span = b.t - a.t;
      if (span <= 0) return a.speed;
      const u = (at - a.t) / span;
      return a.speed + (b.speed - a.speed) * u;
    }
  }
  return validateSpeed(clip?.speed);
}
function rampIntegral(clip, toTicks) {
  const pts = sortedPoints(clip);
  if (pts.length < 2) return validateSpeed(clip?.speed) * Math.max(0, Number(toTicks) || 0);
  const at = Math.max(0, Number.isFinite(toTicks) ? toTicks : 0);
  if (at <= pts[0].t) return pts[0].speed * at;
  let acc = pts[0].speed * pts[0].t;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (at >= b.t) {
      acc += (a.speed + b.speed) / 2 * (b.t - a.t);
    } else {
      const span = b.t - a.t;
      const u = span > 0 ? (at - a.t) / span : 0;
      const sAt = a.speed + (b.speed - a.speed) * u;
      acc += (a.speed + sAt) / 2 * (at - a.t);
      return acc;
    }
  }
  acc += pts[pts.length - 1].speed * (at - pts[pts.length - 1].t);
  return acc;
}
function rampTimelineToSource(clip, atTicks) {
  const inT = finiteOr2(clip?.in, 0);
  const outT = finiteOr2(clip?.out, 0);
  const lo = Math.min(inT, outT);
  const hi = Math.max(inT, outT);
  if (!isRamped(clip)) return timelineToSource(clip, atTicks);
  const consumed = rampIntegral(clip, atTicks);
  const src = clip?.reverse ? outT - consumed : inT + consumed;
  return clamp(src, lo, hi);
}
function splitSpeedPoints(points, cutTicks) {
  const pts = (Array.isArray(points) ? points : []).filter((p) => p && Number.isFinite(p.t) && Number.isFinite(p.speed)).map((p) => ({ t: p.t, speed: p.speed < 0.01 ? 0.01 : p.speed })).sort((a, b) => a.t - b.t);
  if (pts.length < 2) return { head: [], tail: [] };
  const cut = Number.isFinite(cutTicks) ? Math.max(0, cutTicks) : 0;
  const atCut = speedAt({ speedPoints: pts }, cut);
  const head = pts.filter((p) => p.t < cut).map((p) => ({ t: p.t, speed: p.speed }));
  head.push({ t: cut, speed: atCut });
  const tail = [{ t: 0, speed: atCut }];
  for (const p of pts) {
    if (p.t > cut) tail.push({ t: p.t - cut, speed: p.speed });
  }
  return { head, tail };
}
function splitRamp(clip, elapsedTicks) {
  const speed = validateSpeed(clip?.speed);
  const inT = finiteOr2(clip?.in, 0);
  const outT = finiteOr2(clip?.out, 0);
  const lo = Math.min(inT, outT);
  const hi = Math.max(inT, outT);
  const span = hi - lo;
  const rev = clip?.reverse === true;
  if (span < 2) {
    const flat = { in: lo, out: hi, speed, speedPoints: null };
    return { boundary: lo, consumed: 0, head: { ...flat }, tail: { ...flat } };
  }
  const duration = span / speed;
  const elapsed = clamp(Number.isFinite(elapsedTicks) ? elapsedTicks : 0, 0, duration);
  const headTicks = Math.max(1, Math.round(elapsed));
  const tailTicks = Math.max(1, Math.round(duration - elapsed));
  const consumed = clamp(rampIntegral(clip, elapsed), 0, span);
  const cut = Math.round(clamp(rev ? hi - consumed : lo + consumed, lo + 1, hi - 1));
  const split = splitSpeedPoints(clip?.speedPoints, elapsed);
  const ramped = isRamped(clip);
  const half = (from, to, ticks, curve) => ({
    in: from,
    out: to,
    speed: ramped ? validateSpeed(Math.max(1, to - from) / ticks) : speed,
    speedPoints: curve.length >= 2 ? curve : null
  });
  return {
    boundary: cut,
    consumed,
    head: rev ? half(cut, hi, headTicks, split.head) : half(lo, cut, headTicks, split.head),
    tail: rev ? half(lo, cut, tailTicks, split.tail) : half(cut, hi, tailTicks, split.tail)
  };
}
function rampElapsedForConsumed(clip, consumedTicks) {
  const speed = validateSpeed(clip?.speed);
  const want = Math.max(0, Number(consumedTicks) || 0);
  const pts = sortedPoints(clip);
  if (pts.length < 2) return want / speed;
  if (want <= pts[0].speed * pts[0].t) return want / pts[0].speed;
  let acc = pts[0].speed * pts[0].t;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const width = b.t - a.t;
    const area = (a.speed + b.speed) / 2 * width;
    if (want > acc + area) {
      acc += area;
      continue;
    }
    if (width <= 0) return b.t;
    const rem = want - acc;
    const k = (b.speed - a.speed) / width;
    const root = Math.sqrt(Math.max(0, a.speed * a.speed + 2 * k * rem));
    return a.t + 2 * rem / (a.speed + root);
  }
  const last = pts[pts.length - 1];
  return last.t + (want - acc) / last.speed;
}
function trimRamp(clip, edge, targetTicks) {
  const speed = validateSpeed(clip?.speed);
  const inT = finiteOr2(clip?.in, 0);
  const outT = finiteOr2(clip?.out, 0);
  const lo = Math.min(inT, outT);
  const hi = Math.max(inT, outT);
  const span = hi - lo;
  if (span < 2) return { in: lo, out: hi, speed, speedPoints: null, shiftTicks: 0 };
  const cut = clamp(Math.round(Number(targetTicks) || 0), lo + 1, hi - 1);
  const kept = edge === "in" ? hi - cut : cut - lo;
  const trimsFront = clip?.reverse === true ? edge === "out" : edge === "in";
  const elapsed = clamp(rampElapsedForConsumed(clip, trimsFront ? span - kept : kept), 1, span);
  const map = splitRamp(clip, elapsed);
  const half = trimsFront ? map.tail : map.head;
  return { ...half, shiftTicks: trimsFront ? Math.max(0, Math.round(elapsed)) : 0 };
}
var SPEED_RAMP_PRESETS = ["ease-in", "ease-out", "mountain", "valley"];
function buildRampPreset(kind, durationTicks2, baseSpeed = 1) {
  const d = Math.max(TICKS_PER_SECOND / 5, Number(durationTicks2) || 0);
  const b = Math.max(0.01, Number(baseSpeed) || 1);
  const p = (t, mul) => ({ t: Math.round(t), speed: Number(Math.max(0.01, b * mul).toFixed(4)) });
  switch (kind) {
    case "ease-in":
      return [p(0, 0.5), p(d, 1.5)];
    case "ease-out":
      return [p(0, 1.5), p(d, 0.5)];
    case "mountain":
      return [p(0, 0.5), p(d / 2, 1.5), p(d, 0.5)];
    case "valley":
      return [p(0, 1.5), p(d / 2, 0.5), p(d, 1.5)];
    default:
      return [];
  }
}

// src/canvas.mjs
var TMUTCANVAS_PRESETS = [
  { id: "16:9", width: 1920, height: 1080, orientation: "landscape", icon: "i-lucide-tv" },
  { id: "9:16", width: 1080, height: 1920, orientation: "portrait", icon: "i-lucide-smartphone" },
  { id: "1:1", width: 1080, height: 1080, orientation: "square", icon: "i-lucide-square" },
  { id: "4:5", width: 1080, height: 1350, orientation: "portrait", icon: "i-lucide-rectangle-vertical" },
  { id: "4:3", width: 1440, height: 1080, orientation: "landscape", icon: "i-lucide-proportions" },
  { id: "21:9", width: 2560, height: 1080, orientation: "landscape", icon: "i-lucide-monitor" }
];
var TMUTCUT_SOCIAL_PRESETS = [
  { id: "youtube", presetId: "16:9", icon: "i-lucide-tv" },
  { id: "youtube-shorts", presetId: "9:16", icon: "i-lucide-smartphone" },
  { id: "tiktok", presetId: "9:16", icon: "i-simple-icons-tiktok" },
  { id: "instagram-reels", presetId: "9:16", icon: "i-simple-icons-instagram" },
  { id: "instagram-feed", presetId: "4:5", icon: "i-simple-icons-instagram" },
  { id: "facebook", presetId: "16:9", icon: "i-simple-icons-facebook" }
];
var TMUTCUT_FIT_MODES = ["fit", "fill", "crop", "stretch", "smart"];
function gcd(a, b) {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y > 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}
function aspectValue(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return 0;
  const divisor = gcd(width, height);
  return width / divisor / (height / divisor);
}
function orientationOf(width, height) {
  if (!width || !height || width <= 0 || height <= 0) return "landscape";
  if (width > height) return "landscape";
  if (width < height) return "portrait";
  return "square";
}
function findCanvasPreset(id) {
  return TMUTCANVAS_PRESETS.find((preset) => preset.id === id) ?? null;
}
function findCanvasPresetByDimensions(width, height) {
  return TMUTCANVAS_PRESETS.find((preset) => preset.width === Math.round(width) && preset.height === Math.round(height)) ?? null;
}
function ratioIdOf(width, height) {
  const preset = findCanvasPresetByDimensions(width, height);
  return preset ? preset.id : `${width}x${height}`;
}
function ratioLabel(width, height) {
  return ratioIdOf(width, height);
}
function normalizeCanvas(canvas) {
  const width = Math.round(canvas?.width && canvas.width > 0 ? canvas.width : 1920);
  const height = Math.round(canvas?.height && canvas.height > 0 ? canvas.height : 1080);
  const fpsInput = canvas?.fps;
  const fps = fpsInput && typeof fpsInput === "object" ? fpsInput : fpsToRational(typeof fpsInput === "number" && fpsInput > 0 ? fpsInput : 30);
  const aspectRatio = canvas?.aspectRatio?.id ? {
    id: canvas.aspectRatio.id,
    value: canvas.aspectRatio.value || aspectValue(width, height),
    orientation: canvas.aspectRatio.orientation || orientationOf(width, height)
  } : {
    id: ratioIdOf(width, height),
    value: aspectValue(width, height),
    orientation: orientationOf(width, height)
  };
  const background = canvas?.background?.type ? canvas.background.value !== void 0 ? { type: canvas.background.type, value: canvas.background.value } : { type: canvas.background.type } : { type: "color", value: "#000000" };
  return { width, height, fps, aspectRatio, background };
}
function clamp01(value) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}
function resolveClipLayout(clip) {
  return {
    fit: typeof clip?.fit === "string" && clip.fit ? clip.fit : "fit",
    focusX: clamp01(clip?.focusX),
    focusY: clamp01(clip?.focusY),
    cropRect: clip?.cropRect ?? null
  };
}
function computeFitObjectStyle(mode, focusX = 0.5, focusY = 0.5, cropRect) {
  if (mode === "fill") return { objectFit: "cover", objectPosition: "50% 50%" };
  if (mode === "stretch") return { objectFit: "fill", objectPosition: "50% 50%" };
  if (mode === "smart") {
    const fx = Math.round(clamp01(focusX) * 100);
    const fy = Math.round(clamp01(focusY) * 100);
    return { objectFit: "cover", objectPosition: `${fx}% ${fy}%` };
  }
  if (mode === "crop" && cropRect) {
    const w = clamp01(cropRect.w);
    const h = clamp01(cropRect.h);
    const cx = clamp01(cropRect.x) + w / 2;
    const cy = clamp01(cropRect.y) + h / 2;
    return { objectFit: "cover", objectPosition: `${Math.round(cx * 100)}% ${Math.round(cy * 100)}%` };
  }
  return { objectFit: "contain", objectPosition: "50% 50%" };
}
function reframeTransform(x, y, fromW, fromH, toW, toH) {
  if (!fromW || !fromH || !toW || !toH) return { x, y };
  return {
    x: Math.round((x || 0) * (toW / fromW)),
    y: Math.round((y || 0) * (toH / fromH))
  };
}
function previewScale(containerWidth, canvasWidth) {
  if (!Number.isFinite(containerWidth) || !Number.isFinite(canvasWidth) || canvasWidth <= 0 || containerWidth <= 0) return 1;
  return containerWidth / canvasWidth;
}
var ACTION_SAFE = 0.9;
var TITLE_SAFE = 0.8;
function centeredRect(fraction) {
  const inset = Number(((1 - fraction) / 2).toFixed(6));
  return { x: inset, y: inset, w: fraction, h: fraction };
}
function safeAreaRects(canvas) {
  const width = canvas?.width;
  const height = canvas?.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    const zero = { x: 0, y: 0, w: 0, h: 0 };
    return { actionSafe: zero, titleSafe: zero };
  }
  return {
    actionSafe: centeredRect(ACTION_SAFE),
    titleSafe: centeredRect(TITLE_SAFE)
  };
}
var SAFE_AREA_PRESETS = [
  { id: "16-9", label: "16:9", ratio: 16 / 9 },
  { id: "9-16", label: "9:16", ratio: 9 / 16 },
  { id: "1-1", label: "1:1", ratio: 1 },
  { id: "4-5", label: "4:5", ratio: 4 / 5 },
  { id: "4-3", label: "4:3", ratio: 4 / 3 },
  { id: "3-4", label: "3:4", ratio: 3 / 4 },
  { id: "21-9", label: "21:9", ratio: 21 / 9 }
];
var CROP_RATIO_PRESETS = [
  { id: "free", label: "Free", ratio: null },
  { id: "16-9", label: "16:9", ratio: 16 / 9 },
  { id: "9-16", label: "9:16", ratio: 9 / 16 },
  { id: "1-1", label: "1:1", ratio: 1 },
  { id: "4-3", label: "4:3", ratio: 4 / 3 },
  { id: "3-4", label: "3:4", ratio: 3 / 4 },
  { id: "21-9", label: "21:9", ratio: 21 / 9 }
];
function clampCropRect(rect, minSize = 0.05) {
  if (!rect || typeof rect !== "object") {
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  const minS = Math.max(0.01, Math.min(1, minSize));
  const rawW = Number.isFinite(rect.w) ? rect.w : 1;
  const rawH = Number.isFinite(rect.h) ? rect.h : 1;
  const w = Math.min(1, Math.max(minS, rawW));
  const h = Math.min(1, Math.max(minS, rawH));
  const rawX = Number.isFinite(rect.x) ? rect.x : 0;
  const rawY = Number.isFinite(rect.y) ? rect.y : 0;
  const x = Math.max(0, Math.min(1 - w, rawX));
  const y = Math.max(0, Math.min(1 - h, rawY));
  return {
    x: Math.round(x * 1e4) / 1e4,
    y: Math.round(y * 1e4) / 1e4,
    w: Math.round(w * 1e4) / 1e4,
    h: Math.round(h * 1e4) / 1e4
  };
}
function applyCropRatio(rect, ratio, sourceW = 1920, sourceH = 1080) {
  const current = clampCropRect(rect);
  if (!ratio || ratio <= 0 || !Number.isFinite(ratio)) {
    return current;
  }
  const sw = Math.max(1, Number.isFinite(sourceW) && sourceW > 0 ? sourceW : 1920);
  const sh = Math.max(1, Number.isFinite(sourceH) && sourceH > 0 ? sourceH : 1080);
  const sourceAspect = sw / sh;
  const targetNormRatio = ratio / sourceAspect;
  let newW = current.w;
  let newH = current.h;
  if (newW / newH > targetNormRatio) {
    newW = newH * targetNormRatio;
  } else {
    newH = newW / targetNormRatio;
  }
  if (newW > 1) {
    newW = 1;
    newH = 1 / targetNormRatio;
  }
  if (newH > 1) {
    newH = 1;
    newW = targetNormRatio;
  }
  const cx = current.x + current.w / 2;
  const cy = current.y + current.h / 2;
  const newX = cx - newW / 2;
  const newY = cy - newH / 2;
  return clampCropRect({ x: newX, y: newY, w: newW, h: newH });
}

// src/mask.mjs
var TMUTCUT_MASK_SHAPES = ["rectangle", "circle", "linear"];
var num = (v, fallback) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
var clamp2 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function normalizeMask(mask) {
  if (!mask || !TMUTCUT_MASK_SHAPES.includes(mask.shape)) return null;
  return {
    shape: mask.shape,
    x: clamp2(num(mask.x, 0), 0, 1),
    y: clamp2(num(mask.y, 0), 0, 1),
    w: clamp2(num(mask.w, 1), 1e-3, 1),
    h: clamp2(num(mask.h, 1), 1e-3, 1),
    feather: clamp2(num(mask.feather, 0), 0, 100),
    rotation: clamp2(num(mask.rotation, 0), -180, 180),
    invert: !!mask.invert,
    axis: mask.axis === "y" ? "y" : "x"
  };
}
var fmt = (n) => String(Number(n.toFixed(6)));
function geometry(m) {
  return {
    cx: m.x + m.w / 2,
    cy: m.y + m.h / 2,
    hw: Math.max(5e-4, m.w / 2),
    hh: Math.max(5e-4, m.h / 2)
  };
}
function maskCssMaskImage(mask, wPx = 100, hPx = 100) {
  const m = normalizeMask(mask);
  if (!m) return null;
  const W = Math.max(1, Math.round(wPx));
  const H = Math.max(1, Math.round(hPx));
  const { cx, cy, hw, hh } = geometry(m);
  const px = cx * W;
  const py = cy * H;
  const rx = hw * W;
  const ry = hh * H;
  const rot = m.rotation ? ` transform="rotate(${fmt(m.rotation)} ${fmt(px)} ${fmt(py)})"` : "";
  const blurStd = m.feather / 100 * Math.max(rx, ry, 1);
  const filter = m.feather > 0 ? `<filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${fmt(blurStd)}"/></filter>` : "";
  const filterAttr = m.feather > 0 ? ' filter="url(#f)"' : "";
  let shapeMarkup;
  if (m.shape === "linear") {
    const f = Math.max(0.02, m.feather / 100);
    const mid = m.axis === "y" ? py : px;
    const half = m.axis === "y" ? ry : rx;
    const s0 = mid - half * f;
    const s1 = mid + half * f;
    const coords = m.axis === "y" ? `x1="0" y1="${fmt(s0)}" x2="0" y2="${fmt(s1)}"` : `x1="${fmt(s0)}" y1="0" x2="${fmt(s1)}" y2="0"`;
    const stops = m.invert ? '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/>' : '<stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>';
    shapeMarkup = `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" ${coords}>${stops}</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;
  } else {
    const shapeEl = m.shape === "rectangle" ? `<rect x="${fmt(px - rx)}" y="${fmt(py - ry)}" width="${fmt(rx * 2)}" height="${fmt(ry * 2)}" fill="#fff"${rot}/>` : `<ellipse cx="${fmt(px)}" cy="${fmt(py)}" rx="${fmt(rx)}" ry="${fmt(ry)}" fill="#fff"${rot}/>`;
    shapeMarkup = m.invert ? `<mask id="m"><rect width="${W}" height="${H}" fill="#fff"/>${shapeEl.replace('fill="#fff"', 'fill="#000"')}</mask><rect width="${W}" height="${H}" fill="#fff" mask="url(#m)"/>` : shapeEl;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${filter ? `<defs>${filter}</defs>` : ""}<g${filterAttr}>${shapeMarkup}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// src/textStyle.mjs
var DEFAULT_TEXT_FONT_SIZE = 36;
var DEFAULT_TEXT_COLOR = "#ffffff";
function textStrokeWidth(fontSize) {
  return Math.max(1, Math.round(fontSize / 18));
}
function textShadowOffset(fontSize) {
  return Math.max(1, Math.round(fontSize / 14));
}
function textBoxPadding(fontSize) {
  return Math.max(2, Math.round(fontSize * 0.25));
}

// src/timeline.mjs
var clipCounter = 0;
var trackCounter = 0;
function nextClipId() {
  clipCounter += 1;
  return `clip_${Date.now().toString(36)}_${clipCounter.toString(36)}`;
}
function nextTrackId(type) {
  trackCounter += 1;
  return `t-${type}-${Date.now().toString(36)}${trackCounter.toString(36)}`;
}
function isFiniteNumber3(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function clipDurationTicks(clip) {
  const speed = isFiniteNumber3(clip.speed) && clip.speed > 0 ? clip.speed : 1;
  const span = (clip.source?.out ?? 0) - (clip.source?.in ?? 0);
  return Math.max(0, Math.round(span / speed));
}
function clipEndTicks(clip) {
  const start = clip.timeline?.start ?? 0;
  return start + clipDurationTicks(clip);
}
function speedOf(clip) {
  return isFiniteNumber3(clip?.speed) && clip.speed > 0 ? clip.speed : 1;
}
function clipSpan(clip) {
  if (clip?.timeline) {
    const start = isFiniteNumber3(clip.timeline.start) ? clip.timeline.start : 0;
    const duration = Math.max(0, isFiniteNumber3(clip.timeline.duration) ? clip.timeline.duration : 0);
    return { start, duration, end: start + duration };
  }
  if (isFiniteNumber3(clip?.in) || isFiniteNumber3(clip?.out) || isFiniteNumber3(clip?.offset)) {
    const start = Math.max(0, Math.round(isFiniteNumber3(clip.offset) ? clip.offset : 0));
    const span = (isFiniteNumber3(clip.out) ? clip.out : 0) - (isFiniteNumber3(clip.in) ? clip.in : 0);
    const duration = Math.max(0, Math.round(span / speedOf(clip)));
    return { start, duration, end: start + duration };
  }
  return { start: 0, duration: 0, end: 0 };
}
function totalDurationTicks(timeline) {
  let max = 0;
  for (const track of timeline?.tracks ?? []) {
    for (const item of track.items ?? []) {
      const end = clipEndTicks(item);
      if (end > max) max = end;
    }
  }
  return max;
}
function findClip(timeline, clipId) {
  for (const track of timeline?.tracks ?? []) {
    const index = (track.items ?? []).findIndex((item) => item.id === clipId);
    if (index !== -1) return { track, index, clip: track.items[index] };
  }
  return null;
}
function findTrack(timeline, trackId) {
  return (timeline?.tracks ?? []).find((track) => track.id === trackId) ?? null;
}
function ensureTrack(timeline, trackType, name) {
  if (!timeline || !Array.isArray(timeline.tracks)) {
    throw new Error("timeline.tracks must be an array");
  }
  let track = timeline.tracks.find((t) => t.type === trackType);
  if (!track) {
    track = { id: nextTrackId(trackType), type: trackType, name: name ?? trackType, items: [] };
    timeline.tracks.push(track);
  }
  return track;
}
function nextTrackName(timeline, trackType) {
  const label = { video: "Video", text: "Text", audio: "Audio" }[trackType] ?? "Track";
  let numbered = 0;
  let total = 0;
  for (const track of timeline?.tracks ?? []) {
    if (track.type !== trackType) continue;
    total += 1;
    const match = /\s(\d+)$/.exec(track.name ?? "");
    if (match) numbered = Math.max(numbered, Number(match[1]));
  }
  return `${label} ${Math.max(numbered, total) + 1}`;
}
function addTrack(timeline, trackType, name) {
  if (!timeline || !Array.isArray(timeline.tracks)) {
    throw new Error("timeline.tracks must be an array");
  }
  const track = {
    id: nextTrackId(trackType),
    type: trackType,
    name: name ?? nextTrackName(timeline, trackType),
    items: []
  };
  timeline.tracks.push(track);
  return track;
}
function removeTrack(timeline, trackId, options = {}) {
  const tracks = timeline?.tracks ?? [];
  const index = tracks.findIndex((track2) => track2.id === trackId);
  if (index === -1) return false;
  const track = tracks[index];
  if (track.locked) return false;
  if (options.keepClips && (track.items ?? []).length > 0) {
    const target = tracks.find((other, otherIndex) => otherIndex !== index && other.type === track.type);
    if (!target) return false;
    target.items.push(...track.items);
  }
  tracks.splice(index, 1);
  return true;
}
function defaultTransform() {
  return { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 };
}
function addClip(timeline, trackType, partial = {}) {
  const track = ensureTrack(timeline, trackType);
  if (track.locked) return null;
  const sourceIn = Math.max(0, Math.round(partial.source?.in ?? partial.in ?? 0));
  const fallbackOut = trackType === "text" ? 4 * TICKS_PER_SECOND : 5 * TICKS_PER_SECOND;
  const sourceOut = Math.round(partial.source?.out ?? partial.out ?? fallbackOut);
  const speed = isFiniteNumber3(partial.speed) && partial.speed > 0 ? partial.speed : 1;
  const duration = Math.max(1, Math.round((Math.max(sourceOut, sourceIn + 1) - sourceIn) / speed));
  let start = partial.timeline?.start ?? partial.offset;
  if (!isFiniteNumber3(start)) {
    start = track.items.reduce((max, item) => Math.max(max, clipEndTicks(item)), 0);
  }
  const clip = {
    id: partial.id ?? nextClipId(),
    type: trackType,
    name: partial.name ?? "Clip",
    assetId: partial.assetId ?? null,
    locator: partial.locator ?? (partial.src ? { runtime: "electron", path: partial.src } : null),
    source: { in: sourceIn, out: Math.max(sourceIn + 1, sourceOut) },
    timeline: { start: Math.max(0, Math.round(start)), duration },
    speed,
    reverse: partial.reverse ?? false,
    groupId: partial.groupId ?? null,
    linkId: partial.linkId ?? null,
    transform: { ...defaultTransform(), ...partial.transform ?? {} },
    fit: partial.fit,
    focusX: partial.focusX,
    focusY: partial.focusY,
    cropRect: partial.cropRect,
    speedPoints: partial.speedPoints,
    volume: partial.volume ?? 100,
    text: partial.text,
    color: partial.color ?? DEFAULT_TEXT_COLOR,
    fontSize: partial.fontSize ?? DEFAULT_TEXT_FONT_SIZE,
    effects: Array.isArray(partial.effects) ? partial.effects : [],
    keyframes: Array.isArray(partial.keyframes) ? partial.keyframes : [],
    transitionIn: partial.transitionIn,
    fade: partial.fade
  };
  track.items.push(clip);
  return clip;
}
function removeClip(timeline, clipId) {
  const found = findClip(timeline, clipId);
  if (!found || found.track.locked) return false;
  found.track.items.splice(found.index, 1);
  return true;
}
function splitClip(timeline, clipId, splitTimeTicks) {
  const found = findClip(timeline, clipId);
  if (!found || found.track.locked) return null;
  const { track, index, clip } = found;
  const clipStart = clip.timeline.start;
  const clipEnd = clipStart + clipDurationTicks(clip);
  if (splitTimeTicks <= clipStart || splitTimeTicks >= clipEnd) return null;
  const elapsed = splitTimeTicks - clipStart;
  const map = splitRamp({
    in: clip.source.in,
    out: clip.source.out,
    speed: clip.speed,
    reverse: clip.reverse,
    speedPoints: clip.speedPoints
  }, elapsed);
  const second = {
    ...JSON.parse(JSON.stringify(clip)),
    id: nextClipId(),
    source: { in: map.tail.in, out: map.tail.out },
    timeline: { start: splitTimeTicks, duration: Math.max(1, clipEnd - splitTimeTicks) },
    speed: map.tail.speed
  };
  if (map.tail.speedPoints) second.speedPoints = map.tail.speedPoints;
  else delete second.speedPoints;
  clip.source.in = map.head.in;
  clip.source.out = map.head.out;
  clip.speed = map.head.speed;
  if (map.head.speedPoints) clip.speedPoints = map.head.speedPoints;
  else delete clip.speedPoints;
  clip.timeline.duration = Math.max(1, elapsed);
  delete second.transitionIn;
  track.items.splice(index + 1, 0, second);
  return second;
}
function moveClip(timeline, clipId, startTicks) {
  const found = findClip(timeline, clipId);
  if (!found || found.track.locked) return false;
  found.clip.timeline.start = Math.max(0, Math.round(startTicks));
  return true;
}
function trimClip(timeline, clipId, edge, sourceTicks) {
  const found = findClip(timeline, clipId);
  if (!found || found.track.locked) return false;
  const { clip } = found;
  const speed = isFiniteNumber3(clip.speed) && clip.speed > 0 ? clip.speed : 1;
  if (edge !== "in" && edge !== "out") return false;
  const flat = {
    in: clip.source.in,
    out: clip.source.out,
    speed: clip.speed,
    reverse: clip.reverse,
    speedPoints: clip.speedPoints
  };
  const target = edge === "in" ? Math.max(0, Math.min(flat.out - 1, Math.round(sourceTicks))) : Math.max(flat.in + 1, Math.round(sourceTicks));
  const shrinks = edge === "in" ? target > flat.in : target < flat.out;
  if (shrinks && isRamped(flat)) {
    const half = trimRamp(flat, edge, target);
    clip.source.in = half.in;
    clip.source.out = half.out;
    clip.speed = half.speed;
    if (half.speedPoints) clip.speedPoints = half.speedPoints;
    else delete clip.speedPoints;
    clip.timeline.start = Math.max(0, clip.timeline.start + half.shiftTicks);
  } else if (edge === "in") {
    const delta = target - clip.source.in;
    clip.source.in = target;
    if (!clip.reverse) clip.timeline.start = Math.max(0, clip.timeline.start + Math.round(delta / speed));
  } else {
    const delta = clip.source.out - target;
    clip.source.out = target;
    if (clip.reverse) clip.timeline.start = Math.max(0, clip.timeline.start + Math.round(delta / speed));
  }
  clip.timeline.duration = Math.max(1, clipDurationTicks(clip));
  return true;
}
function validateTimeline(timeline) {
  const errors = [];
  if (!timeline || typeof timeline !== "object") return ["timeline must be an object"];
  if (timeline.version !== 3) errors.push(`unsupported timeline version: ${timeline.version}`);
  if (!Array.isArray(timeline.tracks)) return [...errors, "timeline.tracks must be an array"];
  const seen = /* @__PURE__ */ new Set();
  for (const track of timeline.tracks) {
    if (!["video", "text", "audio"].includes(track.type)) {
      errors.push(`unknown track type: ${track.type}`);
    }
    for (const item of track.items ?? []) {
      if (!item.id) {
        errors.push("clip without id");
        continue;
      }
      if (seen.has(item.id)) errors.push(`duplicate clip id: ${item.id}`);
      seen.add(item.id);
      if (!(item.source?.out > item.source?.in)) {
        errors.push(`clip ${item.id} has empty source range`);
      }
      if (!(item.timeline?.duration > 0)) {
        errors.push(`clip ${item.id} has non-positive duration`);
      }
      if (!(item.speed > 0)) errors.push(`clip ${item.id} has non-positive speed`);
      if (item.timeline?.start < 0) errors.push(`clip ${item.id} has negative start`);
    }
  }
  return errors;
}

// src/transitions.mjs
var KNOWN_TRANSITIONS = [
  "fade",
  "dissolve",
  "wipe-left",
  "wipe-right",
  "slide-left",
  "zoom-in",
  "circleclose",
  "circlecrop",
  "circleopen",
  "diagbl",
  "diagbr",
  "diagtl",
  "diagtr",
  "distance",
  "fadeblack",
  "fadegrays",
  "fadewhite",
  "hblur",
  "hlslice",
  "hrslice",
  "horzclose",
  "horzopen",
  "pixelize",
  "radial",
  "rectcrop",
  "slidedown",
  "slideright",
  "slideup",
  "smoothdown",
  "smoothleft",
  "smoothright",
  "smoothup",
  "squeezeh",
  "squeezev",
  "vertclose",
  "vertopen",
  "vdslice",
  "vuslice",
  "wipebl",
  "wipebr",
  "wipedown",
  "wipetl",
  "wipetr",
  "wipeup",
  "zoomin"
];
var ADJACENCY_EPS = TICKS_PER_SECOND / 1e3;
function effectiveStart(clip) {
  const stored = clip.transitionIn?.duration;
  const existing = typeof stored === "number" && stored > 0 ? stored : 0;
  return clip.timeline.start + existing;
}
function canApplyTransition(timeline, clipId, type, durationTicks2) {
  const found = findClip(timeline, clipId);
  if (!found) return { ok: false, reason: "no-neighbor" };
  if (found.track.locked) return { ok: false, reason: "locked" };
  if (!KNOWN_TRANSITIONS.includes(type)) return { ok: false, reason: "unknown-type" };
  if (!(durationTicks2 > 0)) return { ok: false, reason: "too-long" };
  const cut = effectiveStart(found.clip);
  let neighbor = null;
  for (const other of found.track.items) {
    if (other.id === clipId) continue;
    const end = clipEndTicks(other);
    if (end > cut + ADJACENCY_EPS) continue;
    if (!neighbor || end > clipEndTicks(neighbor)) neighbor = other;
  }
  if (!neighbor) return { ok: false, reason: "no-neighbor" };
  if (cut - clipEndTicks(neighbor) > ADJACENCY_EPS) return { ok: false, reason: "gap" };
  const maxOverlap = Math.min(clipDurationTicks(neighbor), clipDurationTicks(found.clip));
  if (durationTicks2 > maxOverlap) return { ok: false, reason: "too-long" };
  return { ok: true, overlapTicks: durationTicks2 };
}
function applyTransition(timeline, clipId, type, durationTicks2) {
  const check = canApplyTransition(timeline, clipId, type, durationTicks2);
  if (!check.ok) return false;
  const { clip } = findClip(timeline, clipId);
  const oldDuration = clip.transitionIn?.duration;
  if (typeof oldDuration === "number" && oldDuration > 0) {
    clip.timeline.start += oldDuration;
  }
  clip.timeline.start = Math.max(0, clip.timeline.start - durationTicks2);
  clip.transitionIn = { type, duration: Math.round(durationTicks2) };
  return true;
}
function clearTransition(timeline, clipId) {
  const found = findClip(timeline, clipId);
  if (!found || found.track.locked) return false;
  const duration = found.clip.transitionIn?.duration;
  if (!(typeof duration === "number" && duration > 0)) return false;
  found.clip.timeline.start += duration;
  delete found.clip.transitionIn;
  return true;
}
var XFADE_POSITION_LAWS = {
  linear: (p) => p,
  smoother: (p) => ((6 * p - 15) * p + 10) * p * p * p,
  inOutQuad: (p) => p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2,
  smooth: (p) => 3 * p * p - 2 * p * p * p,
  sqrt: (p) => Math.sqrt(p),
  late: (p) => Math.max(0, 2 * p - 1),
  lateCube: (p) => Math.max(0, 2 * p - 1) ** 3,
  iris: (p) => Math.min(1, Math.max(0, 2 * p - 0.5)),
  radialLag: (p) => Math.min(1, Math.max(0, (p - 0.18) / 0.82)) ** 0.9
};
var CIRCLE_COVER_PCT = 100 / Math.SQRT2;
var XFADE_COMB_PERIOD = 1 / 10;
var COMB_BAND = 0.5;
var COMB_RATE = 1.5;
var COMB_TEETH = Math.round(1 / XFADE_COMB_PERIOD);
var smooth01 = (t) => t * t * (3 - 2 * t);
function combTooth(k, travel) {
  const s0 = 1 - COMB_RATE * travel;
  const g = (t) => smooth01(Math.min(1, Math.max(0, (t - s0) / COMB_BAND)));
  let f = g(k / COMB_TEETH);
  for (let i = 0; i < 4; i++) f = g((k + f) / COMB_TEETH);
  return f;
}
var SOFT_EDGE = "measured soft front painted as a hard edge";
var XFADE_PREVIEW = {
  "fade": { shape: "crossfade", law: "linear", fidelity: "exact" },
  "dissolve": { shape: "crossfade", law: "linear", fidelity: "approximate", note: "pixel dither" },
  "wipe-left": { shape: "wipe", from: "right", law: "linear", fidelity: "exact" },
  "wipe-right": { shape: "wipe", from: "left", law: "linear", fidelity: "exact" },
  "slide-left": { shape: "slide", from: "right", law: "linear", fidelity: "exact" },
  "zoom-in": { shape: "crossfade", law: "late", fidelity: "approximate", note: "scale is invisible on a solid plate" },
  "circleclose": { shape: "hole", law: "iris", fidelity: "shape", note: "soft ring around the disc" },
  "circlecrop": { shape: "iris", law: "lateCube", fidelity: "exact", crop: true },
  "circleopen": { shape: "iris", law: "iris", fidelity: "shape", note: "soft ring around the disc" },
  "diagbl": { shape: "diag", from: "top right", law: "inOutQuad", fidelity: "shape", note: SOFT_EDGE },
  "diagbr": { shape: "diag", from: "top left", law: "inOutQuad", fidelity: "shape", note: SOFT_EDGE },
  "diagtl": { shape: "diag", from: "bottom right", law: "inOutQuad", fidelity: "shape", note: SOFT_EDGE },
  "diagtr": { shape: "diag", from: "bottom left", law: "inOutQuad", fidelity: "shape", note: SOFT_EDGE },
  "distance": { shape: "crossfade", law: "linear", fidelity: "approximate", note: "per-pixel luma pick" },
  "fadeblack": { shape: "crossfade", law: "smooth", tint: "black", fidelity: "approximate" },
  "fadegrays": { shape: "crossfade", law: "linear", fidelity: "approximate", note: "desaturated blend" },
  "fadewhite": { shape: "crossfade", law: "sqrt", tint: "white", fidelity: "approximate" },
  "hblur": { shape: "crossfade", law: "linear", fidelity: "approximate", note: "blur ramp" },
  // There is a comb family, and it is not the one this table first carried. Read
  // as runs of incoming pixels along the axis, `hlslice` at p=0.5 fills
  // 0.000/0.000/0.000/0.006/0.31/0.72/0.97/1/1/1 of ten equal bands — 10 teeth
  // (period 1/10 of the axis), each filled from its own low end, with the fill
  // fraction increasing toward the edge the key names (`hlslice` from the right,
  // `hrslice` the left, `vdslice` the top, `vuslice` the bottom). The old row
  // had 6 teeth of a uniform width, so the preview painted a different comb than
  // the export: same area, wrong cut. Guards: `tmcut_transition_preview` grades
  // the tooth positions against the frame.
  "hlslice": { shape: "comb", from: "right", law: "linear", fidelity: "exact" },
  "hrslice": { shape: "comb", from: "left", law: "linear", fidelity: "exact" },
  "horzclose": { shape: "band", travel: "y", mode: "close", law: "smoother", fidelity: "shape", note: SOFT_EDGE },
  "horzopen": { shape: "band", travel: "y", mode: "open", law: "smoother", fidelity: "shape", note: SOFT_EDGE },
  "pixelize": { shape: "crossfade", law: "linear", fidelity: "approximate", note: "block ramp" },
  // The sweep's origin and direction are the model's (measured against the
  // frame: the wedge grows from 12 o'clock clockwise), only its timing lags —
  // see `radialLag`. The fidelity stays `shape` because the conic area bursts
  // twice per turn, at the corners, where d(area)/d(angle) is 4x the value at
  // the edge midpoints: 1.4% of travel costs 3.0% of the frame.
  "radial": { shape: "pie", law: "radialLag", fidelity: "shape", note: "corner bursts amplify the law error into the area" },
  "rectcrop": { shape: "rect", law: "late", fidelity: "exact", crop: true },
  "slidedown": { shape: "slide", from: "top", law: "linear", fidelity: "exact" },
  "slideright": { shape: "slide", from: "left", law: "linear", fidelity: "exact" },
  "slideup": { shape: "slide", from: "bottom", law: "linear", fidelity: "exact" },
  "smoothdown": { shape: "softwipe", from: "top", law: "smoother", fidelity: "shape", note: SOFT_EDGE },
  "smoothleft": { shape: "softwipe", from: "right", law: "smoother", fidelity: "shape", note: SOFT_EDGE },
  "smoothright": { shape: "softwipe", from: "left", law: "smoother", fidelity: "shape", note: SOFT_EDGE },
  "smoothup": { shape: "softwipe", from: "bottom", law: "smoother", fidelity: "shape", note: SOFT_EDGE },
  // The squeeze family, measured frame by frame on the window the export
  // emits (`offset = firstInputLength - duration`): the incoming arrives as
  // two hard-edged bands eating in from opposite edges, and the keys differ
  // only in which pair. `squeezeh` opens at the top and bottom (rows 0-7 and
  // 173-179 of 180 at p=1/12, all columns), `squeezev` at the left and right
  // (cols 0-13 and 307-319 of 320, all rows) — so `travel` names the axis the
  // FRONT moves along, the opposite letter from the name. The `band` rows
  // above and below already follow that convention and measure correctly; an
  // area curve cannot tell the two squeezes apart (each covers exactly
  // `travel` of the box), which is how the swap survived until the render
  // smoke spec started grading position.
  "squeezeh": { shape: "squeeze", travel: "y", law: "linear", fidelity: "exact" },
  // Renders, and is the mirror of the row above. It used to read `unavailable`
  // because the probe that produced that verdict placed the window at
  // `offset=0.6` on 1.2 s plates — not the tail-aligned window the graph
  // builds — and xfade exits 0xC0000005 on `squeezev` only in that position.
  "squeezev": { shape: "squeeze", travel: "x", law: "linear", fidelity: "exact" },
  "vertclose": { shape: "band", travel: "x", mode: "close", law: "smoother", fidelity: "shape", note: SOFT_EDGE },
  "vertopen": { shape: "band", travel: "x", mode: "open", law: "smoother", fidelity: "shape", note: SOFT_EDGE },
  "vdslice": { shape: "comb", from: "top", law: "linear", fidelity: "exact" },
  "vuslice": { shape: "comb", from: "bottom", law: "linear", fidelity: "exact" },
  "wipebl": { shape: "corner", from: "bl", law: "linear", fidelity: "exact" },
  "wipebr": { shape: "corner", from: "br", law: "linear", fidelity: "exact" },
  "wipedown": { shape: "wipe", from: "top", law: "linear", fidelity: "exact" },
  "wipetl": { shape: "corner", from: "tl", law: "linear", fidelity: "exact" },
  "wipetr": { shape: "corner", from: "tr", law: "linear", fidelity: "exact" },
  "wipeup": { shape: "wipe", from: "bottom", law: "linear", fidelity: "exact" },
  "zoomin": { shape: "crossfade", law: "late", fidelity: "approximate", note: "scale is invisible on a solid plate" }
};
var FALLBACK = { shape: "crossfade", law: "linear", fidelity: "approximate" };
var AXIS_OF = { left: "X", right: "X", top: "Y", bottom: "Y" };
var TRAVEL_SIGN = { left: -1, right: 1, top: -1, bottom: 1 };
var TRAVEL_DIR = {
  "left": "right",
  "right": "left",
  "top": "bottom",
  "bottom": "top",
  "top left": "bottom right",
  "top right": "bottom left",
  "bottom left": "top right",
  "bottom right": "top left"
};
var WIPE_INSET = { right: [0, 0, 0, 1], left: [0, 1, 0, 0], top: [0, 0, 1, 0], bottom: [1, 0, 0, 0] };
var CORNER_L = {
  bl: (s) => `polygon(0% 0%, 100% 0%, 100% 100%, ${pct(s)} 100%, ${pct(s)} ${pct(1 - s)}, 0% ${pct(1 - s)})`,
  br: (s) => `polygon(0% 0%, 100% 0%, 100% ${pct(1 - s)}, ${pct(1 - s)} ${pct(1 - s)}, ${pct(1 - s)} 100%, 0% 100%)`,
  tl: (s) => `polygon(${pct(s)} 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${pct(s)}, ${pct(s)} ${pct(s)})`,
  tr: (s) => `polygon(0% 0%, ${pct(1 - s)} 0%, ${pct(1 - s)} ${pct(s)}, 100% ${pct(s)}, 100% 100%, 0% 100%)`
};
var CORNER_TRI = {
  "top left": (leg) => `polygon(0% 0%, ${pct(leg)} 0%, 0% ${pct(leg)})`,
  "top right": (leg) => `polygon(100% 0%, ${pct(1 - leg)} 0%, 100% ${pct(leg)})`,
  "bottom left": (leg) => `polygon(0% 100%, ${pct(leg)} 100%, 0% ${pct(1 - leg)})`,
  "bottom right": (leg) => `polygon(100% 100%, ${pct(1 - leg)} 100%, 100% ${pct(1 - leg)})`
};
var CORNER_CUT = {
  "top left": (leg) => `polygon(${pct(leg)} 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${pct(leg)})`,
  "top right": (leg) => `polygon(0% 0%, ${pct(1 - leg)} 0%, 100% ${pct(leg)}, 100% 100%, 0% 100%)`,
  "bottom left": (leg) => `polygon(0% 0%, 100% 0%, 100% 100%, ${pct(leg)} 100%, 0% ${pct(1 - leg)})`,
  "bottom right": (leg) => `polygon(0% 0%, 100% 0%, 100% ${pct(1 - leg)}, ${pct(1 - leg)} 100%, 0% 100%)`
};
var pct = (v) => `${(v * 100).toFixed(2)}%`;
function edgeBands(dir, travel) {
  const in1 = pct(travel / 2);
  const in2 = pct(1 - travel / 2);
  return `linear-gradient(to ${dir}, #000 0 ${in1}, transparent ${in1} ${in2}, #000 ${in2})`;
}
function maskLayers(image) {
  return {
    maskImage: image,
    webkitMaskImage: image,
    maskSize: "100% 100%",
    webkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    webkitMaskRepeat: "no-repeat"
  };
}
function previewTransitionRamp(type, p) {
  const spec = XFADE_PREVIEW[type] || FALLBACK;
  const progress = Math.min(1, Math.max(0, Number(p) || 0));
  const travel = XFADE_POSITION_LAWS[spec.law || "linear"](progress);
  const incoming = { opacity: 1 };
  const outgoing = { opacity: 1 };
  let coverage = travel;
  switch (spec.shape) {
    case "wipe":
    case "softwipe": {
      const [t, r, b, l] = WIPE_INSET[spec.from];
      const rest = 1 - travel;
      incoming.clipPath = `inset(${pct(t * rest)} ${pct(r * rest)} ${pct(b * rest)} ${pct(l * rest)})`;
      break;
    }
    case "slide": {
      const sign = TRAVEL_SIGN[spec.from];
      incoming.transform = `translate${AXIS_OF[spec.from]}(${(sign * (1 - travel) * 100).toFixed(2)}%)`;
      outgoing.transform = `translate${AXIS_OF[spec.from]}(${(-sign * travel * 100).toFixed(2)}%)`;
      break;
    }
    case "squeeze": {
      const rest = Math.max(0, 1 - travel);
      outgoing.transform = `scale${spec.travel === "y" ? "Y" : "X"}(${rest.toFixed(4)})`;
      Object.assign(incoming, maskLayers(edgeBands(spec.travel === "y" ? "bottom" : "right", travel)));
      break;
    }
    case "diag": {
      const area = travel * travel;
      const leg = Math.sqrt(2 * (area <= 0.5 ? area : 1 - area));
      incoming.clipPath = area <= 0.5 ? CORNER_TRI[spec.from](leg) : CORNER_CUT[TRAVEL_DIR[spec.from]](leg);
      coverage = area;
      break;
    }
    case "band": {
      if (spec.mode === "open") {
        const rest = pct((1 - travel) / 2);
        incoming.clipPath = spec.travel === "y" ? `inset(${rest} 0%)` : `inset(0% ${rest})`;
      } else {
        Object.assign(incoming, maskLayers(edgeBands(spec.travel === "y" ? "bottom" : "right", travel)));
      }
      break;
    }
    case "comb": {
      const stops = [];
      let sum = 0;
      for (let k = 0; k < COMB_TEETH; k++) {
        const f = combTooth(k, travel);
        sum += f;
        const start = pct(k / COMB_TEETH);
        const end = pct((k + f) / COMB_TEETH);
        const next = pct((k + 1) / COMB_TEETH);
        stops.push(`#000 ${start} ${end}`, `transparent ${end} ${next}`);
      }
      Object.assign(incoming, maskLayers(`linear-gradient(to ${spec.from}, ${stops.join(", ")})`));
      coverage = sum / COMB_TEETH;
      break;
    }
    case "corner": {
      const side = 1 - travel;
      incoming.clipPath = CORNER_L[spec.from](side);
      coverage = 1 - side * side;
      break;
    }
    case "iris":
    case "rect": {
      const circle = spec.shape === "iris";
      const windowAt = (f) => circle ? `circle(${(f * CIRCLE_COVER_PCT).toFixed(2)}% at 50% 50%)` : `inset(${((1 - f) / 2 * 100).toFixed(2)}%)`;
      incoming.clipPath = windowAt(travel);
      if (spec.crop) {
        outgoing.clipPath = windowAt(XFADE_POSITION_LAWS[spec.law || "linear"](1 - progress));
      }
      coverage = circle ? null : travel * travel;
      break;
    }
    case "hole":
      Object.assign(incoming, maskLayers(
        `radial-gradient(circle ${((1 - travel) * CIRCLE_COVER_PCT).toFixed(2)}% at 50% 50%, transparent 0 100%, #000 100%)`
      ));
      coverage = null;
      break;
    case "pie":
      Object.assign(incoming, maskLayers(
        `conic-gradient(from 0deg at 50% 50%, #000 ${(travel * 360).toFixed(2)}deg, transparent 0)`
      ));
      coverage = null;
      break;
    default:
      incoming.opacity = travel;
      if (spec.tint === "black") outgoing.opacity = 1 - progress;
      break;
  }
  return {
    shape: spec.shape,
    law: spec.law || "linear",
    fidelity: spec.fidelity || "approximate",
    note: spec.note || null,
    travel,
    coverage,
    progress,
    incoming,
    outgoing
  };
}
function transitionWindows(track) {
  const items = Array.isArray(track?.items) ? track.items : [];
  const windows = [];
  for (const clip of items) {
    const duration = clip.transitionIn?.duration;
    if (!(typeof duration === "number" && duration > 0)) continue;
    const startTicks = clipSpan(clip).start;
    const endTicks = startTicks + duration;
    const outgoing = items.find((other) => other.id !== clip.id && Math.abs(clipSpan(other).end - endTicks) <= ADJACENCY_EPS);
    if (!outgoing) continue;
    windows.push({ fromId: outgoing.id, toId: clip.id, startTicks, endTicks });
  }
  return windows.sort((a, b) => a.startTicks - b.startTicks);
}

// src/blend.mjs
var BLEND_MODES = ["normal", "screen", "overlay", "multiply"];
function blendModeOf(clip) {
  const mode = clip?.blend;
  return typeof mode === "string" && BLEND_MODES.includes(mode) ? mode : "normal";
}

// src/evaluate.mjs
function finiteOr3(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function clamp3(value, lo, hi) {
  return Math.min(Math.max(value, lo), hi);
}
function spanOf(clip) {
  return clipSpan(clip);
}
function clipSourceRange(clip) {
  if (clip?.source) {
    const inT = finiteOr3(clip.source.in, 0);
    return { in: inT, out: finiteOr3(clip.source.out, inT) };
  }
  if (typeof clip?.in === "number" && Number.isFinite(clip.in)) {
    return { in: clip.in, out: finiteOr3(clip.out, clip.in) };
  }
  return null;
}
var sourceRangeOf = clipSourceRange;
function sourceAt(clip, localTicks, duration) {
  const range = sourceRangeOf(clip);
  if (!range) return null;
  const inT = range.in;
  const outT = range.out;
  const local = clamp3(localTicks, 0, duration);
  const lo = Math.min(inT, outT);
  const hi = Math.max(inT, outT);
  const speed = finiteOr3(clip.speed, 1) > 0 ? finiteOr3(clip.speed, 1) : 1;
  const source = isRamped(clip) ? rampTimelineToSource({ in: inT, out: outT, reverse: clip.reverse === true, speed: clip.speed, speedPoints: clip.speedPoints }, local) : clip.reverse ? outT - local * speed : inT + local * speed;
  return clamp3(source, lo, hi);
}
function flatOr(clip, key) {
  return typeof clip?.[key] === "number" && Number.isFinite(clip[key]) ? clip[key] : void 0;
}
function scaleOf(clip, localTicks) {
  const transform = clip.transform || {};
  const legacy = evalKeyframe(clip, "scale", localTicks);
  const keyedX = evalKeyframe(clip, "scaleX", localTicks);
  const keyedY = evalKeyframe(clip, "scaleY", localTicks);
  const flat = flatOr(clip, "scale");
  const baseX = flat === void 0 ? finiteOr3(transform.scaleX, 1) : flat / 100;
  const baseY = flat === void 0 ? finiteOr3(transform.scaleY, 1) : flat / 100;
  return {
    scaleX: keyedX ?? (legacy === void 0 ? baseX : legacy / 100),
    scaleY: keyedY ?? (legacy === void 0 ? baseY : legacy / 100)
  };
}
function opacityOf(clip, localTicks) {
  const transform = clip.transform || {};
  const keyed = evalKeyframe(clip, "opacity", localTicks);
  if (keyed !== void 0) return clamp3(keyed / 100, 0, 1);
  const flat = flatOr(clip, "opacity");
  const base = flat !== void 0 ? flat / 100 : finiteOr3(transform.opacity, 1);
  return clamp3(base, 0, 1);
}
function transformOf(clip, localTicks) {
  const transform = clip.transform || {};
  const { scaleX, scaleY } = scaleOf(clip, localTicks);
  return {
    x: evalKeyframe(clip, "x", localTicks) ?? flatOr(clip, "x") ?? finiteOr3(transform.x, 0),
    y: evalKeyframe(clip, "y", localTicks) ?? flatOr(clip, "y") ?? finiteOr3(transform.y, 0),
    scaleX,
    scaleY,
    rotation: evalKeyframe(clip, "rotation", localTicks) ?? flatOr(clip, "rotation") ?? finiteOr3(transform.rotation, 0)
  };
}
function volumeOf(clip, localTicks) {
  const keyed = evalKeyframe(clip, "volume", localTicks);
  return clamp3(keyed ?? finiteOr3(clip.volume, 100), 0, 100);
}
function maskOf(clip) {
  return normalizeMask(clip.mask);
}
function envelopeAt(clip, localTicks) {
  return gainAt({ ...clip, volume: 100 }, localTicks);
}
var TEXT_ANIM_MIN_TICKS = TICKS_PER_SECOND / 20;
function textAnimationAt(clip, localTicks, durationTicks2) {
  const duration = Math.max(0, finiteOr3(durationTicks2, 0));
  const local = clamp3(finiteOr3(localTicks, 0), 0, duration);
  const animIn = typeof clip?.animIn === "string" && clip.animIn !== "none" ? clip.animIn : null;
  const animOut = typeof clip?.animOut === "string" && clip.animOut !== "none" ? clip.animOut : null;
  const windowOf = (seconds) => Math.max(
    TEXT_ANIM_MIN_TICKS,
    Math.min(duration / 2, finiteOr3(seconds, 0.5) * TICKS_PER_SECOND)
  );
  const inWindow = animIn ? windowOf(clip.animInDuration) : 0;
  const outWindow = animOut ? windowOf(clip.animOutDuration) : 0;
  const pIn = inWindow > 0 ? clamp3(local / inWindow, 0, 1) : 1;
  const pOut = outWindow > 0 ? clamp3((duration - local) / outWindow, 0, 1) : 1;
  const inXDir = animIn === "slide-left" ? 100 : animIn === "slide-right" ? -100 : 0;
  const outXDir = animOut === "slide-left" ? -100 : animOut === "slide-right" ? 100 : 0;
  const inYDir = animIn === "slide-up" ? 60 : animIn === "slide-down" ? -60 : 0;
  const outYDir = animOut === "slide-up" ? -60 : animOut === "slide-down" ? 60 : 0;
  const scaleIn = animIn === "zoom-in" ? 0.3 + 0.7 * pIn : animIn === "zoom-out" ? 1.5 - 0.5 * pIn : 1;
  const scaleOut = animOut === "zoom-out" ? 0.3 + 0.7 * pOut : animOut === "zoom-in" ? 1.5 - 0.5 * pOut : 1;
  return {
    opacity: Math.min(animIn ? pIn : 1, animOut ? pOut : 1),
    deltaX: inXDir * (1 - pIn) + outXDir * (1 - pOut),
    deltaY: inYDir * (1 - pIn) + outYDir * (1 - pOut),
    scale: scaleIn * scaleOut
  };
}
function textOf(clip, localTicks, durationTicks2) {
  if (clip?.type !== "text" && !clip?.text) return null;
  return {
    content: clip.text ?? "",
    color: clip.color ?? null,
    fontSize: finiteOr3(clip.fontSize, 0) || null,
    fontFamily: clip.fontFamily ?? null,
    fontFile: clip.fontFile ?? null,
    bold: clip.bold === true,
    italic: clip.italic === true,
    align: clip.align ?? "center",
    shadow: clip.shadow === true,
    stroke: clip.stroke === true,
    shadowColor: typeof clip.shadowColor === "string" ? clip.shadowColor : null,
    strokeColor: typeof clip.strokeColor === "string" ? clip.strokeColor : null,
    bgColor: typeof clip.bgColor === "string" ? clip.bgColor : null,
    animIn: clip.animIn ?? "none",
    animInDuration: finiteOr3(clip.animInDuration, 0),
    animOut: clip.animOut ?? "none",
    animOutDuration: finiteOr3(clip.animOutDuration, 0),
    animation: textAnimationAt(clip, localTicks, durationTicks2)
  };
}
function evaluateClip(clip, localTicks) {
  const at = finiteOr3(localTicks, 0);
  return {
    opacity: opacityOf(clip, at),
    volume: volumeOf(clip, at),
    transform: transformOf(clip, at)
  };
}
function transitionAt(overlaps, clipId, at) {
  for (const overlap of overlaps) {
    if (at < overlap.startTicks || at >= overlap.endTicks) continue;
    const span = overlap.endTicks - overlap.startTicks;
    const progress = span > 0 ? (at - overlap.startTicks) / span : 1;
    if (overlap.toId === clipId) return { overlap, progress, role: "incoming" };
    if (overlap.fromId === clipId) return { overlap, progress, role: "outgoing" };
  }
  return null;
}
function transitionOf(hit, clipsById) {
  if (!hit) return null;
  const incoming = clipsById.get(hit.overlap.toId);
  const spec = incoming?.transitionIn;
  return {
    type: typeof spec?.type === "string" ? spec.type : null,
    duration: finiteOr3(spec?.duration, hit.overlap.endTicks - hit.overlap.startTicks),
    role: hit.role,
    progress: hit.progress
  };
}
function layerFor(clip, track, at, windows, clipsById) {
  const span = spanOf(clip);
  const localTicks = at - span.start;
  const visual = evaluateClip(clip, localTicks);
  const trackVolume = clamp3(finiteOr3(track?.volume, 100), 0, 100);
  const gain = visual.volume / 100 * (trackVolume / 100) * envelopeAt(clip, localTicks);
  return {
    clipId: clip.id,
    trackId: track?.id ?? null,
    trackType: track?.type ?? clip.type ?? "video",
    kind: clip.type ?? track?.type ?? "video",
    startTicks: span.start,
    endTicks: span.end,
    localTicks,
    sourceTicks: sourceAt(clip, localTicks, span.duration),
    // The authored media-clock rate at this tick (curve value, or the constant).
    // A host that seeks by `sourceTicks` must run its element at THIS number, or
    // the corrective seek fires every frame — one answer for picture and sound.
    sourceRate: speedAt(clip, localTicks),
    reverse: clip.reverse === true,
    visible: track?.hidden !== true && visual.opacity > 0,
    opacity: visual.opacity,
    volume: clamp3(gain, 0, 1),
    audible: track?.muted !== true && gain > 0,
    transform: visual.transform,
    effects: Array.isArray(clip.effects) ? clip.effects.map((effect) => ({ ...effect })) : [],
    mask: maskOf(clip),
    layout: resolveClipLayout(clip),
    blend: blendModeOf(clip),
    transition: transitionOf(transitionAt(windows, clip.id, at), clipsById),
    text: textOf(clip, localTicks, span.duration),
    ramped: isRamped(clip),
    groupId: clip.groupId ?? null,
    linkId: clip.linkId ?? null
  };
}
function projectTracks(input) {
  if (input && Array.isArray(input.tracks)) return input.tracks;
  const timeline = input?.timeline;
  return Array.isArray(timeline?.tracks) ? timeline.tracks : [];
}
function evaluateTimeline(input, atTicks) {
  const at = Math.max(0, Math.round(finiteOr3(atTicks, 0)));
  const layers = [];
  const tracks = [];
  for (const track of projectTracks(input)) {
    const windows = transitionWindows(track);
    const items = (Array.isArray(track?.items) ? track.items : []).map((clip, index) => ({ clip, index, start: spanOf(clip).start })).sort((a, b) => a.start - b.start || a.index - b.index);
    const clipsById = new Map(items.map(({ clip }) => [clip.id, clip]));
    const live = [];
    for (const { clip } of items) {
      const span = spanOf(clip);
      if (!(span.duration > 0)) continue;
      if (at < span.start || at >= span.end) continue;
      const layer = layerFor(clip, track, at, windows, clipsById);
      live.push(layer);
      layers.push(layer);
    }
    tracks.push({
      id: track?.id ?? null,
      type: track?.type ?? null,
      muted: track?.muted === true,
      hidden: track?.hidden === true,
      locked: track?.locked === true,
      layers: live
    });
  }
  return { at, layers, tracks };
}

// src/scheduler.mjs
function isFiniteNumber4(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function contentEndTicks(tracks) {
  let max = 0;
  for (const track of tracks) {
    for (const clip of track?.items ?? []) {
      const span = clipSpan(clip);
      if (!(span.duration > 0)) continue;
      if (span.end > max) max = span.end;
    }
  }
  return max;
}
function createFrameScheduler(input, options = {}) {
  const clock = createClock(options?.rate ?? input?.canvas?.fps);
  const endTicks = contentEndTicks(projectTracks(input));
  const frameCount = clock.durationFrames(endTicks);
  function frameAt(index) {
    if (!isFiniteNumber4(index)) return null;
    const ordinal = Math.floor(index);
    if (ordinal < 0 || ordinal >= frameCount) return null;
    const startTicks = clock.frameStartAt(ordinal);
    return Object.freeze({
      index: ordinal,
      startTicks,
      /** The frame's own width. The LAST frame can overrun the content: a partial frame still counts as one to render. */
      endTicks: startTicks + clock.ticksPerFrame,
      evaluation: evaluateTimeline(input, startTicks)
    });
  }
  return Object.freeze({
    clock,
    fps: clock.fps,
    ticksPerFrame: clock.ticksPerFrame,
    endTicks,
    frameCount,
    /**
     * Which frame contains an absolute tick position. Clamped into the
     * sequence, because a position past the end has no frame of its own and
     * the renderer must park on the last one (ADR-018).
     */
    indexOf: (ticks) => {
      if (frameCount === 0) return 0;
      return Math.min(clock.frameIndexAt(ticks), frameCount - 1);
    },
    frameAt,
    /** Half-open [fromIndex, toIndex) of the sequence — a bounded render plan. */
    frames: (fromIndex = 0, toIndex = frameCount) => {
      const from = Math.max(0, Math.floor(isFiniteNumber4(fromIndex) ? fromIndex : 0));
      const to = Math.min(frameCount, Math.ceil(isFiniteNumber4(toIndex) ? toIndex : frameCount));
      const planned = [];
      for (let ordinal = from; ordinal < to; ordinal++) planned.push(frameAt(ordinal));
      return planned;
    }
  });
}

// src/renderAt.mjs
function isFiniteNumber5(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function renderAt(input, atTicks, options = {}) {
  const plan2 = createFrameScheduler(input, { rate: options.rate });
  const requestedTicks = Math.max(0, Math.round(isFiniteNumber5(atTicks) ? atTicks : 0));
  const snapped = options.snapToFrame !== false;
  const lastRenderable = plan2.endTicks > 0 ? plan2.clock.frameStartAt(Math.max(0, plan2.clock.durationFrames(plan2.endTicks) - 1)) : null;
  let index = null;
  let frame = null;
  let at = requestedTicks;
  if (plan2.frameCount > 0) {
    index = plan2.indexOf(requestedTicks);
    frame = plan2.frameAt(index);
    at = snapped ? frame.startTicks : Math.min(requestedTicks, lastRenderable);
  }
  return Object.freeze({
    requestedTicks,
    /** The position actually evaluated — `at` and `evaluation` are one answer. */
    at,
    evaluation: frame && snapped ? frame.evaluation : evaluateTimeline(input, at),
    /** The named frame the request fell in, from the same plan a frame loop walks. */
    index,
    frame,
    snapped,
    beyond: plan2.endTicks > 0 && requestedTicks >= plan2.endTicks,
    fps: plan2.fps,
    ticksPerFrame: plan2.ticksPerFrame,
    endTicks: plan2.endTicks,
    frameCount: plan2.frameCount
  });
}

// src/platform.mjs
var PLATFORM_NAMES = Object.freeze(["electron", "web", "headless"]);
var PLATFORM_CAPABILITIES = Object.freeze([
  "filesystem",
  "webCodecs",
  "webGPU",
  "hardwareEncoding",
  "backgroundRender",
  "cloudRender",
  "largeFileAccess"
]);
function createPlatformInfo(name, capabilities = {}) {
  if (!PLATFORM_NAMES.includes(name)) {
    throw new TypeError(`unknown platform "${name}" (expected ${PLATFORM_NAMES.join(" | ")})`);
  }
  const normalized = {};
  for (const key of PLATFORM_CAPABILITIES) {
    normalized[key] = capabilities?.[key] === true;
  }
  return { name, capabilities: normalized };
}
function platformSupports(info, capability) {
  return info?.capabilities?.[capability] === true;
}

// src/paintStack.mjs
function selectPaintRows(evaluation) {
  const entries = Array.isArray(evaluation?.tracks) ? evaluation.tracks : [];
  const rows = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry?.type !== "video") continue;
    if (entry.hidden === true) continue;
    const layers = Array.isArray(entry.layers) ? entry.layers : [];
    if (layers.length === 0) continue;
    rows.push({ trackId: entry.id ?? null, trackIndex: index, layers });
  }
  return {
    at: Number.isFinite(evaluation?.at) ? evaluation.at : 0,
    rows,
    base: rows[0] ?? null
  };
}
function paintStackAt(input, atTicks) {
  return selectPaintRows(evaluateTimeline(input, atTicks));
}
function hasLiveClip(track) {
  const items = Array.isArray(track?.items) ? track.items : [];
  for (const clip of items) {
    if (clipSpan(clip).duration > 0) return true;
  }
  return false;
}
function selectFileRows(input) {
  const tracks = projectTracks(input);
  const rows = [];
  const overlays = [];
  const audio = [];
  for (let index = 0; index < tracks.length; index++) {
    const track = tracks[index];
    const type = track?.type;
    if (type !== "video" && type !== "text" && type !== "audio") continue;
    const row = { trackId: track.id ?? null, trackIndex: index };
    if (type === "audio") {
      audio.push(row);
      continue;
    }
    if (track.hidden === true) continue;
    if (!hasLiveClip(track)) continue;
    if (type === "video") rows.push(row);
    else overlays.push(row);
  }
  return {
    rows,
    base: rows[0] ?? null,
    stacked: rows.slice(1),
    overlays,
    audio
  };
}

// src/composite.mjs
function identifiable(layer) {
  return layer != null && layer.clipId != null;
}
function compositePlan(evaluation) {
  const slots = [];
  for (const row of selectPaintRows(evaluation).rows) {
    const layers = row.layers.filter(identifiable);
    if (layers.length === 0) continue;
    const incoming = layers.find((layer) => layer.transition?.role === "incoming" && layer.transition?.type);
    const outgoing = incoming ? layers.find((layer) => layer.clipId !== incoming.clipId && layer.transition?.role === "outgoing") : void 0;
    const stackable = outgoing ? layers.filter((layer) => layer !== outgoing) : layers;
    const paint = stackable[stackable.length - 1];
    if (!paint) continue;
    if (outgoing) {
      slots.push({
        kind: "footage",
        role: "outgoing",
        clipId: outgoing.clipId,
        trackId: row.trackId,
        trackIndex: row.trackIndex,
        layer: outgoing
      });
    }
    slots.push({
      kind: "footage",
      role: "paint",
      clipId: paint.clipId,
      trackId: row.trackId,
      trackIndex: row.trackIndex,
      layer: paint
    });
  }
  const entries = Array.isArray(evaluation?.tracks) ? evaluation.tracks : [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry?.type !== "text") continue;
    if (entry.hidden === true) continue;
    const layers = Array.isArray(entry.layers) ? entry.layers : [];
    for (const layer of layers) {
      if (!identifiable(layer)) continue;
      slots.push({
        kind: "overlay",
        role: "paint",
        clipId: layer.clipId,
        trackId: entry.id ?? null,
        trackIndex: index,
        layer
      });
    }
  }
  return {
    at: Number.isFinite(evaluation?.at) ? evaluation.at : 0,
    slots
  };
}

// src/history.mjs
function clone(value) {
  return structuredClone(value);
}
function createHistory(limit = 50) {
  const past = [];
  const future = [];
  const cap = Math.max(1, Math.floor(limit) || 50);
  return {
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
    get depth() {
      return past.length;
    },
    commit(command) {
      if (!command || !command.before || !command.after) {
        throw new Error("history.commit requires { name, before, after }");
      }
      past.push({
        name: command.name ?? "custom",
        label: command.label ?? command.name ?? "custom",
        before: clone(command.before),
        after: clone(command.after),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (past.length > cap) past.shift();
      future.length = 0;
    },
    undo() {
      if (past.length === 0) return null;
      const command = past.pop();
      future.push(command);
      return clone(command.before);
    },
    redo() {
      if (future.length === 0) return null;
      const command = future.pop();
      past.push(command);
      return clone(command.after);
    },
    clear() {
      past.length = 0;
      future.length = 0;
    },
    // Internal accessors for coalesce/pushBatch (docs C15). Not part of
    // the regular undo/redo contract — callers should not rely on them.
    _top() {
      return past.length ? past[past.length - 1] : null;
    },
    _replaceAfter(after) {
      if (past.length === 0) return;
      past[past.length - 1].after = clone(after);
      future.length = 0;
    }
  };
}
function pushBatch(history, entries, label) {
  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (list.length === 0) return;
  const first = list[0];
  const last = list[list.length - 1];
  history.commit({
    name: first.name ?? "batch",
    label: label ?? first.label ?? "batch",
    before: first.before,
    after: last.after
  });
}
function coalesce(history, entry, windowMs = 800) {
  if (!entry || !entry.before || !entry.after) {
    throw new Error("history.coalesce requires { name, before, after }");
  }
  const window = Number.isFinite(windowMs) ? Math.max(0, windowMs) : 800;
  const name = entry.name ?? "custom";
  const top = typeof history._top === "function" ? history._top() : null;
  const createdAt = top ? Date.parse(top.createdAt) : NaN;
  if (top && top.name === name && Date.now() - createdAt <= window) {
    history._replaceAfter(entry.after);
    return true;
  }
  history.commit(entry);
  return false;
}

// src/project.mjs
var projectCounter = 0;
var assetCounter = 0;
function nextProjectId() {
  projectCounter += 1;
  return `proj_${Date.now().toString(36)}${projectCounter.toString(36)}`;
}
function assetIdForPath(path) {
  const text = String(path ?? "");
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) + hash + text.charCodeAt(i) | 0;
  }
  assetCounter += 1;
  return `asset_${(hash >>> 0).toString(16)}_${assetCounter.toString(36)}`;
}
function defaultCanvas(width = 1920, height = 1080, fps = 30) {
  return {
    width,
    height,
    fps: fpsToRational(fps),
    aspectRatio: { id: `${width}:${height}`, value: height === 0 ? 0 : width / height, orientation: width === height ? "square" : width > height ? "landscape" : "portrait" },
    background: { type: "color", value: "#000000" }
  };
}
function defaultTimeline() {
  return {
    version: 3,
    tracks: [
      { id: "t-text-1", type: "text", name: "Text", items: [] },
      { id: "t-video-1", type: "video", name: "Video 1", items: [] },
      { id: "t-audio-1", type: "audio", name: "Audio 1", items: [] }
    ],
    markers: []
  };
}
function createProject(name = "Untitled Project", canvas) {
  return {
    version: 3,
    project: { id: nextProjectId(), name, duration: 0 },
    canvas: canvas ?? defaultCanvas(),
    timeline: defaultTimeline()
  };
}
function toOpacity(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value > 1 ? value / 100 : value));
}
function migrateClip(item, trackType) {
  const speed = typeof item.speed === "number" && item.speed > 0 ? item.speed : 1;
  const sourceIn = secToTicks(item.in ?? 0);
  const sourceOut = Math.max(sourceIn + 1, secToTicks(item.out ?? 5));
  const start = secToTicks(item.offset ?? 0);
  const scale = typeof item.scale === "number" && Number.isFinite(item.scale) ? item.scale / 100 : 1;
  return {
    id: item.id ?? `clip_migrated_${Math.random().toString(36).slice(2, 10)}`,
    type: trackType,
    name: item.name ?? item.text ?? "Clip",
    assetId: item.src ? assetIdForPath(item.src) : null,
    locator: item.src ? { runtime: "electron", path: item.src } : null,
    source: { in: sourceIn, out: sourceOut },
    timeline: { start, duration: Math.max(1, Math.round((sourceOut - sourceIn) / speed)) },
    speed,
    reverse: item.reverse ?? false,
    transform: {
      x: item.x ?? 0,
      y: item.y ?? 0,
      scaleX: scale,
      scaleY: scale,
      rotation: item.rotation ?? 0,
      opacity: toOpacity(item.opacity)
    },
    fit: item.fit,
    focusX: item.focusX,
    focusY: item.focusY,
    cropRect: item.cropRect,
    volume: item.volume ?? 100,
    text: item.text,
    color: item.color ?? DEFAULT_TEXT_COLOR,
    fontSize: item.fontSize ?? DEFAULT_TEXT_FONT_SIZE,
    effects: Array.isArray(item.effects) ? item.effects : [],
    keyframes: Array.isArray(item.keyframes) ? item.keyframes : [],
    transitionIn: item.transitionIn
  };
}
function migrateV1ToV3(v1) {
  if (!v1 || typeof v1 !== "object") throw new Error("migrateV1ToV3 requires a project object");
  const tracks = Array.isArray(v1.timeline?.tracks) ? v1.timeline.tracks : [];
  const canvasFps = typeof v1.canvas?.fps === "number" ? v1.canvas.fps : 30;
  return {
    version: 3,
    project: {
      id: v1.id ?? nextProjectId(),
      name: v1.name ?? "Untitled Project",
      duration: secToTicks((v1.durationMs ?? 0) / 1e3)
    },
    canvas: {
      width: v1.canvas?.width ?? 1920,
      height: v1.canvas?.height ?? 1080,
      fps: fpsToRational(canvasFps),
      aspectRatio: {
        id: `${v1.canvas?.width ?? 1920}:${v1.canvas?.height ?? 1080}`,
        value: (v1.canvas?.width ?? 1920) / Math.max(1, v1.canvas?.height ?? 1080),
        orientation: "landscape"
      },
      background: v1.canvas?.background ?? { type: "color", value: "#000000" }
    },
    timeline: {
      version: 3,
      tracks: tracks.map((track) => ({
        id: track.id,
        type: track.type,
        name: track.name,
        muted: track.muted,
        locked: track.locked,
        hidden: track.hidden,
        items: (track.items ?? []).map((item) => migrateClip(item, track.type))
      })),
      markers: []
    }
  };
}

// src/media.mjs
var VIDEO_EXTS = ["mp4", "mov", "mkv", "webm", "avi", "m4v", "mpg", "mpeg", "ts", "wmv", "flv"];
var AUDIO_EXTS = ["mp3", "wav", "m4a", "aac", "ogg", "flac", "wma", "opus"];
var IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "bmp", "tiff", "tif", "gif", "svg"];
var VECTOR_STILL_EXTS = ["svg"];
function normalizeMediaPath(input) {
  return String(input ?? "").trim().replace(/\\/g, "/");
}
function mediaFileKey(input) {
  return normalizeMediaPath(input).toLowerCase();
}
function mediaFileName(input) {
  const normalized = normalizeMediaPath(input);
  const parts = normalized.split("/");
  return parts[parts.length - 1] || normalized;
}
function extensionOf(input) {
  const base = mediaFileName(input);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}
function classifyAssetKind(input) {
  const ext = extensionOf(input);
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (AUDIO_EXTS.includes(ext)) return "audio";
  if (IMAGE_EXTS.includes(ext)) return "image";
  return null;
}
function isVectorStillImage(input) {
  return VECTOR_STILL_EXTS.includes(extensionOf(input));
}
function formatDurationSec(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const text = value >= 100 ? String(Math.round(value)) : value.toFixed(1);
  return `${text} ${units[i]}`;
}

// src/recovery.mjs
function decideRecovery(input) {
  if (!input.hasRecovery || input.recoveryUpdatedAtMs === null) return "none";
  if (Number.isNaN(input.recoveryUpdatedAtMs)) return "none";
  if (!input.hasProject) return "force";
  if (!Number.isFinite(input.projectMtimeMs)) return "suggest";
  return input.recoveryUpdatedAtMs > input.projectMtimeMs ? "suggest" : "none";
}

// src/byteCache.mjs
var TMCUT_BYTE_CACHE_MAX_BYTES = 2 * 1024 * 1024 * 1024;
var TMCUT_BYTE_CACHE_QUOTA_SHARE = 0.4;
var KEY_PATTERN = /^[0-9a-f]{8}$/;
var DERIVED_KEY_PATTERN = /^([0-9a-f]{8})-([a-z][a-z0-9]{0,15})-v([1-9][0-9]*)$/;
function positiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}
function byteCacheBudgetBytes(quotaBytes) {
  const quota = positiveNumber(quotaBytes);
  if (!quota) return TMCUT_BYTE_CACHE_MAX_BYTES;
  return Math.min(TMCUT_BYTE_CACHE_MAX_BYTES, Math.floor(quota * TMCUT_BYTE_CACHE_QUOTA_SHARE));
}
function isByteCacheKey(key) {
  return typeof key === "string" && KEY_PATTERN.test(key);
}
function isByteCacheKind(kind) {
  return typeof kind === "string" && /^[a-z][a-z0-9]{0,15}$/.test(kind);
}
function derivedByteCacheKey(fingerprint, kind, version) {
  if (!isByteCacheKey(fingerprint)) return null;
  if (!isByteCacheKind(kind)) return null;
  if (!Number.isInteger(version) || version < 1) return null;
  return `${fingerprint}-${kind}-v${version}`;
}
function parseDerivedByteCacheKey(key) {
  if (typeof key !== "string") return null;
  const match = DERIVED_KEY_PATTERN.exec(key);
  if (!match) return null;
  return { fingerprint: match[1], kind: match[2], version: Number(match[3]) };
}
function isDerivedByteCacheKey(key) {
  return parseDerivedByteCacheKey(key) !== null;
}
function isStoredByteCacheKey(key) {
  return isByteCacheKey(key) || isDerivedByteCacheKey(key);
}
function byteCacheFingerprint(key) {
  if (isByteCacheKey(key)) return key;
  const parsed = parseDerivedByteCacheKey(key);
  return parsed === null ? null : parsed.fingerprint;
}
function byteCacheFits(sizeBytes, budgetBytes) {
  const size = positiveNumber(sizeBytes);
  const budget = positiveNumber(budgetBytes);
  if (!size || !budget) return false;
  return size <= budget;
}
function byAgeThenKey(a, b) {
  if (a.accessedAt !== b.accessedAt) return a.accessedAt - b.accessedAt;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}
function planByteCacheEviction(entries, budgetBytes, liveKeys = []) {
  const rows = Array.isArray(entries) ? entries : [];
  const live = new Set(liveKeys ?? []);
  const usableBudget = positiveNumber(budgetBytes);
  const invalid = [];
  const candidates = [];
  for (const entry of rows) {
    if (!entry || !isStoredByteCacheKey(entry.key)) {
      if (entry && typeof entry.key === "string") invalid.push(entry.key);
      continue;
    }
    if (candidates.some((candidate) => candidate.key === entry.key)) continue;
    candidates.push({ key: entry.key, bytes: positiveNumber(entry.bytes), accessedAt: positiveNumber(entry.accessedAt) });
  }
  const isLive = (key) => live.has(key) || live.has(byteCacheFingerprint(key));
  const drop = [...invalid];
  const keep = [];
  const doomed = [];
  for (const entry of candidates) {
    if (!usableBudget || !isLive(entry.key) || entry.bytes > usableBudget) doomed.push(entry);
    else keep.push(entry);
  }
  drop.push(...doomed.sort(byAgeThenKey).map((entry) => entry.key));
  let keptBytes = keep.reduce((total, entry) => total + entry.bytes, 0);
  keep.sort(byAgeThenKey);
  while (keptBytes > usableBudget && keep.length > 0) {
    const oldest = keep.shift();
    keptBytes -= oldest.bytes;
    drop.push(oldest.key);
  }
  return { drop, keep, keptBytes, invalid };
}
function planPlaybackByteSource(revision) {
  const { fingerprint, cached, streamUrl } = revision || {};
  const hasRevision = isByteCacheKey(fingerprint);
  if (hasRevision && cached === true) return { kind: "cache", key: fingerprint };
  const reason = hasRevision ? "not-cached" : "no-revision";
  const hasStream = typeof streamUrl === "string" && streamUrl !== "";
  if (!hasStream) return { kind: "unresolved", reason };
  return { kind: "stream", url: streamUrl, reason };
}
function planPlaybackSourceCommit(input) {
  const { current, desired, playing, sameMedia } = input || {};
  const mounted = hasUrl(current) ? current : "";
  const wanted = hasUrl(desired) ? desired : "";
  if (!wanted) return { src: "", pending: null };
  if (wanted === mounted) return { src: mounted, pending: null };
  if (playing === true && sameMedia === true && mounted) return { src: mounted, pending: wanted };
  return { src: wanted, pending: null };
}
function byKey(a, b) {
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}
function hasUrl(url) {
  return typeof url === "string" && url !== "";
}
function planBlobUrlLifecycle(held, wanted) {
  const rows = Object.entries(held || {}).filter(([, url]) => hasUrl(url));
  const need = new Set(Array.from(wanted || []).filter(isByteCacheKey));
  const keep = rows.filter(([key]) => need.has(key)).map(([key, url]) => ({ key, url })).sort(byKey);
  const revoke = rows.filter(([key]) => !need.has(key)).map(([key, url]) => ({ key, url })).sort(byKey);
  const create = [...need].filter((key) => !(key in (held || {}))).sort();
  return { keep, create, revoke };
}

// src/waveform.mjs
function int16ToPeaks(samples, buckets = 200) {
  const count = Math.max(1, Math.floor(buckets));
  const out = new Array(count).fill(0);
  const total = samples?.length ?? 0;
  if (total === 0) return out;
  const per = total / count;
  for (let b = 0; b < count; b += 1) {
    const start = Math.floor(b * per);
    const end = Math.min(total, Math.floor((b + 1) * per));
    let max = 0;
    for (let i = start; i < end; i += 1) {
      const v = Math.abs(samples[i] || 0);
      if (v > max) max = v;
    }
    out[b] = Math.min(1, max / 32768);
  }
  return out;
}
function clampWaveformPoints(points) {
  if (!Array.isArray(points) || points.length === 0) return [];
  return points.map((p) => {
    if (!Number.isFinite(p)) return 0;
    return Math.min(1, Math.max(0, p));
  });
}
var TMCUT_WAVEFORM_ALGORITHM = "peak-v1";
var TMCUT_WAVEFORM_PEAK_PRECISION = 3;
var PEAK_FACTOR = 10 ** TMCUT_WAVEFORM_PEAK_PRECISION;
function roundPeak(value) {
  const magnitude = value < 0 ? -value : value;
  return Math.round(Math.min(1, magnitude) * PEAK_FACTOR) / PEAK_FACTOR;
}
function floatPeakBuckets(channels, buckets = 200) {
  const requested = Math.floor(Number(buckets));
  const count = Number.isFinite(requested) && requested >= 1 ? requested : 1;
  const out = new Array(count).fill(0);
  const list = Array.isArray(channels) ? channels : Array.from(channels ?? []);
  for (const channel of list) {
    const total = channel?.length ?? 0;
    if (total === 0) continue;
    const per = total / count;
    for (let b = 0; b < count; b += 1) {
      const start = Math.floor(b * per);
      const end = Math.min(total, Math.floor((b + 1) * per));
      let peak = 0;
      for (let i = start; i < end; i += 1) {
        const sample = Number(channel[i]);
        if (!Number.isFinite(sample)) continue;
        const magnitude = sample < 0 ? -sample : sample;
        if (magnitude > peak) peak = magnitude;
      }
      if (peak > out[b]) out[b] = peak > 1 ? 1 : peak;
    }
  }
  return out.map(roundPeak);
}
function peaksOf(value) {
  if (Array.isArray(value)) return value;
  if (ArrayBuffer.isView(value)) return Array.from(value);
  return null;
}
function wholeNumber(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}
function buildWaveformPayload(input) {
  if (!input || typeof input !== "object") return null;
  const bars = peaksOf(input.peaks);
  if (bars === null || bars.length === 0) return null;
  const peaks = bars.map(Number);
  if (peaks.some((p) => !Number.isFinite(p))) return null;
  const durationSec = Number(input.durationSec);
  if (!Number.isFinite(durationSec) || durationSec <= 0) return null;
  const channelCount = wholeNumber(Number(input.channelCount));
  const sampleRate = wholeNumber(Number(input.sampleRate));
  if (channelCount === null || sampleRate === null) return null;
  return Object.freeze({
    algorithm: TMCUT_WAVEFORM_ALGORITHM,
    durationSec,
    sampleRate,
    channelCount,
    bucketCount: peaks.length,
    peaks: Object.freeze(peaks.map(roundPeak))
  });
}
function readWaveformPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.algorithm !== TMCUT_WAVEFORM_ALGORITHM) return null;
  const payload = buildWaveformPayload(value);
  if (payload === null) return null;
  if (Number(value.bucketCount) !== payload.bucketCount) return null;
  return payload;
}
var TMCUT_WAVEFORM_CACHE_KIND = "wave";
var TMCUT_WAVEFORM_CACHE_VERSION = 1;
function waveformCacheKey(fingerprint) {
  return derivedByteCacheKey(fingerprint, TMCUT_WAVEFORM_CACHE_KIND, TMCUT_WAVEFORM_CACHE_VERSION);
}

// src/edl.mjs
var PROFILES = ["viral-shorts", "podcast-summary", "cinematic-vlog"];
function isFiniteNumber6(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function validateEdl(edl) {
  const errors = [];
  if (!edl || typeof edl !== "object") return ["edl must be an object"];
  if (edl.version !== 1) errors.push(`unsupported edl version: ${edl.version}`);
  if (typeof edl.assetId !== "string" || edl.assetId.length === 0) {
    errors.push("edl.assetId must be a non-empty string");
  }
  if (!PROFILES.includes(edl.profile)) {
    errors.push(`unknown edl profile: ${edl.profile}`);
  }
  if (!Array.isArray(edl.segments)) return [...errors, "edl.segments must be an array"];
  edl.segments.forEach((segment, index) => {
    const at = `segment ${index}`;
    if (!segment || typeof segment !== "object") {
      errors.push(`${at} must be an object`);
      return;
    }
    if (!isFiniteNumber6(segment.start) || segment.start < 0) {
      errors.push(`${at} has invalid start`);
    }
    if (!isFiniteNumber6(segment.end) || !(segment.end > segment.start)) {
      errors.push(`${at} has invalid end`);
    }
    if (!isFiniteNumber6(segment.score) || segment.score < 0 || segment.score > 1) {
      errors.push(`${at} score must be within 0..1`);
    }
    if (typeof segment.reason !== "string" || segment.reason.length === 0) {
      errors.push(`${at} needs a reason`);
    }
    if (segment.thumb !== void 0 && (!isFiniteNumber6(segment.thumb) || segment.thumb < segment.start || segment.thumb > segment.end)) {
      errors.push(`${at} thumb must fall inside [start, end]`);
    }
  });
  return errors;
}
function selectSegments(edl, minScore = 0.5) {
  if (!edl || !Array.isArray(edl.segments)) return [];
  return edl.segments.filter((segment) => isFiniteNumber6(segment.score) && segment.score >= minScore).slice().sort((a, b) => a.start - b.start);
}
function segmentsToClips(edl, segments, options = {}) {
  if (!edl || validateEdl(edl).length > 0) return [];
  const { minGapTicks = null, trackType = "video" } = options;
  if (!["video", "audio"].includes(trackType)) return [];
  if (!Array.isArray(segments)) return [];
  const clean = segments.filter((segment) => segment && typeof segment === "object" && isFiniteNumber6(segment.start) && isFiniteNumber6(segment.end) && segment.start >= 0 && segment.end > segment.start).slice().sort((a, b) => a.start - b.start);
  const clips = [];
  let cursor = 0;
  let previousEndTicks = null;
  for (const segment of clean) {
    const start = secToTicks(segment.start);
    const end = secToTicks(segment.end);
    if (previousEndTicks !== null && isFiniteNumber6(minGapTicks)) {
      const gap = start - previousEndTicks;
      if (gap >= minGapTicks) cursor += gap;
    }
    clips.push({ in: start, out: end, offset: cursor });
    cursor += end - start;
    previousEndTicks = end;
  }
  return clips;
}

// src/selection.mjs
var groupCounter = 0;
function nextGroupId() {
  groupCounter += 1;
  return `grp_${Date.now().toString(36)}${groupCounter.toString(36)}`;
}
function createSelection(ids = []) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const id of ids ?? []) {
    if (typeof id === "string" && id.length > 0 && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
function toggleSelected(selection, id) {
  const list = createSelection(selection);
  const index = list.indexOf(id);
  if (index === -1) list.push(id);
  else list.splice(index, 1);
  return list;
}
function selectAllClips(timeline) {
  const ids = [];
  for (const track of timeline?.tracks ?? []) {
    for (const item of track.items ?? []) {
      if (item.id) ids.push(item.id);
    }
  }
  return ids;
}
function selectTrackClips(timeline, trackId) {
  const track = (timeline?.tracks ?? []).find((t) => t.id === trackId);
  if (!track) return [];
  return (track.items ?? []).map((item) => item.id).filter((id) => typeof id === "string");
}
function expandRelated(timeline, ids) {
  const selected = new Set(createSelection(ids));
  if (selected.size === 0) return [];
  const relations = /* @__PURE__ */ new Set();
  for (const track of timeline?.tracks ?? []) {
    for (const item of track.items ?? []) {
      if (!item || !selected.has(item.id)) continue;
      if (item.groupId) relations.add(`g:${item.groupId}`);
      if (item.linkId) relations.add(`l:${item.linkId}`);
    }
  }
  if (relations.size === 0) return [...selected];
  for (const track of timeline?.tracks ?? []) {
    for (const item of track.items ?? []) {
      if (!item || selected.has(item.id)) continue;
      if (item.groupId && relations.has(`g:${item.groupId}`)) selected.add(item.id);
      else if (item.linkId && relations.has(`l:${item.linkId}`)) selected.add(item.id);
    }
  }
  return [...selected];
}
function resolveClips(timeline, ids) {
  const out = [];
  for (const id of createSelection(ids)) {
    const found = findClip(timeline, id);
    if (found) out.push(found);
  }
  return out;
}
function groupClips(timeline, ids) {
  const targets = resolveClips(timeline, ids).filter((found) => !found.track.locked);
  if (targets.length < 2) return null;
  const groupId = nextGroupId();
  for (const { clip } of targets) clip.groupId = groupId;
  return groupId;
}
function ungroupClips(timeline, ids) {
  const targets = resolveClips(timeline, ids).filter((found) => !found.track.locked);
  let count = 0;
  for (const { clip } of targets) {
    if (clip.groupId) {
      clip.groupId = null;
      count += 1;
    }
  }
  return count;
}

// src/markers.mjs
var markerCounter = 0;
function nextMarkerId() {
  markerCounter += 1;
  return `marker_${Date.now().toString(36)}${markerCounter.toString(36)}`;
}
function markerList(timeline) {
  if (!timeline || !Array.isArray(timeline.markers)) {
    throw new Error("timeline.markers must be an array");
  }
  return timeline.markers;
}
function addMarker(timeline, atTicks, options = {}) {
  const marker = {
    id: options.id ?? nextMarkerId(),
    at: Math.max(0, Math.round(atTicks)),
    label: options.label,
    color: options.color ?? "#3b82f6"
  };
  markerList(timeline).push(marker);
  markerList(timeline).sort((a, b) => a.at - b.at);
  return marker;
}
function removeMarker(timeline, markerId) {
  const markers = markerList(timeline);
  const index = markers.findIndex((m) => m.id === markerId);
  if (index === -1) return false;
  markers.splice(index, 1);
  return true;
}
function moveMarker(timeline, markerId, atTicks) {
  const marker = markerList(timeline).find((m) => m.id === markerId);
  if (!marker) return false;
  marker.at = Math.max(0, Math.round(atTicks));
  markerList(timeline).sort((a, b) => a.at - b.at);
  return true;
}
function markersInRange(timeline, fromTicks, toTicks) {
  const from = Math.min(fromTicks, toTicks);
  const to = Math.max(fromTicks, toTicks);
  return markerList(timeline).filter((m) => m.at >= from && m.at <= to).slice().sort((a, b) => a.at - b.at);
}

// src/editing.mjs
var editCounter = 0;
function nextEditId(prefix) {
  editCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${editCounter.toString(36)}`;
}
function isLockedTrack(track) {
  return !!track?.locked;
}
function moveClips(timeline, ids, deltaTicks) {
  const expanded = expandRelated(timeline, ids);
  let moved = 0;
  let skippedLocked = 0;
  for (const id of expanded) {
    const found = findClip(timeline, id);
    if (!found) continue;
    if (isLockedTrack(found.track)) {
      skippedLocked += 1;
      continue;
    }
    found.clip.timeline.start = Math.max(0, Math.round(found.clip.timeline.start + deltaTicks));
    moved += 1;
  }
  return { moved, skippedLocked };
}
function duplicateClips(timeline, ids, atTicks) {
  const expanded = expandRelated(timeline, ids);
  const resolved = [];
  for (const id of expanded) {
    const found = findClip(timeline, id);
    if (found && !isLockedTrack(found.track)) resolved.push(found);
  }
  if (resolved.length === 0) return [];
  const base = Math.min(...resolved.map((entry) => entry.clip.timeline.start));
  const target = Number.isFinite(atTicks) ? Math.max(0, Math.round(atTicks)) : base;
  const groupRemap = /* @__PURE__ */ new Map();
  const freshGroup = () => {
    const id = nextEditId("group");
    return id;
  };
  const copies = [];
  for (const entry of resolved) {
    const source = entry.clip;
    let groupId = null;
    if (source.groupId) {
      if (!groupRemap.has(source.groupId)) groupRemap.set(source.groupId, freshGroup());
      groupId = groupRemap.get(source.groupId);
    }
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = nextEditId("clip");
    copy.groupId = groupId;
    copy.linkId = null;
    copy.timeline = {
      start: target + (source.timeline.start - base),
      duration: source.timeline.duration
    };
    entry.track.items.push(copy);
    copies.push(copy);
  }
  return copies;
}
function copyClips(timeline, ids) {
  const expanded = expandRelated(timeline, ids);
  const clips = [];
  for (const id of expanded) {
    const found = findClip(timeline, id);
    if (found) {
      clips.push({
        trackType: found.track.type,
        clip: JSON.parse(JSON.stringify(found.clip))
      });
    }
  }
  if (clips.length === 0) return null;
  const baseStart = Math.min(...clips.map((entry) => entry.clip.timeline.start));
  return { version: 1, baseStart, clips };
}
function pasteClips(timeline, clipboard, atTicks) {
  if (!clipboard || clipboard.version !== 1 || !Array.isArray(clipboard.clips)) return [];
  const target = Math.max(0, Math.round(atTicks));
  const base = Number.isFinite(clipboard.baseStart) ? clipboard.baseStart : 0;
  const groupRemap = /* @__PURE__ */ new Map();
  const ids = [];
  for (const entry of clipboard.clips) {
    if (!entry || !entry.clip) continue;
    const track = ensureTrack(timeline, entry.trackType ?? "video");
    if (isLockedTrack(track)) continue;
    const source = entry.clip;
    let groupId = null;
    if (source.groupId) {
      if (!groupRemap.has(source.groupId)) groupRemap.set(source.groupId, nextEditId("group"));
      groupId = groupRemap.get(source.groupId);
    }
    const clip = JSON.parse(JSON.stringify(source));
    clip.id = nextEditId("clip");
    clip.groupId = groupId;
    clip.linkId = null;
    clip.timeline = {
      start: target + (source.timeline.start - base),
      duration: source.timeline.duration
    };
    track.items.push(clip);
    ids.push(clip.id);
  }
  return ids;
}
function rippleDelete(timeline, clipId, options = {}) {
  const found = findClip(timeline, clipId);
  if (!found || isLockedTrack(found.track)) return null;
  const gap = clipDurationTicks(found.clip);
  const cutStart = found.clip.timeline.start;
  found.track.items.splice(found.index, 1);
  const tracks = options.acrossTracks ? timeline.tracks.filter((track) => !isLockedTrack(track)) : [found.track];
  let shifted = 0;
  for (const track of tracks) {
    for (const item of track.items ?? []) {
      if (item.timeline.start >= cutStart + gap) {
        item.timeline.start = Math.max(0, item.timeline.start - gap);
        shifted += 1;
      }
    }
  }
  return shifted;
}
function insertClipRipple(timeline, trackType, partial, atTicks, options = {}) {
  const target = Math.max(0, Math.round(atTicks));
  const clip = addClip(timeline, trackType, {
    ...partial,
    timeline: { ...partial?.timeline ?? {}, start: target }
  });
  if (!clip) return null;
  const gap = clipDurationTicks(clip);
  const tracks = options.acrossTracks ? (timeline?.tracks ?? []).filter((track) => !isLockedTrack(track)) : [findClip(timeline, clip.id)?.track].filter(Boolean);
  let shifted = 0;
  for (const track of tracks) {
    for (const item of track.items ?? []) {
      if (item.id === clip.id) continue;
      if (item.timeline.start >= target) {
        item.timeline.start += gap;
        shifted += 1;
      }
    }
  }
  return { clip, shifted };
}
function closeGaps(timeline, options = {}) {
  const across = options.acrossTracks !== false;
  let closedTicks = 0;
  for (const track of timeline?.tracks ?? []) {
    if (isLockedTrack(track)) continue;
    if (options.trackType && track.type !== options.trackType) continue;
    const items = [...track.items ?? []].sort((a, b) => a.timeline.start - b.timeline.start);
    let cursor = 0;
    for (const item of items) {
      if (item.timeline.start > cursor) {
        closedTicks += item.timeline.start - cursor;
        item.timeline.start = cursor;
      }
      cursor = clipEndTicks(item);
    }
    if (!across) break;
  }
  return closedTicks / TICKS_PER_SECOND;
}
function snapTimeDetailed(timeline, targetTicks, options = {}) {
  const threshold = Number.isFinite(options.thresholdTicks) ? Math.max(0, options.thresholdTicks) : Math.round(TICKS_PER_SECOND * 0.08);
  const ignored = new Set(createSelection(options.ignoreIds));
  const candidates = [{ ticks: 0, kind: "zero" }];
  if (Number.isFinite(options.playheadTicks) && options.playheadTicks >= 0) {
    candidates.push({ ticks: Math.round(options.playheadTicks), kind: "playhead" });
  }
  for (const track of timeline?.tracks ?? []) {
    for (const item of track.items ?? []) {
      if (!item || ignored.has(item.id)) continue;
      candidates.push({ ticks: item.timeline.start, kind: "clip-start", fromId: item.id });
      candidates.push({ ticks: clipEndTicks(item), kind: "clip-end", fromId: item.id });
    }
  }
  for (const marker of timeline?.markers ?? []) {
    if (Number.isFinite(marker.at)) candidates.push({ ticks: marker.at, kind: "marker" });
  }
  let best = null;
  let bestDist = threshold + 1;
  for (const candidate of candidates) {
    const dist = Math.abs(candidate.ticks - targetTicks);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  if (best && bestDist <= threshold) return { ticks: best.ticks, snapped: best };
  return { ticks: Math.max(0, Math.round(targetTicks)), snapped: null };
}
function snapTime(timeline, targetTicks, options = {}) {
  return snapTimeDetailed(timeline, targetTicks, options).ticks;
}

// src/assets.mjs
function assertRegistry(registry) {
  if (!Array.isArray(registry)) throw new Error("registry must be an array");
}
function registerAsset(registry, input = {}) {
  assertRegistry(registry);
  const locator = input.locator ?? { runtime: "electron", path: input.path ?? "" };
  const path = locator.path ?? "";
  const kind = input.kind ?? classifyAssetKind(path) ?? "video";
  const record = {
    id: input.id ?? assetIdForPath(path || input.name || "unnamed"),
    kind,
    name: input.name ?? mediaFileName(path) ?? "Untitled",
    status: input.status ?? "analyzing",
    sourceType: input.sourceType ?? "local",
    locator,
    durationSec: input.durationSec ?? 0,
    width: input.width ?? 0,
    height: input.height ?? 0,
    fps: input.fps ?? 0,
    fileSize: input.fileSize ?? 0,
    hash: input.hash ?? null
  };
  registry.unshift(record);
  return record;
}
function getAsset(registry, id) {
  assertRegistry(registry);
  return registry.find((record) => record.id === id) ?? null;
}
function findAssetByPath(registry, path) {
  assertRegistry(registry);
  const key = mediaFileKey(path);
  if (!key) return null;
  return registry.find((record) => mediaFileKey(record.locator?.path ?? "") === key) ?? null;
}
function attachMetadata(registry, id, metadata = {}) {
  const record = getAsset(registry, id);
  if (!record) return false;
  const fields = ["durationSec", "width", "height", "fps", "fileSize", "hash"];
  for (const field of fields) {
    if (metadata[field] !== void 0) record[field] = metadata[field];
  }
  if (record.status === "analyzing") record.status = "ready";
  return true;
}
function relinkAsset(registry, id, locator) {
  const record = getAsset(registry, id);
  if (!record || !locator) return null;
  const path = locator.path ?? "";
  const kind = classifyAssetKind(path);
  record.locator = locator;
  if (path) record.name = mediaFileName(path);
  if (kind && kind !== record.kind) record.kind = kind;
  record.hash = null;
  record.status = "analyzing";
  record.durationSec = 0;
  record.width = 0;
  record.height = 0;
  record.fps = 0;
  return record;
}
function removeAsset(registry, id) {
  assertRegistry(registry);
  const index = registry.findIndex((record) => record.id === id);
  if (index === -1) return false;
  registry.splice(index, 1);
  return true;
}
function listAssets(registry, kind) {
  assertRegistry(registry);
  const list = kind ? registry.filter((record) => record.kind === kind) : registry.slice();
  return list.slice();
}

// src/mediaInfo.mjs
var MEDIA_WARNING_SEVERITY = {
  CONTAINER_UNDEMODABLE: "error",
  VIDEO_NOT_DECODABLE: "error",
  AUDIO_NOT_DECODABLE: "warning",
  IMAGE_NOT_DECODABLE: "error",
  DURATION_UNKNOWN: "warning",
  DURATION_ESTIMATED: "info",
  DURATION_MISMATCH: "warning",
  FPS_UNKNOWN: "warning",
  FPS_VARIABLE: "info",
  DIMENSIONS_UNKNOWN: "warning",
  HIGH_DYNAMIC_RANGE: "info",
  TRACK_ROTATED: "info",
  SIZE_UNKNOWN: "info"
};
var DURATION_MISMATCH_SEC = 0.5;
function positiveNumber2(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
function nonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function knownRate(value) {
  return positiveNumber2(value);
}
function pickDuration(descriptor, trackDurations) {
  const longest = trackDurations.reduce((max, value) => Math.max(max, Number(value) || 0), 0);
  const container = positiveNumber2(descriptor?.duration?.container);
  if (container !== null) {
    const spread = longest > 0 ? Math.abs(longest - container) : 0;
    return { duration: container, durationSource: "container", mismatchSec: spread > DURATION_MISMATCH_SEC ? spread : 0 };
  }
  const track = trackDurations.filter((value) => value > 0).sort((a, b) => b - a)[0];
  if (track) return { duration: track, durationSource: "track", mismatchSec: 0 };
  const estimated = positiveNumber2(descriptor?.duration?.estimated);
  if (estimated !== null) return { duration: estimated, durationSource: "estimated", mismatchSec: 0 };
  return { duration: void 0, durationSource: "unknown", mismatchSec: 0 };
}
function buildFrameRate(track) {
  const nominal = knownRate(track?.nominalFrameRate);
  const average = knownRate(track?.averageFrameRate);
  if (nominal === null && average === null) return void 0;
  const rate = average ?? nominal;
  const isVariable = track?.isVariableFrameRate === true;
  const info = {
    nominal: nominal ?? void 0,
    average: average ?? void 0,
    source: average !== null ? "measured" : "nominal",
    isVariable
  };
  info.rational = fpsToRational(rate);
  return info;
}
function codecInList(codec, list) {
  if (typeof codec !== "string" || !codec) return null;
  const needle = codec.toLowerCase();
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.some((entry) => typeof entry === "string" && entry.toLowerCase() === needle);
}
function normalizeVideoTrack(track, index, capabilities) {
  const codedWidth = positiveNumber2(track?.codedWidth);
  const codedHeight = positiveNumber2(track?.codedHeight);
  const displayWidth = positiveNumber2(track?.displayWidth) ?? codedWidth;
  const displayHeight = positiveNumber2(track?.displayHeight) ?? codedHeight;
  const rotation = nonNegativeNumber(track?.rotation);
  const out = {
    id: typeof track?.id === "string" && track.id ? track.id : `video-${index + 1}`,
    codec: typeof track?.codec === "string" && track.codec ? track.codec : void 0,
    codedWidth: codedWidth ?? void 0,
    codedHeight: codedHeight ?? void 0,
    displayWidth: displayWidth ?? void 0,
    displayHeight: displayHeight ?? void 0,
    frameRate: buildFrameRate(track),
    bitrate: positiveNumber2(track?.bitrate) ?? void 0,
    rotation: rotation === null ? void 0 : rotation % 360,
    pixelAspectRatio: rationalToFloatSafe(track?.pixelAspectRatio) ?? void 0,
    colorSpace: typeof track?.colorSpace === "string" && track.colorSpace ? track.colorSpace : void 0,
    hasHighDynamicRange: track?.hasHighDynamicRange === true ? true : void 0,
    duration: positiveNumber2(track?.duration) ?? void 0
  };
  if (typeof track?.canDecode === "boolean") out.canDecode = track.canDecode;
  else if (out.codec) {
    const listed = codecInList(out.codec, capabilities?.decodableVideoCodecs);
    if (listed !== null) out.canDecode = listed;
  }
  if (typeof track?.canEncode === "boolean") out.canEncode = track.canEncode;
  else if (out.codec) {
    const listed = codecInList(out.codec, capabilities?.encodableVideoCodecs);
    if (listed !== null) out.canEncode = listed;
  }
  return out;
}
function rationalToFloatSafe(rational) {
  const numerator = positiveNumber2(rational?.numerator);
  const denominator = positiveNumber2(rational?.denominator);
  if (numerator === null) return null;
  if (denominator === null) return null;
  return numerator / denominator;
}
function normalizeAudioTrack(track, index, capabilities) {
  const channels = positiveNumber2(track?.channels);
  const out = {
    id: typeof track?.id === "string" && track.id ? track.id : `audio-${index + 1}`,
    codec: typeof track?.codec === "string" && track.codec ? track.codec : void 0,
    sampleRate: positiveNumber2(track?.sampleRate) ?? void 0,
    channels: channels ?? void 0,
    channelLayout: typeof track?.channelLayout === "string" && track.channelLayout ? track.channelLayout : void 0,
    bitrate: positiveNumber2(track?.bitrate) ?? void 0,
    duration: positiveNumber2(track?.duration) ?? void 0
  };
  if (typeof track?.canDecode === "boolean") out.canDecode = track.canDecode;
  else if (out.codec) {
    const listed = codecInList(out.codec, capabilities?.decodableAudioCodecs);
    if (listed !== null) out.canDecode = listed;
  }
  return out;
}
function normalizeSubtitleTrack(track, index) {
  return {
    id: typeof track?.id === "string" && track.id ? track.id : `subtitle-${index + 1}`,
    codec: typeof track?.codec === "string" && track.codec ? track.codec : void 0,
    language: typeof track?.language === "string" && track.language ? track.language : void 0,
    label: typeof track?.label === "string" && track.label ? track.label : void 0,
    duration: positiveNumber2(track?.duration) ?? void 0
  };
}
function pushWarning(warnings, code, message) {
  const severity = MEDIA_WARNING_SEVERITY[code];
  if (!severity) return;
  if (warnings.some((entry) => entry.code === code && entry.message === message)) return;
  warnings.push({ code, message, severity });
}
function inferKind(descriptor, videoTracks, audioTracks, still) {
  if (still) return "image";
  if (videoTracks.length > 0) return "video";
  if (audioTracks.length > 0) return "audio";
  const byName = classifyAssetKind(descriptor?.name);
  if (byName === "image") return "image";
  if (byName === "audio") return "audio";
  return "unknown";
}
function normalizeStill(still) {
  if (!still || typeof still !== "object") return void 0;
  const width = positiveNumber2(still.width);
  const height = positiveNumber2(still.height);
  const normalized = {};
  if (width !== null) normalized.width = width;
  if (height !== null) normalized.height = height;
  if (typeof still.decodable === "boolean") normalized.decodable = still.decodable;
  if (typeof still.codec === "string" && still.codec) normalized.codec = still.codec;
  if (normalized.width === void 0 && normalized.height === void 0 && normalized.decodable === void 0 && normalized.codec === void 0) return void 0;
  return normalized;
}
function buildCompatibility({ kind, demuxable, videoTracks, audioTracks, seekable, still }) {
  const limitations = [];
  const canDemux = kind === "image" ? demuxable !== false || !!still : demuxable !== false;
  const primaryVideo = videoTracks[0];
  const primaryAudio = audioTracks[0];
  const videoDecodable = videoTracks.length === 0 || primaryVideo.canDecode !== false;
  const audioDecodable = audioTracks.length === 0 ? true : primaryAudio.canDecode !== false;
  const videoEncodable = videoTracks.length === 0 || primaryVideo.canEncode === true;
  const audioEncodable = audioTracks.length === 0 || primaryAudio.canEncode === true;
  const stillDecodable = !!still && still.decodable !== false;
  let canPreview;
  if (kind === "image") canPreview = stillDecodable || hasDimensions(videoTracks);
  else canPreview = canDemux && videoDecodable && audioDecodable;
  if (!canDemux) limitations.push("demux");
  if (kind === "image" && !stillDecodable) limitations.push("image-decode");
  if (videoTracks.length > 0 && !videoDecodable) limitations.push("video-decode");
  if (audioTracks.length > 0 && !audioDecodable) limitations.push("audio-decode");
  if (videoTracks.length > 0 && primaryVideo?.frameRate === void 0) limitations.push("frame-rate-unknown");
  if (primaryVideo?.frameRate?.isVariable) limitations.push("variable-frame-rate");
  if (!videoEncodable) limitations.push("source-codec-encode");
  if (!audioEncodable) limitations.push("source-audio-encode");
  if (seekable === false) limitations.push("seek");
  return {
    canDemux,
    canDecodeVideo: videoTracks.length > 0 ? videoDecodable : kind === "image" && stillDecodable,
    canDecodeAudio: audioTracks.length > 0 ? audioDecodable : false,
    canPreview,
    canExportSourceCodec: kind === "image" ? canDemux : canDemux && videoEncodable && audioEncodable,
    limitations
  };
}
function hasDimensions(videoTracks) {
  const primary = videoTracks[0];
  return !!primary && Number.isFinite(primary.displayWidth) && Number.isFinite(primary.displayHeight);
}
function buildMediaInfo(descriptor) {
  const source = descriptor && typeof descriptor === "object" ? descriptor : {};
  const capabilities = source.capabilities || null;
  const videoTracks = (Array.isArray(source.videoTracks) ? source.videoTracks : []).map((track, index) => normalizeVideoTrack(track, index, capabilities));
  const audioTracks = (Array.isArray(source.audioTracks) ? source.audioTracks : []).map((track, index) => normalizeAudioTrack(track, index, capabilities));
  const subtitleTracks = (Array.isArray(source.subtitleTracks) ? source.subtitleTracks : []).map((track, index) => normalizeSubtitleTrack(track, index));
  const still = normalizeStill(source.still);
  const kind = inferKind(source, videoTracks, audioTracks, still);
  const demuxable = source.demuxable !== false;
  const { duration, durationSource, mismatchSec } = pickDuration(source, [...videoTracks, ...audioTracks].map((track) => track.duration || 0));
  const compatibility = buildCompatibility({
    kind,
    demuxable,
    videoTracks,
    audioTracks,
    seekable: typeof source.seekable === "boolean" ? source.seekable : void 0,
    still
  });
  const probeWarnings = [];
  if (!demuxable && kind !== "image") pushWarning(probeWarnings, "CONTAINER_UNDEMODABLE", `TMCut cannot read container ${source.container || source.name}`);
  if (kind === "image" && !compatibility.canPreview) pushWarning(probeWarnings, "IMAGE_NOT_DECODABLE", `This runtime cannot decode the still image ${source.name || "untitled"}`);
  if (videoTracks.length > 0 && videoTracks[0].canDecode === false) pushWarning(probeWarnings, "VIDEO_NOT_DECODABLE", `This runtime cannot decode video codec ${videoTracks[0].codec || "unknown"}`);
  if (audioTracks.length > 0 && audioTracks[0].canDecode === false) pushWarning(probeWarnings, "AUDIO_NOT_DECODABLE", `This runtime cannot decode audio codec ${audioTracks[0].codec || "unknown"}`);
  if (mismatchSec > 0) pushWarning(probeWarnings, "DURATION_MISMATCH", `Container and track durations differ by ${mismatchSec.toFixed(2)}s`);
  if (durationSource === "estimated") pushWarning(probeWarnings, "DURATION_ESTIMATED", "Duration was estimated from packet timestamps, not stored metadata");
  if (durationSource === "unknown" && kind !== "image") pushWarning(probeWarnings, "DURATION_UNKNOWN", "No duration reported by the container or any track");
  if (videoTracks.length > 0 && videoTracks[0].frameRate === void 0) pushWarning(probeWarnings, "FPS_UNKNOWN", "Frame rate could not be read; the timeline rate drives sampling");
  if (videoTracks[0]?.frameRate?.isVariable) pushWarning(probeWarnings, "FPS_VARIABLE", "Variable frame rate: frames are sampled by timeline time, not source rate");
  if (kind === "video" && !hasDimensions(videoTracks)) pushWarning(probeWarnings, "DIMENSIONS_UNKNOWN", "The primary video track reports no display size");
  if (videoTracks[0]?.hasHighDynamicRange) pushWarning(probeWarnings, "HIGH_DYNAMIC_RANGE", "HDR source; preview and export are tone-mapped to the working color space");
  if (Number.isFinite(videoTracks[0]?.rotation) && videoTracks[0].rotation % 360 !== 0) pushWarning(probeWarnings, "TRACK_ROTATED", `Primary video track carries a ${videoTracks[0].rotation} degree rotation`);
  if (!Number.isFinite(Number(source.size)) || Number(source.size) <= 0) pushWarning(probeWarnings, "SIZE_UNKNOWN", "File size was not reported by the host");
  const info = {
    id: typeof source.id === "string" && source.id ? source.id : `${kind}:${source.name || "untitled"}`,
    name: typeof source.name === "string" ? source.name : "",
    size: positiveNumber2(source.size) ?? 0,
    kind,
    mimeType: typeof source.mimeType === "string" && source.mimeType ? source.mimeType : void 0,
    container: typeof source.container === "string" && source.container ? source.container : void 0,
    duration,
    durationSource,
    isSeekable: typeof source.seekable === "boolean" ? source.seekable : void 0,
    videoTracks,
    audioTracks,
    subtitleTracks,
    still,
    metadata: source.tags && typeof source.tags === "object" ? { ...source.tags } : void 0,
    probeWarnings,
    compatibility,
    importStatus: "ready"
  };
  info.importStatus = classifyImportStatus(info);
  return info;
}
function classifyImportStatus(info) {
  if (!info) return "error";
  const warnings = Array.isArray(info.probeWarnings) ? info.probeWarnings : [];
  const learnedAnything = info.duration !== void 0 || info.videoTracks.length > 0 || info.audioTracks.length > 0 || !!info.still;
  if (!learnedAnything) return "error";
  if (info.kind === "image" && !info.compatibility.canPreview) return "unsupported";
  if (info.kind !== "image" && !info.compatibility.canDemux) return "unsupported";
  if (warnings.some((entry) => entry.severity === "error")) return "partial";
  if (!info.compatibility.canPreview) return "partial";
  return "ready";
}
function mediaInfoToMetadata(info) {
  if (!info) return null;
  const primary = info.videoTracks[0];
  const frameRate = primary?.frameRate;
  const fps = frameRate ? frameRate.average ?? frameRate.nominal ?? 0 : 0;
  const width = primary?.displayWidth ?? info.still?.width ?? 0;
  const height = primary?.displayHeight ?? info.still?.height ?? 0;
  return {
    durationSec: info.duration ?? 0,
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
    fps: Number.isFinite(fps) ? fps : 0,
    hasAudio: info.audioTracks.length > 0
  };
}
function uniqueSortedCodecs(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((entry) => typeof entry === "string" && entry).map((entry) => entry.toLowerCase()))].sort();
}
function buildMediaCapabilities(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    hasWebCodecs: source.hasWebCodecs === true,
    hasAudioGraph: source.hasAudioGraph === true,
    decodableVideoCodecs: uniqueSortedCodecs(source.decodableVideoCodecs),
    decodableAudioCodecs: uniqueSortedCodecs(source.decodableAudioCodecs),
    encodableVideoCodecs: uniqueSortedCodecs(source.encodableVideoCodecs),
    encodableAudioCodecs: uniqueSortedCodecs(source.encodableAudioCodecs)
  };
}

// src/cache.mjs
function fnv1aHex(text) {
  const input = String(text ?? "");
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function cacheKeyForPath(path, revision = {}) {
  const normalized = mediaFileKey(path);
  const mtime = Number.isFinite(revision.mtimeMs) ? revision.mtimeMs : 0;
  const size = Number.isFinite(revision.size) ? revision.size : 0;
  return `${fnv1aHex(`v2:${normalized}:${mtime}:${size}`)}`;
}
function cachePathFor(cacheDir, kind, key, extension) {
  const safeKey = String(key).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${String(cacheDir).replace(/\/+$/, "")}/${kind}-${safeKey}.${extension}`;
}

// src/sticker.mjs
var STICKER_GROUPS = [
  {
    id: "faces",
    emojis: [
      "\u{1F600}",
      "\u{1F603}",
      "\u{1F604}",
      "\u{1F601}",
      "\u{1F606}",
      "\u{1F605}",
      "\u{1F923}",
      "\u{1F602}",
      "\u{1F642}",
      "\u{1F609}",
      "\u{1F60A}",
      "\u{1F60D}",
      "\u{1F970}",
      "\u{1F618}",
      "\u{1F61C}",
      "\u{1F92A}",
      "\u{1F928}",
      "\u{1F9D0}",
      "\u{1F913}",
      "\u{1F60E}",
      "\u{1F973}",
      "\u{1F60F}",
      "\u{1F60C}",
      "\u{1F634}",
      "\u{1F924}",
      "\u{1F911}",
      "\u{1F917}",
      "\u{1F914}",
      "\u{1F92B}",
      "\u{1F610}",
      "\u{1F636}",
      "\u{1F62C}",
      "\u{1F644}",
      "\u{1F62F}",
      "\u{1F611}",
      "\u{1F971}",
      "\u{1F62A}",
      "\u{1F62E}",
      "\u{1F910}",
      "\u{1F614}",
      "\u{1F615}",
      "\u{1F616}",
      "\u{1F612}",
      "\u{1F643}",
      "\u{1F921}",
      "\u{1F629}",
      "\u{1F622}",
      "\u{1F62D}",
      "\u{1F624}",
      "\u{1F621}"
    ]
  },
  {
    id: "gestures",
    emojis: [
      "\u{1F44D}",
      "\u{1F44E}",
      "\u{1F44C}",
      "\u270C\uFE0F",
      "\u{1F91E}",
      "\u{1F91F}",
      "\u{1F918}",
      "\u{1F919}",
      "\u{1F448}",
      "\u{1F449}",
      "\u{1F446}",
      "\u{1F447}",
      "\u261D\uFE0F",
      "\u270B",
      "\u{1F91A}",
      "\u{1F590}\uFE0F",
      "\u{1F596}",
      "\u{1F44B}",
      "\u{1F91D}",
      "\u{1F64F}",
      "\u{1F4AA}",
      "\u{1F9BE}",
      "\u{1F44F}",
      "\u{1F64C}",
      "\u{1F450}",
      "\u{1F932}",
      "\u270D\uFE0F",
      "\u{1F485}",
      "\u{1F933}",
      "\u{1FAF6}"
    ]
  },
  {
    id: "hearts",
    emojis: [
      "\u2764\uFE0F",
      "\u{1F9E1}",
      "\u{1F49B}",
      "\u{1F49A}",
      "\u{1F499}",
      "\u{1F49C}",
      "\u{1F5A4}",
      "\u{1F90D}",
      "\u{1F90E}",
      "\u{1F494}",
      "\u2763\uFE0F",
      "\u{1F495}",
      "\u{1F49E}",
      "\u{1F493}",
      "\u{1F497}",
      "\u{1F496}",
      "\u{1F498}",
      "\u{1F49D}",
      "\u{1F49F}",
      "\u2665\uFE0F"
    ]
  },
  {
    id: "animals",
    emojis: [
      "\u{1F436}",
      "\u{1F431}",
      "\u{1F42D}",
      "\u{1F439}",
      "\u{1F430}",
      "\u{1F98A}",
      "\u{1F43B}",
      "\u{1F43C}",
      "\u{1F428}",
      "\u{1F42F}",
      "\u{1F981}",
      "\u{1F42E}",
      "\u{1F437}",
      "\u{1F438}",
      "\u{1F435}",
      "\u{1F414}",
      "\u{1F427}",
      "\u{1F426}",
      "\u{1F986}",
      "\u{1F985}",
      "\u{1F989}",
      "\u{1F987}",
      "\u{1F43A}",
      "\u{1F417}",
      "\u{1F434}",
      "\u{1F984}",
      "\u{1F41D}",
      "\u{1F41B}",
      "\u{1F98B}",
      "\u{1F40C}"
    ]
  },
  {
    id: "objects",
    emojis: [
      "\u{1F525}",
      "\u2B50",
      "\u{1F31F}",
      "\u2728",
      "\u26A1",
      "\u{1F4A5}",
      "\u{1F4AB}",
      "\u{1F389}",
      "\u{1F38A}",
      "\u{1F388}",
      "\u{1F381}",
      "\u{1F3C6}",
      "\u{1F947}",
      "\u{1F3AF}",
      "\u{1F3AE}",
      "\u{1F4A1}",
      "\u{1F4B0}",
      "\u{1F48E}",
      "\u{1F680}",
      "\u2708\uFE0F",
      "\u{1F4F1}",
      "\u{1F4BB}",
      "\u{1F3A7}",
      "\u{1F4F7}",
      "\u{1F3AC}",
      "\u{1F3A4}",
      "\u{1F3B5}",
      "\u{1F514}",
      "\u23F0",
      "\u2705"
    ]
  },
  {
    id: "symbols",
    emojis: [
      "\u{1F4AF}",
      "\u{1F534}",
      "\u{1F7E0}",
      "\u{1F7E1}",
      "\u{1F7E2}",
      "\u{1F535}",
      "\u{1F7E3}",
      "\u26AB",
      "\u26AA",
      "\u2B1B",
      "\u25B6\uFE0F",
      "\u23F8\uFE0F",
      "\u23F9\uFE0F",
      "\u23E9",
      "\u{1F501}",
      "\u{1F50A}",
      "\u{1F4E2}",
      "\u{1F4E3}",
      "\u{1F5E8}\uFE0F",
      "\u{1F4AC}"
    ]
  }
];
function allStickers() {
  return STICKER_GROUPS.flatMap((g) => g.emojis);
}
function stickerMatches(query, emoji) {
  if (!query) return true;
  return String(emoji).toLowerCase().includes(String(query).toLowerCase());
}

// src/effects.mjs
var EFFECT_REGISTRY = {
  "blur": {
    type: "blur",
    label: "Blur",
    category: "blur",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "amount", kind: "number", min: 0, max: 100, default: 50 }
    ]
  },
  "sharpen": {
    type: "sharpen",
    label: "Sharpen",
    category: "sharpen",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "amount", kind: "number", min: 0, max: 100, default: 50 }
    ]
  },
  "vignette": {
    type: "vignette",
    label: "Vignette",
    category: "light",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate", layerOverlay: true },
    params: [
      { name: "intensity", kind: "number", min: 0, max: 100, default: 50 }
    ]
  },
  "grain": {
    type: "grain",
    label: "Grain",
    category: "texture",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate", layerOverlay: true },
    params: [
      { name: "amount", kind: "number", min: 0, max: 100, default: 30 },
      { name: "size", kind: "enum", options: ["fine", "medium", "coarse"], default: "fine" }
    ]
  },
  "chromakey": {
    type: "chromakey",
    label: "Chroma Key",
    category: "keying",
    renderReady: true,
    preview: { strategy: "css", fidelity: "illustrative" },
    params: [
      { name: "color", kind: "color", default: "#00ff00" },
      { name: "similarity", kind: "number", min: 0, max: 100, default: 30 },
      { name: "blend", kind: "number", min: 0, max: 100, default: 10 },
      { name: "spill", kind: "bool", default: true }
    ]
  },
  "lut3d": {
    type: "lut3d",
    label: "LUT 3D",
    category: "color",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      // Preset grades (R128 A3, slice J): 19 semantic grade op-lists (see
      // lutGrade), each an ordered instruction list a renderer consumes. The
      // first five keep their R4 order so stored projects resolve to the same
      // look; only 'neutral' is a no-op (lutGrade returns null). File-based
      // `.cube` loading still arrives with a future `file` param kind.
      {
        name: "lut",
        kind: "enum",
        options: [
          "neutral",
          "warm",
          "cool",
          "cinematic",
          "vintage",
          "vivid",
          "fade",
          "mono",
          "sepia",
          "noir",
          "bleach",
          "teal-orange",
          "sunset",
          "moonlight",
          "forest",
          "rose",
          "cyberpunk",
          "film",
          "honey",
          "arctic"
        ],
        default: "neutral"
      }
    ]
  },
  "stabilize": {
    type: "stabilize",
    label: "Stabilize",
    category: "motion",
    renderReady: true,
    preview: { strategy: "css", fidelity: "illustrative" },
    params: [
      { name: "strength", kind: "number", min: 0, max: 100, default: 50 }
    ]
  },
  "eq-grade": {
    type: "eq-grade",
    label: "EQ / Grade",
    category: "color",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "brightness", kind: "number", min: -100, max: 100, default: 0 },
      { name: "contrast", kind: "number", min: 0, max: 200, default: 100 },
      { name: "saturation", kind: "number", min: 0, max: 200, default: 100 },
      // R117: color temperature — negative = cooler (blue), positive =
      // warmer (amber). One number; `lutGrade` carries it as a `balance` op.
      { name: "temp", kind: "number", min: -100, max: 100, default: 0 },
      // R128 A4 adjust params. Every default is a true no-op so a stored
      // legacy eq-grade exports the byte-identical filter string. hue is
      // degrees, gamma is percent (100 = neutral 1.0), fade lifts the black
      // floor (matte look) and vibrance is a biased -100..100 saturation.
      { name: "hue", kind: "number", min: -180, max: 180, default: 0 },
      { name: "gamma", kind: "number", min: 10, max: 300, default: 100 },
      { name: "fade", kind: "number", min: 0, max: 100, default: 0 },
      { name: "vibrance", kind: "number", min: -100, max: 100, default: 0 }
    ]
  },
  // --- R128 A2: stylize ---
  "pixelate": {
    type: "pixelate",
    label: "Pixelate",
    category: "stylize",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      // Block size in pixels. Mapped to FFmpeg `pixelize` rather than a
      // scale-down/scale-up pair: scaling cannot restore the exact frame
      // size (trunc() leaves a remainder), and the render path comma-chains
      // effects into streams that must keep their dimensions for concat.
      { name: "size", kind: "number", min: 1, max: 64, default: 12 },
      { name: "mode", kind: "enum", options: ["avg", "min", "max"], default: "avg" }
    ]
  },
  "emboss": {
    type: "emboss",
    label: "Emboss",
    category: "stylize",
    renderReady: true,
    preview: { strategy: "css", fidelity: "illustrative" },
    params: [
      // Scales the convolution divisor (100 = the classic 3x3 kernel).
      { name: "amount", kind: "number", min: 0, max: 100, default: 100 }
    ]
  },
  "edge-detect": {
    type: "edge-detect",
    label: "Edge Detect",
    category: "stylize",
    renderReady: true,
    preview: { strategy: "css", fidelity: "illustrative" },
    params: [
      // low/high only apply to the canny mode; the other modes ignore them.
      { name: "mode", kind: "enum", options: ["wires", "colormix", "canny"], default: "wires" },
      { name: "low", kind: "number", min: 0, max: 1, default: 0.1 },
      { name: "high", kind: "number", min: 0, max: 1, default: 0.4 }
    ]
  },
  "letterbox": {
    type: "letterbox",
    label: "Letterbox",
    category: "stylize",
    renderReady: true,
    preview: { strategy: "css", fidelity: "exact", layerOverlay: true },
    params: [
      // Bar height as a percentage of the frame height.
      { name: "size", kind: "number", min: 1, max: 40, default: 12 }
    ]
  },
  // --- R128 A2: color ---
  "negate": {
    type: "negate",
    label: "Negate",
    category: "color",
    renderReady: true,
    // NOT `exact`: `alpha` inverts the alpha channel and CSS invert() has no
    // alpha face, so one reachable param makes the tile a different picture.
    // Policed by tests/unit/tmcut_fx_exact.spec.ts.
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "alpha", kind: "bool", default: false }
    ]
  },
  "vivid": {
    type: "vivid",
    label: "Vivid",
    category: "color",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "amount", kind: "number", min: 0, max: 100, default: 50 }
    ]
  },
  "bleach-bypass": {
    type: "bleach-bypass",
    label: "Bleach Bypass",
    category: "color",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "amount", kind: "number", min: 0, max: 100, default: 100 }
    ]
  },
  "teal-orange": {
    type: "teal-orange",
    label: "Teal & Orange",
    category: "color",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "amount", kind: "number", min: 0, max: 100, default: 60 }
    ]
  },
  "vibrance": {
    type: "vibrance",
    label: "Vibrance",
    category: "color",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "intensity", kind: "number", min: -100, max: 100, default: 50 }
    ]
  },
  // --- R128 A2: distort ---
  "mirror-h": {
    type: "mirror-h",
    label: "Mirror Horizontal",
    category: "distort",
    renderReady: true,
    preview: { strategy: "css", fidelity: "exact" },
    params: [
      { name: "axis", kind: "enum", options: ["horizontal", "vertical", "both"], default: "horizontal" }
    ]
  },
  "mirror-v": {
    type: "mirror-v",
    label: "Mirror Vertical",
    category: "distort",
    renderReady: true,
    preview: { strategy: "css", fidelity: "exact" },
    params: [
      { name: "axis", kind: "enum", options: ["horizontal", "vertical", "both"], default: "vertical" }
    ]
  },
  "rotate-90": {
    type: "rotate-90",
    label: "Rotate 90",
    category: "distort",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      // 1..3 clockwise quarter turns. NOTE: this is the only new effect that
      // swaps the frame width/height (transpose), so the caller has to
      // re-fit the clip stream to the canvas before concat/xfade.
      { name: "turns", kind: "number", min: 1, max: 3, default: 1 }
    ]
  },
  "chromatic": {
    type: "chromatic",
    label: "Chromatic Aberration",
    category: "distort",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "shift", kind: "number", min: 1, max: 64, default: 6 }
    ]
  },
  "fisheye": {
    type: "fisheye",
    label: "Fisheye",
    category: "distort",
    renderReady: true,
    preview: { strategy: "css", fidelity: "illustrative" },
    params: [
      { name: "strength", kind: "number", min: 0, max: 100, default: 30 }
    ]
  },
  // --- R128 A2: motion ---
  "motion-blur": {
    type: "motion-blur",
    label: "Motion Blur",
    category: "motion",
    renderReady: true,
    preview: { strategy: "css", fidelity: "illustrative" },
    params: [
      { name: "frames", kind: "number", min: 2, max: 30, default: 8 }
    ]
  },
  "afterimage": {
    type: "afterimage",
    label: "Afterimage",
    category: "motion",
    renderReady: true,
    preview: { strategy: "css", fidelity: "illustrative" },
    params: [
      { name: "decay", kind: "number", min: 0, max: 100, default: 80 }
    ]
  },
  // --- R128 A2: texture ---
  "denoise": {
    type: "denoise",
    label: "Denoise",
    category: "texture",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "strength", kind: "number", min: 0, max: 100, default: 50 }
    ]
  },
  "deband": {
    type: "deband",
    label: "Deband",
    category: "texture",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      // Threshold in 1/1000 units (20 = the FFmpeg default 0.02).
      { name: "threshold", kind: "number", min: 1, max: 100, default: 20 },
      { name: "range", kind: "number", min: 4, max: 64, default: 16 }
    ]
  },
  // --- R128 A2: retro ---
  "sepia": {
    type: "sepia",
    label: "Sepia",
    category: "retro",
    renderReady: true,
    preview: { strategy: "css", fidelity: "exact" },
    params: [
      { name: "intensity", kind: "number", min: 0, max: 100, default: 100 }
    ]
  },
  "mono": {
    type: "mono",
    label: "Monochrome",
    category: "retro",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "intensity", kind: "number", min: 0, max: 100, default: 100 }
    ]
  },
  "vhs": {
    type: "vhs",
    label: "VHS",
    category: "retro",
    renderReady: true,
    preview: { strategy: "css", fidelity: "approximate" },
    params: [
      { name: "amount", kind: "number", min: 0, max: 100, default: 50 }
    ]
  }
};
var HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
function paramErrors(type, param, value) {
  const at = `effect ${type}.${param.name}`;
  switch (param.kind) {
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return [`${at} must be a number`];
      }
      if (value < param.min || value > param.max) {
        return [`${at}: ${value} out of range [${param.min}, ${param.max}]`];
      }
      return [];
    }
    case "color": {
      if (typeof value !== "string" || !HEX_COLOR.test(value)) {
        return [`${at} must be a hex color (#rgb/#rrggbb/#rrggbbaa)`];
      }
      return [];
    }
    case "enum": {
      if (!Array.isArray(param.options) || !param.options.includes(value)) {
        return [`${at}: ${JSON.stringify(value)} not in options [${(param.options ?? []).join(", ")}]`];
      }
      return [];
    }
    case "bool": {
      if (typeof value !== "boolean") return [`${at} must be a boolean`];
      return [];
    }
    default:
      return [`${at}: unsupported param kind ${param.kind}`];
  }
}
function validateEffect(effect) {
  if (!effect || typeof effect !== "object" || Array.isArray(effect)) {
    return ["effect must be an object"];
  }
  const desc = EFFECT_REGISTRY[effect.type];
  if (!desc) return [`unknown effect type: ${effect.type}`];
  const params = effect.params;
  if (params === void 0 || params === null) return [];
  if (typeof params !== "object" || Array.isArray(params)) {
    return [`effect ${effect.type} params must be an object`];
  }
  const errors = [];
  for (const [key, value] of Object.entries(params)) {
    const param = desc.params.find((candidate) => candidate.name === key);
    if (!param) {
      errors.push(`effect ${effect.type} has unknown param: ${key}`);
      continue;
    }
    errors.push(...paramErrors(effect.type, param, value));
  }
  return errors;
}
function coerceValue(param, raw) {
  const fallback = param.default;
  switch (param.kind) {
    case "number": {
      if (typeof raw === "number" && Number.isFinite(raw)) {
        return Math.min(param.max, Math.max(param.min, raw));
      }
      return fallback;
    }
    case "color": {
      return typeof raw === "string" && HEX_COLOR.test(raw) ? raw : fallback;
    }
    case "enum": {
      return Array.isArray(param.options) && param.options.includes(raw) ? raw : fallback;
    }
    case "bool":
      return typeof raw === "boolean" ? raw : fallback;
    default:
      return fallback;
  }
}
function normalizeEffects(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const desc = EFFECT_REGISTRY[entry.type];
    if (!desc) continue;
    const params = entry.params && typeof entry.params === "object" && !Array.isArray(entry.params) ? entry.params : {};
    const clean = {};
    for (const param of desc.params) {
      clean[param.name] = coerceValue(param, params[param.name]);
    }
    out.push({ type: entry.type, params: clean });
  }
  return out;
}
var LUT_GRADES = {
  "warm": [{ op: "balance", rs: 0.12, gs: 0.02, bs: -0.1 }],
  "cool": [{ op: "balance", rs: -0.1, gs: 0.02, bs: 0.15 }],
  "cinematic": [{ op: "curves", preset: "cross_process" }, { op: "eq", contrast: 1.1, saturation: 1.15 }],
  "vintage": [{ op: "balance", rs: 0.15, gs: 0.08, bs: -0.12 }, { op: "eq", contrast: 0.95, saturation: 0.85 }],
  "vivid": [{ op: "eq", saturation: 1.45, contrast: 1.12, brightness: 0.02 }],
  "fade": [{ op: "curves", preset: "lighter" }, { op: "eq", saturation: 0.78, contrast: 0.9, brightness: 0.03 }],
  "mono": [{ op: "desaturate" }, { op: "eq", contrast: 1.08 }],
  "sepia": [{ op: "sepia" }],
  "noir": [{ op: "desaturate" }, { op: "curves", preset: "strong_contrast" }, { op: "eq", brightness: -0.02 }],
  "bleach": [{ op: "curves", preset: "strong_contrast" }, { op: "eq", saturation: 0.35, contrast: 1.15 }],
  "teal-orange": [{ op: "balance", bs: 0.18, gs: 0.05, rh: 0.14, rm: 0.1 }, { op: "eq", saturation: 1.08 }],
  "sunset": [{ op: "balance", rs: 0.2, gs: 0.05, bs: -0.15, rm: 0.1 }, { op: "eq", saturation: 1.15, brightness: 0.02 }],
  "moonlight": [{ op: "balance", rs: -0.12, bs: 0.2, bm: 0.08 }, { op: "eq", brightness: -0.03, saturation: 0.85, contrast: 1.05 }],
  "forest": [{ op: "balance", gs: 0.15, rs: -0.1, bs: 0.05 }, { op: "eq", saturation: 1.1, contrast: 1.03 }],
  "rose": [{ op: "balance", rs: 0.16, rm: 0.08, bs: -0.05 }, { op: "eq", saturation: 1.08 }],
  "cyberpunk": [{ op: "balance", bs: 0.25, rs: 0.1, bm: 0.15 }, { op: "eq", saturation: 1.35, contrast: 1.15 }],
  "film": [{ op: "curves", preset: "medium_contrast" }, { op: "eq", saturation: 0.92, brightness: 0.01 }, { op: "grain", amount: 4 }],
  "honey": [{ op: "balance", rs: 0.1, gs: 0.06, bs: -0.08 }, { op: "curves", preset: "lighter" }, { op: "eq", saturation: 1.1 }],
  "arctic": [{ op: "balance", bs: 0.18, gs: 0.06, rs: -0.12 }, { op: "eq", saturation: 0.9, brightness: 0.02, contrast: 1.06 }]
};
function lutGrade(preset) {
  return Object.prototype.hasOwnProperty.call(LUT_GRADES, preset) ? LUT_GRADES[preset].map((op) => ({ ...op })) : null;
}
function fxCapabilities(type) {
  const desc = EFFECT_REGISTRY[type];
  if (!desc) return null;
  return {
    fidelity: desc.preview?.fidelity ?? "approximate",
    strategy: desc.preview?.strategy ?? "css",
    layerOverlay: desc.preview?.layerOverlay === true,
    previewReady: desc.renderReady === true,
    label: desc.label,
    category: desc.category
  };
}
function clampEffectParam(type, name, raw) {
  const desc = EFFECT_REGISTRY[type];
  if (!desc) return void 0;
  const param = desc.params.find((candidate) => candidate.name === name);
  if (!param) return void 0;
  return coerceValue(param, raw);
}

// src/caption.mjs
var DEFAULT_MAX_CHARS = 42;
var DEFAULT_MAX_DURATION_TICKS = 7 * TICKS_PER_SECOND;
function isFiniteNumber7(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function validCue(cue) {
  return Boolean(cue && typeof cue === "object" && typeof cue.text === "string" && isFiniteNumber7(cue.start) && isFiniteNumber7(cue.end) && cue.end > cue.start);
}
function wordsOf(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}
function splitLongCue(cue, maxChars) {
  if (!validCue(cue)) return [];
  if (!isFiniteNumber7(maxChars) || maxChars < 1) return [cue];
  const words = wordsOf(cue.text);
  if (words.length <= 1 || cue.text.length <= maxChars) return [cue];
  const chunks = [];
  let current = [];
  let currentLen = 0;
  for (const word of words) {
    const nextLen = current.length > 0 ? currentLen + 1 + word.length : word.length;
    if (current.length > 0 && nextLen > maxChars) {
      chunks.push(current.join(" "));
      current = [];
    }
    if (current.length === 0) {
      current = [word];
      currentLen = word.length;
    } else {
      current.push(word);
      currentLen = nextLen;
    }
  }
  if (current.length > 0) chunks.push(current.join(" "));
  if (chunks.length <= 1) return [cue];
  const totalLen = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const duration = cue.end - cue.start;
  let position = cue.start;
  return chunks.map((text, index) => {
    const chunkDuration = index === chunks.length - 1 ? cue.end - position : duration * (text.length / totalLen);
    const chunk = { text, start: position, end: position + chunkDuration };
    position = chunk.end;
    return chunk;
  });
}
function splitByDuration(cue, maxDurationTicks) {
  const durationTicks2 = secToTicks(cue.end - cue.start);
  if (!isFiniteNumber7(maxDurationTicks) || maxDurationTicks < 1 || durationTicks2 <= maxDurationTicks) {
    return [cue];
  }
  const words = wordsOf(cue.text);
  if (words.length <= 1) return [cue];
  const slicesCount = Math.ceil(durationTicks2 / maxDurationTicks);
  const wordsPerSlice = Math.ceil(words.length / slicesCount);
  const slices = [];
  for (let index = 0; index < words.length; index += wordsPerSlice) {
    slices.push(words.slice(index, index + wordsPerSlice).join(" "));
  }
  const sliceDuration = (cue.end - cue.start) / slices.length;
  return slices.map((text, index) => ({
    text,
    start: cue.start + index * sliceDuration,
    end: index === slices.length - 1 ? cue.end : cue.start + (index + 1) * sliceDuration
  }));
}
function cuesToCaptionClips(cues, options = {}) {
  if (!Array.isArray(cues)) return [];
  const {
    maxChars = DEFAULT_MAX_CHARS,
    maxDurTicks = DEFAULT_MAX_DURATION_TICKS,
    fromTicks = 0,
    rangeTicks = null
  } = options;
  const rangeStart = rangeTicks && isFiniteNumber7(rangeTicks.start) ? rangeTicks.start : null;
  const rangeEnd = rangeTicks && isFiniteNumber7(rangeTicks.end) ? rangeTicks.end : null;
  const clips = [];
  for (const cue of cues) {
    if (!validCue(cue)) continue;
    for (const piece of splitLongCue(cue, maxChars)) {
      for (const slice of splitByDuration(piece, maxDurTicks)) {
        let startTicks = secToTicks(slice.start);
        let endTicks = secToTicks(slice.end);
        if (rangeStart !== null && endTicks <= rangeStart) continue;
        if (rangeEnd !== null && startTicks >= rangeEnd) continue;
        if (rangeStart !== null) startTicks = Math.max(startTicks, rangeStart);
        if (rangeEnd !== null) endTicks = Math.min(endTicks, rangeEnd);
        if (endTicks <= startTicks) continue;
        clips.push({
          text: slice.text,
          in: 0,
          out: endTicks - startTicks,
          offset: fromTicks + startTicks
        });
      }
    }
  }
  return clips;
}
var SRT_TIME = /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;
function pad(value, size) {
  return String(value).padStart(size, "0");
}
function formatSrtTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1e3));
  const hours = Math.floor(ms / 36e5);
  const minutes = Math.floor(ms % 36e5 / 6e4);
  const secs = Math.floor(ms % 6e4 / 1e3);
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(ms % 1e3, 3)}`;
}
function srtTimeToSeconds(hours, minutes, secs, millis) {
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(secs) + Number(millis.padEnd(3, "0")) / 1e3;
}
function parseSrt(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const cues = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r\n|\n/);
    const timingIndex = lines.findIndex((line) => SRT_TIME.test(line.trim()));
    if (timingIndex === -1) continue;
    const match = SRT_TIME.exec(lines[timingIndex].trim());
    const start = srtTimeToSeconds(match[1], match[2], match[3], match[4]);
    const end = srtTimeToSeconds(match[5], match[6], match[7], match[8]);
    const textLines = lines.slice(timingIndex + 1);
    while (textLines.length > 0 && textLines[textLines.length - 1].trim() === "") {
      textLines.pop();
    }
    if (textLines.length === 0 || !(end > start)) continue;
    cues.push({ text: textLines.join("\n"), start, end });
  }
  return cues;
}
function serializeSrt(cues) {
  if (!Array.isArray(cues)) return "";
  const valid = cues.filter((cue) => validCue(cue) && cue.text.trim().length > 0);
  if (valid.length === 0) return "";
  const blocks = valid.map((cue, index) => `${index + 1}
${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}
${cue.text}`);
  return `${blocks.join("\n\n")}
`;
}

// src/audioMix.mjs
function gainOf(layer) {
  return layer.audible === false ? 0 : layer.volume;
}
function playoutOf(layer, shuttle) {
  const refusal = layer.reverse === true ? "reverse" : null;
  return {
    mediaTicks: Number.isFinite(layer.sourceTicks) ? layer.sourceTicks : null,
    rate: clampedElementRate(layer.sourceRate, shuttle),
    plays: refusal === null,
    refusal
  };
}
function audioMixAt(evaluation, options = {}) {
  const sources = [];
  let footageClaimed = false;
  for (const slot of compositePlan(evaluation).slots) {
    if (slot.kind !== "footage") continue;
    if (footageClaimed || slot.role !== "paint") continue;
    footageClaimed = true;
    sources.push({
      role: "footage",
      clipId: slot.clipId,
      trackId: slot.trackId,
      trackIndex: slot.trackIndex,
      gain: gainOf(slot.layer),
      ...playoutOf(slot.layer, options.shuttle)
    });
  }
  const entries = Array.isArray(evaluation?.tracks) ? evaluation.tracks : [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry?.type !== "audio") continue;
    const layers = Array.isArray(entry.layers) ? entry.layers : [];
    for (const layer of layers) {
      if (layer?.clipId == null) continue;
      sources.push({
        role: "audio",
        clipId: layer.clipId,
        trackId: entry.id ?? null,
        trackIndex: index,
        gain: gainOf(layer),
        ...playoutOf(layer, options.shuttle)
      });
    }
  }
  return {
    at: Number.isFinite(evaluation?.at) ? evaluation.at : 0,
    sources
  };
}

// src/frames.mjs
var EDGE_GUARD_SHARE = 0.02;
function isFiniteNumber8(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function filmstripTimes(startTicks, durationTicks2, count) {
  if (!isFiniteNumber8(startTicks) || !isFiniteNumber8(durationTicks2) || durationTicks2 <= 0) return [];
  if (!isFiniteNumber8(count) || count < 1) return [];
  const total = Math.floor(count);
  const guard = durationTicks2 * EDGE_GUARD_SHARE;
  const usable = durationTicks2 - guard * 2;
  const slice = usable / total;
  const times = [];
  for (let index = 0; index < total; index++) {
    times.push(Math.round(startTicks + guard + (index + 0.5) * slice));
  }
  return times;
}
function segmentSpan(segment) {
  if (isFiniteNumber8(segment?.timeline?.start) && isFiniteNumber8(segment?.timeline?.duration)) {
    return { start: segment.timeline.start, duration: segment.timeline.duration };
  }
  if (isFiniteNumber8(segment?.offset) && isFiniteNumber8(segment?.in) && isFiniteNumber8(segment?.out) && segment.out > segment.in) {
    const speed = isFiniteNumber8(segment?.speed) && segment.speed > 0 ? segment.speed : 1;
    return {
      start: secToTicks(segment.offset),
      duration: Math.max(1, Math.round(secToTicks((segment.out - segment.in) / speed)))
    };
  }
  return null;
}
function frameTimesForSegments(segments, perSegment) {
  if (!Array.isArray(segments)) return [];
  const plans = [];
  for (const segment of segments) {
    if (!segment || typeof segment !== "object" || segment.id == null) continue;
    const span = segmentSpan(segment);
    plans.push({
      id: segment.id,
      times: span ? filmstripTimes(span.start, span.duration, perSegment) : []
    });
  }
  return plans;
}
function clampFrameTime(atTicks, startTicks, durationTicks2) {
  if (!isFiniteNumber8(startTicks)) return 0;
  if (!isFiniteNumber8(atTicks) || !isFiniteNumber8(durationTicks2) || durationTicks2 <= 0) {
    return startTicks;
  }
  return Math.min(Math.max(atTicks, startTicks), startTicks + durationTicks2);
}
var TMCUT_FRAME_MAX_TIME_SEC = 24 * 3600;
var TMCUT_FRAME_CACHE_MAX_ENTRIES = 512;
var TMCUT_FRAME_MAX_CONCURRENT = 3;
var FRAME_KEY_PATTERN = /^[0-9a-f]{8}-f\d+-w\d+$/;
var FRAME_WIDTH_DEFAULT = 320;
var FRAME_WIDTH_MIN = 16;
var FRAME_WIDTH_MAX = 1280;
var FRAME_TAIL_GUARD_SEC = 0.05;
function frameRequestMillis(atSec) {
  if (!isFiniteNumber8(atSec) || atSec < 0) return null;
  return Math.round(atSec * 1e3);
}
function frameRequestWidth(width) {
  const asked = isFiniteNumber8(width) ? width : FRAME_WIDTH_DEFAULT;
  return Math.min(FRAME_WIDTH_MAX, Math.max(FRAME_WIDTH_MIN, Math.round(asked)));
}
function isFrameCacheKey(key) {
  return typeof key === "string" && FRAME_KEY_PATTERN.test(key);
}
function frameRequestKey(fingerprint, atSec, width) {
  if (!isByteCacheKey(fingerprint)) return null;
  const millis = frameRequestMillis(atSec);
  if (millis === null) return null;
  return `${fingerprint}-f${millis}-w${frameRequestWidth(width)}`;
}
function frameTimeWithinMedia(atSec, durationSec, maxSec = TMCUT_FRAME_MAX_TIME_SEC) {
  if (!isFiniteNumber8(atSec) || atSec < 0) return null;
  const ceiling = isFiniteNumber8(durationSec) && durationSec > 0 ? Math.max(0, durationSec - FRAME_TAIL_GUARD_SEC) : isFiniteNumber8(maxSec) && maxSec > 0 ? maxSec : TMCUT_FRAME_MAX_TIME_SEC;
  return Math.min(atSec, ceiling);
}
function createFrameSlotLedger() {
  const current = /* @__PURE__ */ new Map();
  let issued = 0;
  return {
    /** Register an ask for `slot`; `superseded` is the token that just lost. */
    begin(slot, key) {
      const previous = current.get(slot);
      issued += 1;
      current.set(slot, { token: issued, key });
      return { token: issued, superseded: previous ? previous.token : null };
    },
    /** Whether this token is still the newest thing asked for in that slot. */
    isCurrent(slot, token) {
      const entry = current.get(slot);
      return entry !== void 0 && entry.token === token;
    },
    /** Stop tracking a slot its owner has gone. Returns whether it was tracked. */
    forget(slot) {
      return current.delete(slot);
    },
    /**
     * Hand back a slot from the owner that is still holding it.
     *
     * A batch asks slots, gets its answers and is done with them — but a newer
     * ask (a re-analysis of the same source under the same slot names) may have
     * taken those slots over while the batch was still decoding. Releasing by
     * token means the loser can clean up after itself without evicting the
     * owner that now has the right to paint.
     */
    release(slot, token) {
      const entry = current.get(slot);
      if (entry === void 0 || entry.token !== token) return false;
      current.delete(slot);
      return true;
    },
    /** Hand every slot back at once: the session that owns them all is over. */
    clear() {
      const released = current.size;
      current.clear();
      return released;
    },
    /** Slots still being tracked — a leak here means a component forgot to forget. */
    size() {
      return current.size;
    }
  };
}
function byFrameAgeThenKey(a, b) {
  if (a.accessedAt !== b.accessedAt) return a.accessedAt - b.accessedAt;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}
function planFrameCacheEviction(entries, maxEntries) {
  const rows = Array.isArray(entries) ? entries : [];
  const bound = Number.isInteger(maxEntries) && maxEntries > 0 ? maxEntries : 0;
  const invalid = [];
  const byKey2 = /* @__PURE__ */ new Map();
  for (const entry of rows) {
    const key = entry && typeof entry.key === "string" ? entry.key : "";
    if (!isFrameCacheKey(key)) {
      if (key) invalid.push(key);
      continue;
    }
    const accessedAt = isFiniteNumber8(entry.accessedAt) ? entry.accessedAt : 0;
    const seen = byKey2.get(key);
    if (seen && seen.accessedAt >= accessedAt) continue;
    byKey2.set(key, { key, accessedAt });
  }
  const drop = [...invalid];
  const keep = [...byKey2.values()].sort(byFrameAgeThenKey);
  while (keep.length > bound) {
    drop.push(keep.shift().key);
  }
  return { drop, keep, kept: keep.length, invalid };
}

// src/pixels.mjs
var DEFAULT_FRAME_COMPARE = Object.freeze({
  meanTolerance: 2,
  diffRatioTolerance: 1e-3,
  channelTolerance: 0
});
function isByteArray(value) {
  return value instanceof Uint8Array || value instanceof Uint8ClampedArray;
}
function finiteOr4(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}
function compareFrames(expected, actual, options = {}) {
  if (!isByteArray(expected) || !isByteArray(actual)) {
    throw new TypeError("compareFrames expects Uint8Array frames");
  }
  if (expected.length === 0 || expected.length % 4 !== 0) {
    throw new TypeError("frame length must be a non-zero multiple of 4 (RGBA)");
  }
  if (expected.length !== actual.length) {
    throw new TypeError(`frame length mismatch: ${expected.length} vs ${actual.length}`);
  }
  const channelTolerance = finiteOr4(options.channelTolerance, DEFAULT_FRAME_COMPARE.channelTolerance);
  const meanTolerance = finiteOr4(options.meanTolerance, DEFAULT_FRAME_COMPARE.meanTolerance);
  const diffRatioTolerance = finiteOr4(options.diffRatioTolerance, DEFAULT_FRAME_COMPARE.diffRatioTolerance);
  const mask = options.mask;
  if (mask !== void 0 && !isByteArray(mask)) {
    throw new TypeError("compareFrames expects a Uint8Array mask");
  }
  const totalPixels = expected.length / 4;
  if (mask && mask.length !== totalPixels) {
    throw new TypeError(`mask length mismatch: ${mask.length} vs ${totalPixels} pixels`);
  }
  let sum = 0;
  let maxChannelDelta = 0;
  let differingPixels = 0;
  let skippedPixels = 0;
  for (let pixel = 0; pixel < totalPixels; pixel++) {
    if (mask && mask[pixel] === 0) {
      skippedPixels++;
      continue;
    }
    const index = pixel * 4;
    let pixelDiffers = false;
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(expected[index + channel] - actual[index + channel]);
      sum += delta;
      if (delta > maxChannelDelta) maxChannelDelta = delta;
      if (delta > channelTolerance) pixelDiffers = true;
    }
    if (pixelDiffers) differingPixels += 1;
  }
  const assertedPixels = totalPixels - skippedPixels;
  if (assertedPixels === 0) {
    throw new TypeError("the mask leaves no pixel to assert");
  }
  const meanAbsError = sum / (assertedPixels * 4);
  const diffRatio = differingPixels / assertedPixels;
  return {
    ok: meanAbsError <= meanTolerance && diffRatio <= diffRatioTolerance,
    meanAbsError,
    maxChannelDelta,
    differingPixels,
    totalPixels,
    assertedPixels,
    skippedPixels,
    diffRatio
  };
}

// src/v1compat.mjs
var EPS = 1e-6;
function round4(value) {
  return Math.round(value * 1e4) / 1e4;
}
function num2(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
var SECONDS = {
  // flat seconds -> v3 source ticks (legacy files)
  toSource: (value) => Math.max(0, secToTicks(num2(value))),
  // v3 ticks -> flat seconds (legacy files, 4-decimal rounding)
  fromSource: (ticks) => round4(ticksToSec(ticks)),
  defaultOut: 5
};
var TICKS = {
  // flat ticks -> v3 source ticks (identity, rounded to integer)
  toSource: (value) => Math.max(0, Math.round(num2(value))),
  // v3 ticks -> flat ticks (identity, rounded to integer)
  fromSource: (ticks) => Math.round(ticks),
  defaultOut: 5 * TICKS_PER_SECOND
};
function clipToV3(item, trackType, conv) {
  const speed = num2(item.speed, 1) > 0 ? num2(item.speed, 1) : 1;
  const sourceIn = Math.max(0, conv.toSource(item.in));
  const sourceOut = Math.max(sourceIn + 1, conv.toSource(item.out ?? conv.defaultOut));
  const scale = num2(item.scale, 100) / 100;
  const opacity = num2(item.opacity, 100);
  return {
    id: item.id,
    type: trackType,
    name: item.name ?? item.text ?? "Clip",
    assetId: null,
    locator: item.src ? { runtime: "electron", path: item.src } : null,
    source: { in: sourceIn, out: sourceOut },
    timeline: {
      start: Math.max(0, Math.round(conv.toSource(item.offset ?? 0))),
      duration: Math.max(1, Math.round((sourceOut - sourceIn) / speed))
    },
    speed,
    reverse: item.reverse ?? false,
    groupId: item.groupId ?? null,
    linkId: item.linkId ?? null,
    transform: {
      x: num2(item.x),
      y: num2(item.y),
      scaleX: scale,
      scaleY: scale,
      rotation: num2(item.rotation),
      opacity: Math.min(1, Math.max(0, opacity > 1 ? opacity / 100 : opacity))
    },
    fit: item.fit,
    focusX: item.focusX,
    focusY: item.focusY,
    cropRect: item.cropRect,
    blend: item.blend,
    mask: item.mask,
    // Ramp control points are clip-local TICKS in BOTH bridges: the speed
    // ramp and the ticks store landed together, so no legacy file holds
    // seconds here and the field must not go through the time converter.
    speedPoints: item.speedPoints,
    volume: item.volume,
    text: item.text,
    color: item.color,
    fontSize: item.fontSize,
    fontFamily: item.fontFamily,
    fontFile: item.fontFile,
    bold: item.bold,
    italic: item.italic,
    align: item.align,
    shadow: item.shadow,
    stroke: item.stroke,
    shadowColor: item.shadowColor,
    strokeColor: item.strokeColor,
    bgColor: item.bgColor,
    effects: Array.isArray(item.effects) ? item.effects : [],
    keyframes: Array.isArray(item.keyframes) ? item.keyframes : [],
    transitionIn: item.transitionIn,
    fade: item.fade,
    animIn: item.animIn,
    animInDuration: item.animInDuration,
    animOut: item.animOut,
    animOutDuration: item.animOutDuration,
    stabilize: item.stabilize,
    stabilizeLevel: item.stabilizeLevel,
    stabilizedPath: item.stabilizedPath,
    stabilizeStatus: item.stabilizeStatus
  };
}
function v1TracksToV3(tracks) {
  return tracksToV3(tracks, SECONDS);
}
function ticksTracksToV3(tracks) {
  return tracksToV3(tracks, TICKS);
}
function tracksToV3(tracks, conv) {
  return {
    version: 3,
    tracks: (tracks ?? []).map((track) => ({
      id: track.id,
      type: track.type,
      name: track.name,
      muted: track.muted,
      locked: track.locked,
      hidden: track.hidden,
      items: (track.items ?? []).map((item) => clipToV3(item, track.type, conv))
    })),
    markers: []
  };
}
function v1ClipToV3(item, trackType) {
  return clipToV3(item, trackType, SECONDS);
}
function ticksClipToV3(item, trackType) {
  return clipToV3(item, trackType, TICKS);
}
function v3ClipToFlat(clip, conv) {
  const patch = {
    id: clip.id,
    name: clip.name,
    src: clip.locator?.path,
    text: clip.text,
    color: clip.color,
    fontSize: clip.fontSize,
    fontFamily: clip.fontFamily,
    fontFile: clip.fontFile,
    bold: clip.bold,
    italic: clip.italic,
    align: clip.align,
    shadow: clip.shadow,
    stroke: clip.stroke,
    shadowColor: clip.shadowColor,
    strokeColor: clip.strokeColor,
    bgColor: clip.bgColor,
    in: conv.fromSource(clip.source.in),
    out: conv.fromSource(clip.source.out),
    offset: conv.fromSource(clip.timeline.start),
    speed: clip.speed,
    reverse: clip.reverse ?? false,
    opacity: round4(clip.transform.opacity * 100),
    scale: round4((clip.transform.scaleX + clip.transform.scaleY) / 2 * 100),
    x: round4(clip.transform.x),
    y: round4(clip.transform.y),
    rotation: clip.transform.rotation,
    volume: clip.volume,
    fit: clip.fit,
    focusX: clip.focusX,
    focusY: clip.focusY,
    cropRect: clip.cropRect,
    blend: clip.blend,
    mask: clip.mask,
    speedPoints: clip.speedPoints,
    effects: clip.effects ?? [],
    keyframes: clip.keyframes ?? [],
    transitionIn: clip.transitionIn,
    fade: clip.fade,
    animIn: clip.animIn,
    animInDuration: clip.animInDuration,
    animOut: clip.animOut,
    animOutDuration: clip.animOutDuration,
    stabilize: clip.stabilize,
    stabilizeLevel: clip.stabilizeLevel,
    stabilizedPath: clip.stabilizedPath,
    stabilizeStatus: clip.stabilizeStatus,
    groupId: clip.groupId ?? null,
    linkId: clip.linkId ?? null
  };
  return patch;
}
function v3ClipToV1(clip) {
  return v3ClipToFlat(clip, SECONDS);
}
function v3ClipToTicks(clip) {
  return v3ClipToFlat(clip, TICKS);
}
var COMPARE_NUMBERS = ["in", "out", "offset", "speed", "opacity", "scale", "x", "y", "rotation", "volume", "fontSize", "focusX", "focusY", "animInDuration", "animOutDuration"];
var COMPARE_STRINGS = ["name", "src", "text", "color", "fit", "groupId", "linkId", "fontFamily", "fontFile", "align", "animIn", "animOut", "stabilizeLevel", "stabilizedPath", "stabilizeStatus", "blend", "shadowColor", "strokeColor", "bgColor"];
var COMPARE_FLAGS = ["bold", "italic", "shadow", "stroke", "stabilize", "reverse"];
function sameEffects(a, b) {
  const arrA = Array.isArray(a) ? a : [];
  const arrB = Array.isArray(b) ? b : [];
  if (arrA.length !== arrB.length) return false;
  for (let i = 0; i < arrA.length; i++) {
    if (arrA[i].type !== arrB[i].type) return false;
    const pa = arrA[i].params || {};
    const pb = arrB[i].params || {};
    const keysA = Object.keys(pa).sort();
    const keysB = Object.keys(pb).sort();
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!sameValue(pa[k], pb[k])) return false;
    }
  }
  return true;
}
function sameKeyframes(a, b) {
  const arrA = Array.isArray(a) ? a : [];
  const arrB = Array.isArray(b) ? b : [];
  if (arrA.length !== arrB.length) return false;
  for (let i = 0; i < arrA.length; i++) {
    if (!sameValue(arrA[i].t, arrB[i].t)) return false;
    if (arrA[i].prop !== arrB[i].prop) return false;
    if (!sameValue(arrA[i].value, arrB[i].value)) return false;
  }
  return true;
}
function sameValue(a, b) {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= EPS;
  return a === b;
}
function sameTransition(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (a.type !== b.type) return false;
  return sameValue(num2(a.duration, 0), num2(b.duration, 0));
}
function sameFade(a, b) {
  const aIn = num2(a?.in, 0);
  const aOut = num2(a?.out, 0);
  const bIn = num2(b?.in, 0);
  const bOut = num2(b?.out, 0);
  const aSet = aIn > 0 || aOut > 0;
  const bSet = bIn > 0 || bOut > 0;
  if (aSet !== bSet) return false;
  if (!aSet) return true;
  return sameValue(aIn, bIn) && sameValue(aOut, bOut);
}
function sameCropRect(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return sameValue(num2(a.x, 0), num2(b.x, 0)) && sameValue(num2(a.y, 0), num2(b.y, 0)) && sameValue(num2(a.w, 1), num2(b.w, 1)) && sameValue(num2(a.h, 1), num2(b.h, 1));
}
function sameMask(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if ((a.shape ?? null) !== (b.shape ?? null)) return false;
  if ((a.axis ?? null) !== (b.axis ?? null)) return false;
  if ((a.invert ?? false) !== (b.invert ?? false)) return false;
  return sameValue(num2(a.x, 0), num2(b.x, 0)) && sameValue(num2(a.y, 0), num2(b.y, 0)) && sameValue(num2(a.w, 1), num2(b.w, 1)) && sameValue(num2(a.h, 1), num2(b.h, 1)) && sameValue(num2(a.feather, 0), num2(b.feather, 0)) && sameValue(num2(a.rotation, 0), num2(b.rotation, 0));
}
function sameRamp(a, b) {
  const arrA = Array.isArray(a) ? a : [];
  const arrB = Array.isArray(b) ? b : [];
  if (arrA.length !== arrB.length) return false;
  for (let i = 0; i < arrA.length; i++) {
    if (!sameValue(num2(arrA[i]?.t, 0), num2(arrB[i]?.t, 0))) return false;
    if (!sameValue(num2(arrA[i]?.speed, 1), num2(arrB[i]?.speed, 1))) return false;
  }
  return true;
}
function v1MatchesV3(item, clip) {
  return matchesV3(item, clip, SECONDS);
}
function ticksMatchesV3(item, clip) {
  return matchesV3(item, clip, TICKS);
}
function matchesV3(item, clip, conv) {
  const patch = v3ClipToFlat(clip, conv);
  for (const key of COMPARE_NUMBERS) {
    if (!sameValue(num2(item[key], 0), num2(patch[key], 0))) return false;
  }
  for (const key of COMPARE_STRINGS) {
    if ((item[key] ?? null) !== (patch[key] ?? null)) return false;
  }
  for (const key of COMPARE_FLAGS) {
    if ((item[key] ?? false) !== (patch[key] ?? false)) return false;
  }
  if (!sameTransition(item.transitionIn, patch.transitionIn)) return false;
  if (!sameFade(item.fade, patch.fade)) return false;
  if (!sameCropRect(item.cropRect, patch.cropRect)) return false;
  if (!sameMask(item.mask, patch.mask)) return false;
  if (!sameRamp(item.speedPoints, patch.speedPoints)) return false;
  if (!sameEffects(item.effects, patch.effects)) return false;
  if (!sameKeyframes(item.keyframes, patch.keyframes)) return false;
  return true;
}
function syncV3Result(v1Tracks, afterV3) {
  return syncResult(v1Tracks, afterV3, SECONDS);
}
function syncTicksResult(v1Tracks, afterV3) {
  return syncResult(v1Tracks, afterV3, TICKS);
}
function syncResult(flatTracks, afterV3, conv) {
  const stats = { added: 0, updated: 0, removed: 0 };
  const flatById = /* @__PURE__ */ new Map();
  for (const track of flatTracks ?? []) {
    for (let index = 0; index < (track.items ?? []).length; index += 1) {
      flatById.set(track.items[index].id, { track, index });
    }
  }
  const v3Ids = /* @__PURE__ */ new Set();
  for (const v3Track of afterV3?.tracks ?? []) {
    let flatTrack = (flatTracks ?? []).find((track) => track.id === v3Track.id);
    if (!flatTrack) {
      flatTrack = { id: v3Track.id, type: v3Track.type, name: v3Track.name ?? v3Track.type, items: [] };
      flatTracks.push(flatTrack);
    }
    const trackPatch = {};
    if (v3Track.muted !== void 0) trackPatch.muted = !!v3Track.muted;
    if (v3Track.locked !== void 0) trackPatch.locked = !!v3Track.locked;
    if (v3Track.hidden !== void 0) trackPatch.hidden = !!v3Track.hidden;
    if (Object.keys(trackPatch).length > 0) {
      Object.assign(flatTrack, trackPatch);
    }
    for (const clip of v3Track.items ?? []) {
      v3Ids.add(clip.id);
      const location = flatById.get(clip.id);
      if (!location) {
        flatTrack.items.push(v3ClipToFlat(clip, conv));
        stats.added += 1;
      } else if (!matchesV3(location.track.items[location.index], clip, conv)) {
        Object.assign(location.track.items[location.index], v3ClipToFlat(clip, conv));
        stats.updated += 1;
      }
    }
  }
  for (const track of flatTracks ?? []) {
    for (let index = (track.items ?? []).length - 1; index >= 0; index -= 1) {
      if (!v3Ids.has(track.items[index].id)) {
        track.items.splice(index, 1);
        stats.removed += 1;
      }
    }
  }
  const v3TrackIds = new Set((afterV3?.tracks ?? []).map((track) => track.id));
  for (let index = (flatTracks ?? []).length - 1; index >= 0; index -= 1) {
    if (!v3TrackIds.has(flatTracks[index].id)) flatTracks.splice(index, 1);
  }
  return stats;
}

// src/analysis.mjs
function round3(value) {
  return Math.round(value * 1e3) / 1e3;
}
function clamp012(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
function overlapDuration(start, end, ranges) {
  let total = 0;
  for (const range of ranges ?? []) {
    const overlap = Math.min(end, range.end) - Math.max(start, range.start);
    if (overlap > 0) total += overlap;
  }
  return total;
}
function triangularPeak(duration, low, peak, high) {
  if (duration <= low || duration >= high) return 0;
  if (duration <= peak) return (duration - low) / (peak - low);
  return 1 - (duration - peak) / (high - peak);
}
var PROFILES2 = ["viral-shorts", "podcast-summary", "cinematic-vlog"];
function scoreForProfile(scene, silenceRatio, speechRatio, profile) {
  const duration = scene.end - scene.start;
  if (profile === "podcast-summary") {
    if (silenceRatio >= 0.9) return { score: 0.05, reason: "silence" };
    return { score: clamp012(0.15 + speechRatio * 0.85), reason: speechRatio > 0.5 ? "speech" : "filler" };
  }
  if (profile === "cinematic-vlog") {
    const stability = triangularPeak(duration, 2, 8, 25);
    const score2 = clamp012(0.2 + stability * 0.7) * (1 - silenceRatio * 0.5);
    if (silenceRatio >= 0.9) return { score: 0.05, reason: "silence" };
    return { score: score2, reason: stability > 0.5 ? "stable-shot" : "cutaway" };
  }
  const punch = triangularPeak(duration, 1.5, 5, 12);
  const score = clamp012(0.1 + punch * 0.75 + speechRatio * 0.15) * (1 - silenceRatio * 0.8);
  if (silenceRatio >= 0.9) return { score: 0.05, reason: "silence" };
  if (duration > 20) return { score: clamp012(score * 0.5), reason: "too-long" };
  return { score, reason: speechRatio > 0.4 ? "speech" : punch > 0.5 ? "action" : "filler" };
}
var DEFAULT_FILLER_WORDS = [
  // Vietnamese filler words & hesitation markers
  "\u1EEBm",
  "\u1EEB",
  "\xE0",
  "\u1EDD",
  "\u01A1",
  "h\u1EA3",
  "th\xEC",
  "l\xE0",
  "ki\u1EC3u",
  "ki\u1EC3u nh\u01B0",
  "nh\u1EC9",
  "nh\xE9",
  "n\xE0y n\u1ECD",
  "n\xF3i chung l\xE0",
  "\u0111\u1EA1i lo\u1EA1i l\xE0",
  "xong r\u1ED3i",
  // English filler words
  "um",
  "uh",
  "ah",
  "er",
  "like",
  "you know",
  "basically",
  "literally",
  "sort of",
  "kind of",
  "actually",
  "i mean",
  "right"
];
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function detectFillerWords(text, options) {
  const rawText = String(text ?? "").trim();
  if (!rawText) return { count: 0, words: [], fillerRatio: 0 };
  const customWords = Array.isArray(options?.customWords) ? options.customWords : [];
  const dictionary = [...DEFAULT_FILLER_WORDS, ...customWords].map((w) => String(w).trim().toLowerCase()).filter(Boolean);
  const normalized = rawText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return { count: 0, words: [], fillerRatio: 0 };
  const words = normalized.split(" ").filter(Boolean);
  const totalWords = words.length;
  if (totalWords === 0) return { count: 0, words: [], fillerRatio: 0 };
  const matched = [];
  let detectedCount = 0;
  const multiWordFillers = dictionary.filter((w) => w.includes(" "));
  let workingText = normalized;
  for (const phrase of multiWordFillers) {
    const regex = new RegExp(`(^|\\s)${escapeRegex(phrase)}(?=\\s|$)`, "gi");
    const matches = workingText.match(regex);
    if (matches) {
      const phraseWordCount = phrase.split(" ").length;
      const count = matches.length;
      detectedCount += count * phraseWordCount;
      if (!matched.includes(phrase)) matched.push(phrase);
      workingText = workingText.replace(regex, " ");
    }
  }
  const singleWordFillers = new Set(dictionary.filter((w) => !w.includes(" ")));
  const remainingWords = workingText.split(" ").filter(Boolean);
  for (const word of remainingWords) {
    if (singleWordFillers.has(word)) {
      detectedCount += 1;
      if (!matched.includes(word)) matched.push(word);
    }
  }
  const fillerRatio = Math.min(1, Math.round(detectedCount / totalWords * 100) / 100);
  return {
    count: detectedCount,
    words: matched,
    fillerRatio
  };
}
function analyzeTranscriptSegment(text, options) {
  const rawText = String(text ?? "").trim();
  if (!rawText) {
    return {
      isFiller: false,
      isHighlight: false,
      scoreModifier: 0,
      matchedKeywords: [],
      detectedFillers: []
    };
  }
  const filterFillers = options?.filterFillerWords !== false;
  const keywords = Array.isArray(options?.keywords) ? options.keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean) : [];
  const fillerResult = filterFillers ? detectFillerWords(rawText, { customWords: options?.customFillerWords }) : { count: 0, words: [], fillerRatio: 0 };
  const isFiller = filterFillers && (fillerResult.fillerRatio >= 0.25 || fillerResult.count >= 2 && fillerResult.fillerRatio >= 0.15);
  const matchedKeywords = [];
  const normalized = rawText.toLowerCase();
  for (const kw of keywords) {
    if (normalized.includes(kw) && !matchedKeywords.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }
  const isHighlight = matchedKeywords.length > 0;
  let scoreModifier = 0;
  if (isFiller) {
    scoreModifier = -0.35;
  } else if (isHighlight) {
    scoreModifier = 0.25;
  }
  return {
    isFiller,
    isHighlight,
    scoreModifier,
    matchedKeywords,
    detectedFillers: fillerResult.words
  };
}
function blendSceneInterest(scene, aiScores) {
  const items = Array.isArray(aiScores) ? aiScores : [];
  let beats = 0;
  let weighted = 0;
  for (const item of items) {
    const start = Number(item?.start);
    const end = Number(item?.end);
    const interest = Number(item?.interest);
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(interest)) continue;
    const overlap = overlapDuration(scene.start, scene.end, [{ start, end }]);
    if (overlap <= 0) continue;
    beats += overlap;
    weighted += overlap * Math.min(1, Math.max(0, interest));
  }
  if (beats <= 0) return null;
  return weighted / beats;
}
function scoreSegments(input) {
  const scenes = Array.isArray(input?.scenes) ? input.scenes : [];
  const silences = Array.isArray(input?.silences) ? input.silences : [];
  const rawSpeech = Array.isArray(input?.speech) ? input.speech : [];
  const rawTranscript = Array.isArray(input?.transcript) ? input.transcript : [];
  const speech = rawSpeech.length > 0 ? rawSpeech : rawTranscript;
  const transcript = rawTranscript.length > 0 ? rawTranscript : rawSpeech;
  const profile = PROFILES2.includes(input?.profile) ? input.profile : "viral-shorts";
  const assetId = typeof input?.assetId === "string" ? input.assetId : "";
  const filterFillerWords = input?.filterFillerWords !== false;
  const keywords = Array.isArray(input?.keywords) ? input.keywords : [];
  const customFillerWords = Array.isArray(input?.customFillerWords) ? input.customFillerWords : [];
  const rawAiScores = Array.isArray(input?.aiScores) ? input.aiScores : [];
  const aiWeight = Math.min(0.5, Math.max(0, Number(input?.aiWeight ?? 0.25) || 0));
  const aiUsed = rawAiScores.length > 0 && aiWeight > 0;
  const segments = scenes.map((scene) => {
    const duration = Math.max(0, scene.end - scene.start);
    const silenceRatio = duration > 0 ? clamp012(overlapDuration(scene.start, scene.end, silences) / duration) : 1;
    const speechRatio = duration > 0 ? clamp012(overlapDuration(scene.start, scene.end, speech) / duration) : 0;
    let { score, reason } = scoreForProfile(scene, silenceRatio, speechRatio, profile);
    const overlappingTexts = transcript.filter((item) => item?.text && item.start < scene.end && item.end > scene.start).map((item) => String(item.text).trim()).filter(Boolean);
    const fullTranscriptText = overlappingTexts.join(" ");
    let hasFillerWords = false;
    let detectedFillers = void 0;
    let isHighlight = false;
    let matchedKeywords = void 0;
    if (fullTranscriptText.length > 0) {
      const analysis = analyzeTranscriptSegment(fullTranscriptText, {
        filterFillerWords,
        keywords,
        customFillerWords
      });
      if (analysis.isFiller) {
        hasFillerWords = true;
        detectedFillers = analysis.detectedFillers;
        score = Math.max(0.05, clamp012(score * 0.4));
        reason = "filler-word";
      } else if (analysis.isHighlight) {
        isHighlight = true;
        matchedKeywords = analysis.matchedKeywords;
        score = clamp012(score + analysis.scoreModifier);
        reason = "highlight";
      }
    }
    let aiInterest;
    if (aiUsed) {
      const interest = blendSceneInterest(scene, rawAiScores);
      if (interest !== null) {
        aiInterest = Math.round(interest * 1e3) / 1e3;
        const blended = score + (interest - score) * aiWeight;
        score = reason === "filler-word" ? Math.min(score, blended) : clamp012(blended);
        score = Math.max(0.05, Math.round(score * 1e3) / 1e3);
      }
    }
    const seg = {
      start: round3(scene.start),
      end: round3(scene.end),
      score: Math.round(score * 1e3) / 1e3,
      reason,
      thumb: round3(scene.start + duration / 2)
    };
    if (aiInterest !== void 0) seg.aiInterest = aiInterest;
    if (fullTranscriptText.length > 0) seg.transcriptText = fullTranscriptText;
    if (hasFillerWords) {
      seg.hasFillerWords = true;
      seg.detectedFillers = detectedFillers;
    }
    if (isHighlight) {
      seg.isHighlight = true;
      seg.matchedKeywords = matchedKeywords;
    }
    return seg;
  }).filter((segment) => segment.end > segment.start);
  return {
    version: 1,
    assetId,
    profile,
    segments,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    analyzerVersion: input?.analyzerVersion || "transcript-v2"
  };
}

// src/detection.mjs
var TMCUT_SCENE_THRESHOLD = 0.18;
var TMCUT_SCENE_SAMPLE_HZ = 5;
var TMCUT_SILENCE_NOISE_DB = -30;
var TMCUT_SILENCE_MIN_DURATION_SEC = 0.5;
var TMCUT_SILENCE_WINDOW_SEC = 0.02;
var TMCUT_SILENCE_FLOOR_DBFS = -120;
var TMCUT_SCENE_GRID_CELLS = 8;
var SHOT_MIN_GAP_SEC = 0.04;
var SHOT_MIN_LENGTH_SEC = 0.2;
var LUMA_WEIGHTS = [0.299, 0.587, 0.114];
function isFiniteNumber9(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function round2(value) {
  return Math.round(value * 100) / 100;
}
function round32(value) {
  return Math.round(value * 1e3) / 1e3;
}
function round42(value) {
  return Math.round(value * 1e4) / 1e4;
}
function optionNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function sceneSampleTimes(startTicks, durationTicks2, sampleHz = TMCUT_SCENE_SAMPLE_HZ) {
  if (!isFiniteNumber9(sampleHz) || sampleHz <= 0) return [];
  if (!isFiniteNumber9(startTicks) || !isFiniteNumber9(durationTicks2) || durationTicks2 <= 0) return [];
  const count = Math.floor(ticksToSec(durationTicks2) * sampleHz);
  return filmstripTimes(startTicks, durationTicks2, count);
}
function lumaOf(red, green, blue) {
  const channels = [red, green, blue];
  let total = 0;
  for (let index = 0; index < 3; index++) {
    const raw = Number(channels[index]);
    if (!Number.isFinite(raw)) return Number.NaN;
    total += (raw < 0 ? 0 : raw > 255 ? 255 : raw) * LUMA_WEIGHTS[index];
  }
  return Math.round(total);
}
function lumaCells(rgba, width, height, cells = TMCUT_SCENE_GRID_CELLS) {
  const side = Number(cells);
  const columns = Number(width);
  const rows = Number(height);
  if (!Number.isInteger(side) || side <= 0) return [];
  if (!Number.isInteger(columns) || columns <= 0) return [];
  if (!Number.isInteger(rows) || rows <= 0) return [];
  const length = rgba?.length ?? 0;
  if (length < columns * rows * 4) return [];
  const total = new Float64Array(side * side);
  const counted = new Float64Array(side * side);
  for (let y = 0; y < rows; y++) {
    const cellY = Math.floor(y * side / rows);
    for (let x = 0; x < columns; x++) {
      const offset = (y * columns + x) * 4;
      const luma = lumaOf(rgba[offset], rgba[offset + 1], rgba[offset + 2]);
      if (!Number.isFinite(luma)) return [];
      const slot = cellY * side + Math.floor(x * side / columns);
      total[slot] += luma;
      counted[slot] += 1;
    }
  }
  const out = [];
  for (let slot = 0; slot < total.length; slot++) out.push(round2(total[slot] / counted[slot]));
  return out;
}
function sceneScore(previous, next) {
  const a = previous;
  const b = next;
  const length = a?.length ?? 0;
  if (length === 0 || b?.length !== length) return null;
  let total = 0;
  for (let index = 0; index < length; index++) {
    const left = Number(a[index]);
    const right = Number(b[index]);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
    total += Math.abs(left - right);
  }
  return round42(total / length / 255);
}
function sceneCuts(times, grids, options = {}) {
  const threshold = optionNumber(options.threshold, TMCUT_SCENE_THRESHOLD);
  const instants = Array.isArray(times) ? times : [];
  const series = Array.isArray(grids) ? grids : [];
  if (instants.length < 2 || series.length < 2) return [];
  const cuts = [];
  for (let index = 1; index < instants.length; index++) {
    const at = Number(instants[index]);
    if (!Number.isFinite(at)) continue;
    const score = sceneScore(series[index - 1], series[index]);
    if (score === null) continue;
    if (score > threshold) cuts.push(round32(at));
  }
  return cuts;
}
function cutsToShots(cutSeconds, durationSec, options = {}) {
  const minGap = optionNumber(options.minGapSec, SHOT_MIN_GAP_SEC);
  const minShot = optionNumber(options.minShotSec, SHOT_MIN_LENGTH_SEC);
  const duration = isFiniteNumber9(durationSec) && durationSec > 0 ? durationSec : 0;
  const raw = Array.isArray(cutSeconds) ? cutSeconds.slice() : [];
  raw.sort((left, right) => Number(left) - Number(right));
  const cuts = [0];
  for (const value of raw) {
    const time = Number(value);
    if (!Number.isFinite(time) || time <= 0) continue;
    if (duration > 0 && time >= duration) continue;
    if (time > cuts[cuts.length - 1] + minGap) cuts.push(time);
  }
  const end = duration > 0 ? duration : cuts[cuts.length - 1];
  const shots = [];
  for (let index = 0; index < cuts.length; index++) {
    const start = cuts[index];
    const stop = index + 1 < cuts.length ? cuts[index + 1] : end;
    if (stop - start >= minShot) shots.push({ start: round32(start), end: round32(stop) });
  }
  return shots;
}
function dbfsOf(magnitude) {
  const value = Number(magnitude);
  if (!Number.isFinite(value) || value <= 0) return TMCUT_SILENCE_FLOOR_DBFS;
  return round2(20 * Math.log10(value));
}
function peakLevelSeries(samples, sampleRate, windowSec = TMCUT_SILENCE_WINDOW_SEC) {
  const rate = Number(sampleRate);
  const window = Number(windowSec);
  const length = samples?.length ?? 0;
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(window) || window <= 0) return [];
  if (length === 0) return [];
  const size = Math.max(1, Math.round(rate * window));
  const levels = [];
  for (let start = 0; start < length; start += size) {
    const stop = Math.min(start + size, length);
    let loudest = 0;
    for (let index = start; index < stop; index++) {
      const sample = Number(samples[index]);
      if (!Number.isFinite(sample)) continue;
      const magnitude = sample < 0 ? -sample : sample;
      if (magnitude > loudest) loudest = magnitude;
    }
    levels.push(dbfsOf(loudest));
  }
  return levels;
}
function loudestPeakSeries(channels, sampleRate, windowSec = TMCUT_SILENCE_WINDOW_SEC) {
  const list = Array.isArray(channels) ? channels : Array.from(channels ?? []);
  const series = [];
  for (const channel of list) {
    const levels2 = peakLevelSeries(channel, sampleRate, windowSec);
    if (levels2.length > 0) series.push(levels2);
  }
  if (series.length === 0) return [];
  const width = series.reduce((longest, levels2) => Math.max(longest, levels2.length), 0);
  const levels = [];
  for (let index = 0; index < width; index++) {
    let loudest = Number.NEGATIVE_INFINITY;
    for (const channel of series) {
      const level = channel[index];
      if (level === void 0) continue;
      if (level > loudest) loudest = level;
    }
    levels.push(loudest);
  }
  return levels;
}
function pcmHeadTrim(askedSec, deliveredSec, sampleRate) {
  const asked = Number(askedSec);
  const delivered = Number(deliveredSec);
  const rate = Number(sampleRate);
  if (!Number.isFinite(asked) || !Number.isFinite(delivered)) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.max(0, Math.round((asked - delivered) * rate));
}
function silenceSpans(levels, options = {}) {
  const windowSec = optionNumber(options.windowSec, TMCUT_SILENCE_WINDOW_SEC);
  const noiseDb = optionNumber(options.noiseDb, TMCUT_SILENCE_NOISE_DB);
  const minDuration = optionNumber(options.minDurationSec, TMCUT_SILENCE_MIN_DURATION_SEC);
  const offsetSec = Math.max(0, optionNumber(options.offsetSec, 0));
  const durationSec = Number(options.durationSec);
  const list = Array.isArray(levels) ? levels : Array.from(levels ?? []);
  if (windowSec <= 0 || minDuration <= 0 || list.length === 0) return [];
  const limit = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : list.length * windowSec;
  const spans = [];
  let open = -1;
  for (let index = 0; index <= list.length; index++) {
    const level = index < list.length ? Number(list[index]) : Number.POSITIVE_INFINITY;
    const quiet = Number.isFinite(level) && level <= noiseDb;
    if (quiet && open < 0) open = index;
    if (!quiet && open >= 0) {
      const start = offsetSec + open * windowSec;
      const stop = offsetSec + Math.min(index * windowSec, limit);
      if (stop - start >= minDuration) spans.push({ start: round32(start), end: round32(stop) });
      open = -1;
    }
  }
  return spans;
}

// src/folders.mjs
var folderCounter = 0;
function nextFolderId() {
  folderCounter += 1;
  return `folder_${Date.now().toString(36)}_${folderCounter.toString(36)}`;
}
function assertFolderList(folders) {
  if (!Array.isArray(folders)) {
    throw new Error("folders must be an array");
  }
}
var FOLDER_TAG_COLORS = [
  "#3b82f6",
  // blue / primary
  "#10b981",
  // emerald
  "#f59e0b",
  // amber
  "#ef4444",
  // rose / red
  "#8b5cf6",
  // violet
  "#06b6d4",
  // cyan
  "#ec4899",
  // pink
  "#64748b"
  // slate / neutral
];
function createFolder(folders, input = {}) {
  assertFolderList(folders);
  const name = typeof input.name === "string" && input.name.trim() ? input.name.trim() : "New Folder";
  const folder = {
    id: input.id ?? nextFolderId(),
    name,
    color: input.color ?? FOLDER_TAG_COLORS[0],
    projectId: input.projectId ?? null,
    createdAt: input.createdAt ?? Date.now()
  };
  folders.push(folder);
  return folder;
}
function renameFolder(folders, folderId, newName) {
  assertFolderList(folders);
  if (!folderId || typeof newName !== "string" || !newName.trim()) return false;
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return false;
  folder.name = newName.trim();
  return true;
}
function updateFolderColor(folders, folderId, color) {
  assertFolderList(folders);
  if (!folderId || typeof color !== "string") return false;
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return false;
  folder.color = color;
  return true;
}
function removeFolder(folders, folderId) {
  assertFolderList(folders);
  const idx = folders.findIndex((f) => f.id === folderId);
  if (idx === -1) return false;
  folders.splice(idx, 1);
  return true;
}
function getFolder(folders, folderId) {
  assertFolderList(folders);
  return folders.find((f) => f.id === folderId) ?? null;
}
function setAssetFolder(asset, folderId, projectId) {
  if (!asset || typeof asset !== "object") return false;
  const targetId = folderId ?? null;
  if (projectId) {
    if (!asset.folderByProject || typeof asset.folderByProject !== "object") {
      asset.folderByProject = {};
    }
    asset.folderByProject[projectId] = targetId;
  } else {
    asset.folderId = targetId;
  }
  return true;
}
function getAssetFolder(asset, projectId) {
  if (!asset || typeof asset !== "object") return null;
  if (projectId && asset.folderByProject && Object.prototype.hasOwnProperty.call(asset.folderByProject, projectId)) {
    return asset.folderByProject[projectId];
  }
  return asset.folderId ?? null;
}
function filterAssetsByFolder(assets, folderId, projectId) {
  if (!Array.isArray(assets)) return [];
  if (!folderId) return assets.slice();
  if (folderId === "__unassigned__") {
    return assets.filter((a) => !getAssetFolder(a, projectId));
  }
  return assets.filter((a) => getAssetFolder(a, projectId) === folderId);
}
function getFolderCounts(folders, assets, projectId) {
  assertFolderList(folders);
  const counts = {
    total: Array.isArray(assets) ? assets.length : 0,
    unassigned: 0
  };
  for (const f of folders) {
    counts[f.id] = 0;
  }
  if (!Array.isArray(assets)) return counts;
  for (const a of assets) {
    const fid = getAssetFolder(a, projectId);
    if (fid && Object.prototype.hasOwnProperty.call(counts, fid)) {
      counts[fid] += 1;
    } else {
      counts.unassigned += 1;
    }
  }
  return counts;
}

// src/templates.mjs
var TEMPLATE_SCHEMA_VERSION = 1;
var TEMPLATE_MIN_SUPPORTED_VERSION = 1;
var templateCounter = 0;
function uid(prefix = "tpl") {
  templateCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${templateCounter.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  return JSON.parse(JSON.stringify(obj));
}
function fileNameFromSrc(src) {
  const parts = String(src).split(/[\\/]/);
  return parts[parts.length - 1] || "";
}
function localAssetFingerprint(src) {
  return fileNameFromSrc(src);
}
var INDUSTRY_CATALOG = [
  { id: "general", label: "Any Industry", icon: "i-lucide-globe" },
  { id: "fnb", label: "Food & Beverage", icon: "i-lucide-utensils-crossed" },
  { id: "beauty", label: "Beauty & Spa", icon: "i-lucide-sparkles" },
  { id: "fashion", label: "Fashion & Retail", icon: "i-lucide-shirt" },
  { id: "health", label: "Health & Fitness", icon: "i-lucide-dumbbell" },
  { id: "realestate", label: "Real Estate", icon: "i-lucide-building-2" },
  { id: "education", label: "Education", icon: "i-lucide-graduation-cap" },
  { id: "travel", label: "Travel & Hospitality", icon: "i-lucide-plane" },
  { id: "tech", label: "Tech & SaaS", icon: "i-lucide-rocket" },
  { id: "finance", label: "Finance & Insurance", icon: "i-lucide-landmark" },
  { id: "automotive", label: "Automotive", icon: "i-lucide-car" },
  { id: "medical", label: "Healthcare & Clinic", icon: "i-lucide-stethoscope" },
  { id: "services", label: "Local Services", icon: "i-lucide-wrench" },
  { id: "events", label: "Wedding & Events", icon: "i-lucide-heart-handshake" },
  { id: "ecommerce", label: "E-commerce", icon: "i-lucide-shopping-bag" },
  { id: "pets", label: "Pets", icon: "i-lucide-paw-print" },
  { id: "creator", label: "Creator & Media", icon: "i-lucide-clapperboard" }
];
var PACK_CANVAS = {
  "9:16": { width: 1080, height: 1920, fps: 30 },
  "16:9": { width: 1920, height: 1080, fps: 30 },
  "1:1": { width: 1080, height: 1080, fps: 30 }
};
var PACK_ACCENT = "#ffd166";
var packMs = (seconds) => Math.round(seconds * TICKS_PER_SECOND);
function packSizes(vertical) {
  return vertical ? { h1: 76, h2: 46, body: 34, cta: 32, eyebrow: 34 } : { h1: 58, h2: 34, body: 28, cta: 26, eyebrow: 26 };
}
function packTextClip(id, def, durationTicks2) {
  const start = def.inTicks || 0;
  return {
    id,
    type: "text",
    name: def.name,
    text: def.text,
    color: def.color || DEFAULT_TEXT_COLOR,
    fontSize: Math.round(def.fontSize),
    fontFamily: "Inter",
    bold: def.bold !== false,
    shadow: true,
    align: def.align || "center",
    animIn: def.animIn || "slide-up",
    animInDuration: def.animInDuration ?? 0.4,
    animOut: "fade",
    animOutDuration: 0.3,
    x: Math.round(def.x || 0),
    y: Math.round(def.y || 0),
    scale: 100,
    opacity: 100,
    rotation: 0,
    in: start,
    out: def.outTicks || durationTicks2,
    offset: start,
    speed: 1,
    effects: [],
    keyframes: []
  };
}
function packMediaClip(id, name, durationTicks2, opacity = 100) {
  return {
    id,
    type: "video",
    name,
    src: "",
    x: 0,
    y: 0,
    scale: 100,
    opacity,
    rotation: 0,
    fit: "cover",
    in: 0,
    out: durationTicks2,
    offset: 0,
    speed: 1,
    effects: [],
    keyframes: []
  };
}
function packAudioClip(id, name, durationTicks2) {
  return {
    id,
    type: "audio",
    name,
    src: "",
    in: 0,
    out: durationTicks2,
    offset: 0,
    speed: 1,
    volume: 70,
    fade: { in: packMs(0.4), out: packMs(0.6) },
    effects: [],
    keyframes: []
  };
}
var PACK_LAYOUTS = {
  hook({ H, copy, accent, sizes }) {
    const defs = [{
      key: "title",
      name: "Headline",
      text: copy.title,
      y: -0.28 * H,
      fontSize: sizes.h1,
      animIn: "slide-up",
      animInDuration: 0.5,
      required: true
    }];
    if (copy.subtitle) {
      defs.push({
        key: "subtitle",
        name: "Subheadline",
        text: copy.subtitle,
        y: -0.16 * H,
        fontSize: sizes.body,
        bold: false,
        color: "#f2f2f2",
        animIn: "fade",
        inTicks: packMs(0.2)
      });
    }
    if (copy.cta) {
      defs.push({
        key: "cta",
        name: "Call To Action",
        text: copy.cta,
        y: 0.42 * H,
        fontSize: sizes.cta,
        color: accent,
        inTicks: packMs(0.9)
      });
    }
    return defs;
  },
  listicle({ H, copy, accent, sizes, durationTicks: durationTicks2 }) {
    const defs = [{
      key: "eyebrow",
      name: "Kicker",
      text: copy.eyebrow,
      y: -0.34 * H,
      fontSize: sizes.eyebrow,
      color: accent,
      animIn: "fade",
      required: true
    }];
    (copy.items || []).forEach((text, index) => {
      defs.push({
        key: `item${index + 1}`,
        name: `List Item ${index + 1}`,
        text,
        y: (-0.16 + index * 0.14) * H,
        fontSize: sizes.h2,
        animIn: "slide-right",
        inTicks: packMs(0.4 + index * 1.8)
      });
    });
    if (copy.cta) {
      defs.push({
        key: "cta",
        name: "Call To Action",
        text: copy.cta,
        y: 0.38 * H,
        fontSize: sizes.cta,
        color: accent,
        inTicks: Math.max(packMs(0.4), durationTicks2 - packMs(1.6))
      });
    }
    return defs;
  },
  banner({ H, copy, accent, sizes }) {
    const defs = [{
      key: "title",
      name: "Headline",
      text: copy.title,
      y: -0.1 * H,
      fontSize: sizes.h1,
      animIn: "slide-up",
      animInDuration: 0.5,
      required: true
    }];
    if (copy.subtitle) {
      defs.push({
        key: "subtitle",
        name: "Subheadline",
        text: copy.subtitle,
        y: 0.01 * H,
        fontSize: sizes.body,
        bold: false,
        color: "#eeeeee",
        animIn: "fade",
        inTicks: packMs(0.25)
      });
    }
    if (copy.cta) {
      defs.push({
        key: "cta",
        name: "Call To Action",
        text: copy.cta,
        y: 0.16 * H,
        fontSize: sizes.cta,
        color: accent,
        inTicks: packMs(0.7)
      });
    }
    return defs;
  },
  price({ H, copy, accent, sizes }) {
    const defs = [{
      key: "title",
      name: "Price / Offer",
      text: copy.title,
      y: 0.04 * H,
      fontSize: sizes.h1 * 1.2,
      color: accent,
      animIn: "slide-up",
      animInDuration: 0.45,
      required: true
    }];
    if (copy.subtitle) {
      defs.push({
        key: "subtitle",
        name: "Offer Details",
        text: copy.subtitle,
        y: 0.16 * H,
        fontSize: sizes.body,
        bold: false,
        color: "#f2f2f2",
        animIn: "fade",
        inTicks: packMs(0.35)
      });
    }
    if (copy.cta) {
      defs.push({
        key: "cta",
        name: "Call To Action",
        text: copy.cta,
        y: 0.28 * H,
        fontSize: sizes.cta,
        color: "#ffffff",
        inTicks: packMs(0.8)
      });
    }
    return defs;
  },
  "lower-third"({ H, W, copy, accent, sizes }) {
    const x = -0.22 * W;
    const defs = [{
      key: "title",
      name: "Name / Subject",
      text: copy.title,
      x,
      y: 0.3 * H,
      fontSize: sizes.h2,
      align: "left",
      animIn: "slide-right",
      required: true
    }];
    if (copy.subtitle) {
      defs.push({
        key: "subtitle",
        name: "Role / Detail Line",
        text: copy.subtitle,
        x,
        y: 0.345 * H,
        fontSize: Math.round(sizes.body * 0.82),
        bold: false,
        color: accent,
        align: "left",
        animIn: "slide-right",
        inTicks: packMs(0.25)
      });
    }
    return defs;
  },
  "before-after"({ H, copy, accent, sizes, durationTicks: durationTicks2 }) {
    const mid = Math.round(durationTicks2 / 2);
    const defs = [];
    if (copy.subtitle) {
      defs.push({
        key: "subtitle",
        name: "Context Caption",
        text: copy.subtitle,
        y: -0.36 * H,
        fontSize: sizes.body,
        bold: false,
        color: "#f2f2f2",
        animIn: "fade",
        inTicks: packMs(0.2),
        required: true
      });
    }
    defs.push({
      key: "before",
      name: "Before Label",
      text: copy.before,
      y: -0.02 * H,
      fontSize: sizes.h1 * 0.9,
      outTicks: mid,
      animIn: "slide-up",
      animInDuration: 0.4,
      required: true
    });
    if (copy.after) {
      defs.push({
        key: "after",
        name: "After Label",
        text: copy.after,
        y: -0.02 * H,
        fontSize: sizes.h1 * 0.9,
        color: accent,
        inTicks: mid,
        animIn: "slide-up",
        animInDuration: 0.4
      });
    }
    return defs;
  },
  stack({ H, copy, accent, sizes }) {
    const defs = [{
      key: "title",
      name: "Headline",
      text: copy.title,
      y: -0.02 * H,
      fontSize: sizes.h1,
      animIn: "slide-up",
      animInDuration: 0.5,
      inTicks: packMs(0.2),
      required: true
    }];
    if (copy.eyebrow) {
      defs.unshift({
        key: "eyebrow",
        name: "Kicker",
        text: copy.eyebrow,
        y: -0.2 * H,
        fontSize: sizes.eyebrow,
        color: accent,
        animIn: "fade",
        inTicks: 0
      });
    }
    if (copy.cta) {
      defs.push({
        key: "cta",
        name: "Call To Action",
        text: copy.cta,
        y: 0.16 * H,
        fontSize: sizes.cta,
        color: "#ffffff",
        inTicks: packMs(0.8)
      });
    }
    return defs;
  }
};
function buildIndustryTemplate(spec) {
  const canvas = PACK_CANVAS[spec.aspectRatio];
  const durationTicks2 = packMs(spec.seconds);
  const key = spec.id.replace(/^tpl-/, "");
  const accent = spec.accent || PACK_ACCENT;
  const vertical = canvas.height > canvas.width;
  const sizes = packSizes(vertical);
  const defs = PACK_LAYOUTS[spec.layout]({ H: canvas.height, W: canvas.width, copy: spec.copy, accent, sizes, durationTicks: durationTicks2 });
  const textTracks = defs.map((def) => ({
    id: `tr-${key}-text-${def.key}`,
    type: "text",
    name: def.name,
    items: [packTextClip(`c-${key}-${def.key}`, def, durationTicks2)]
  }));
  const mediaTrackId = `tr-${key}-media`;
  const audioTrackId = `tr-${key}-audio`;
  const mediaClipId = `c-${key}-media`;
  const audioClipId = `c-${key}-audio`;
  const mediaTrack = {
    id: mediaTrackId,
    type: "video",
    name: spec.mediaTrackName || "Main Footage",
    items: [packMediaClip(mediaClipId, spec.mediaLabel || "Main Footage", durationTicks2, spec.mediaOpacity ?? 100)]
  };
  const audioTrack = {
    id: audioTrackId,
    type: "audio",
    name: "Background Music",
    items: [packAudioClip(audioClipId, "Music Bed", durationTicks2)]
  };
  const placeholders = [
    {
      id: `ph-${key}-media`,
      type: "video",
      label: spec.mediaLabel || "Main Footage",
      clipId: mediaClipId,
      trackId: mediaTrackId,
      required: true
    },
    ...defs.map((def) => ({
      id: `ph-${key}-${def.key}`,
      type: "text",
      label: def.name,
      clipId: `c-${key}-${def.key}`,
      trackId: `tr-${key}-text-${def.key}`,
      defaultContent: def.text,
      required: !!def.required
    })),
    {
      id: `ph-${key}-audio`,
      type: "audio",
      label: "Background Music",
      clipId: audioClipId,
      trackId: audioTrackId,
      required: false
    }
  ];
  return {
    // No schemaVersion on shipped builtins: like the six hand-written cards
    // above, absence IS the v1 signal and migrateTemplate() stamps it on
    // import. Every builtin must keep migrating cleanly.
    id: spec.id,
    version: 1,
    name: spec.name,
    description: spec.description,
    industry: spec.industry,
    tags: spec.tags || [],
    category: spec.category,
    aspectRatio: spec.aspectRatio,
    canvas,
    durationTicks: durationTicks2,
    thumbnail: spec.thumbnail,
    isBuiltin: true,
    createdAt: 1776e9,
    placeholders,
    tracks: [...textTracks, mediaTrack, audioTrack]
  };
}
var INDUSTRY_TEMPLATE_SPECS = [
  {
    id: "tpl-fnb-menu-price-reveal",
    name: "Menu Price Reveal",
    description: "Vertical F&B price card: dish footage, oversized price, urgency line and visit CTA.",
    industry: "fnb",
    category: "promo",
    aspectRatio: "9:16",
    seconds: 6,
    layout: "price",
    thumbnail: "i-lucide-utensils-crossed",
    accent: "#ffb703",
    mediaLabel: "Dish / Combo Footage",
    mediaTrackName: "Dish Footage",
    tags: ["qu\xE1n \u0103n", "menu", "gi\xE1", "combo", "nh\xE0 h\xE0ng", "food", "price", "restaurant"],
    copy: {
      title: "COMBO TR\u01AFA 59K",
      subtitle: "1 M\xD3N CH\xCDNH + TR\xC0 \u0110\xC1 + TR\xC1NG MI\u1EC6NG",
      cta: "GH\xC9 QU\xC1N H\xD4M NAY"
    }
  },
  {
    id: "tpl-fnb-dish-story",
    name: "Dish Close-Up Story",
    description: "Minimal vertical story for one signature dish with a lower-third name card.",
    industry: "fnb",
    category: "minimal",
    aspectRatio: "9:16",
    seconds: 5,
    layout: "lower-third",
    thumbnail: "i-lucide-chef-hat",
    accent: "#ffd166",
    mediaLabel: "Signature Dish Footage",
    mediaTrackName: "Dish Footage",
    tags: ["m\xF3n \u0103n", "review qu\xE1n", "\u0111\u1EB7c s\u1EA3n", "food review", "dish"],
    copy: {
      title: "PH\u1EDE B\xD2 GIA TRUY\u1EC0N",
      subtitle: "N\u01AF\u1EDAC D\xD9NG 12 TI\u1EBENG \xB7 35K"
    }
  },
  {
    id: "tpl-beauty-before-after",
    name: "Before / After Reveal",
    description: "Skincare and spa proof video: before label, timed reveal, result caption.",
    industry: "beauty",
    category: "promo",
    aspectRatio: "9:16",
    seconds: 8,
    layout: "before-after",
    thumbnail: "i-lucide-sparkles",
    accent: "#7ef0c3",
    mediaLabel: "Treatment / Result Footage",
    mediaTrackName: "Treatment Footage",
    tags: ["spa", "skincare", "tr\u01B0\u1EDBc sau", "beauty", "da", "before after"],
    copy: {
      before: "TR\u01AF\u1EDAC KHI D\xD9NG",
      after: "SAU 4 TU\u1EA6N",
      subtitle: "LI\u1EC6U TR\xCCNH 4 B\u01AF\u1EDAC T\u1EA0I SPA"
    }
  },
  {
    id: "tpl-beauty-service-combo",
    name: "Service Combo Spotlight",
    description: "Warm vertical card for a spa/beauty combo with kicker, price and booking CTA.",
    industry: "beauty",
    category: "promo",
    aspectRatio: "9:16",
    seconds: 6,
    layout: "stack",
    thumbnail: "i-lucide-flower-2",
    accent: "#ff8fab",
    mediaLabel: "Spa / Salon Footage",
    mediaTrackName: "Service Footage",
    tags: ["spa", "combo", "khuy\u1EBFn m\xE3i", "l\xE0m \u0111\u1EB9p", "salon", "beauty"],
    copy: {
      eyebrow: "\u01AFU \u0110\xC3I TH\xC1NG N\xC0Y",
      title: "COMBO 3 B\u01AF\u1EDAC CH\u1EC8 299K",
      cta: "\u0110\u1EB6T L\u1ECACH NGAY"
    }
  },
  {
    id: "tpl-fashion-new-drop",
    name: "New Drop Lookbook",
    description: "Vertical lookbook opener for a new collection drop with shop CTA.",
    industry: "fashion",
    category: "promo",
    aspectRatio: "9:16",
    seconds: 6,
    layout: "stack",
    thumbnail: "i-lucide-shirt",
    accent: "#ffd166",
    mediaLabel: "Lookbook Footage",
    mediaTrackName: "Lookbook",
    tags: ["th\u1EDDi trang", "lookbook", "b\u1ED9 s\u01B0u t\u1EADp", "shop qu\u1EA7n \xE1o", "fashion"],
    copy: {
      eyebrow: "B\u1ED8 S\u01AFU T\u1EACP M\u1EDAI",
      title: "DROP M\u1EDAI \u0110\xC3 L\xCAN K\u1EC6",
      cta: "MUA NGAY T\u1EA0I SHOP"
    }
  },
  {
    id: "tpl-fashion-styling-tips",
    name: "3-Way Styling Tips",
    description: "Three-beat listicle: one item, three outfits, save-for-later CTA.",
    industry: "fashion",
    category: "minimal",
    aspectRatio: "9:16",
    seconds: 9,
    layout: "listicle",
    thumbnail: "i-lucide-layers",
    accent: "#ffd166",
    mediaLabel: "Outfit Footage",
    mediaTrackName: "Outfit B-Roll",
    tags: ["mix \u0111\u1ED3", "ph\u1ED1i \u0111\u1ED3", "th\u1EDDi trang", "tips", "styling"],
    copy: {
      eyebrow: "1 CHI\u1EBEC \xC1O - 3 C\xC1CH M\u1EB6C",
      items: ["01 \xB7 \u0110I L\xC0M", "02 \xB7 \u0110I CH\u01A0I", "03 \xB7 \u0110I BI\u1EC2N"],
      cta: "L\u01AFU L\u1EA0I \u0110\u1EC2 M\u1EB6C \u0110\u1EB8P"
    }
  },
  {
    id: "tpl-fitness-transformation",
    name: "Fitness Transformation",
    description: "Before/after transformation reel with day labels and a result caption.",
    industry: "health",
    category: "promo",
    aspectRatio: "9:16",
    seconds: 8,
    layout: "before-after",
    thumbnail: "i-lucide-dumbbell",
    accent: "#4ade80",
    mediaLabel: "Training / Progress Footage",
    mediaTrackName: "Progress Footage",
    tags: ["gi\u1EA3m c\xE2n", "fitness", "gym", "l\u1ED9t x\xE1c", "transformation", "health"],
    copy: {
      before: "NG\xC0Y 1",
      after: "NG\xC0Y 90",
      subtitle: "KH\xD4NG GYM V\u1EAAN GI\u1EA2M 8KG"
    }
  },
  {
    id: "tpl-fitness-30-day-challenge",
    name: "30-Day Challenge",
    description: "Habit-challenge listicle with three daily rules and a follow CTA.",
    industry: "health",
    category: "minimal",
    aspectRatio: "9:16",
    seconds: 9,
    layout: "listicle",
    thumbnail: "i-lucide-flame",
    accent: "#fb923c",
    mediaLabel: "Workout / Habit Footage",
    mediaTrackName: "Challenge Footage",
    tags: ["th\u1EED th\xE1ch", "th\xF3i quen", "s\u1EE9c kh\u1ECFe", "health", "challenge"],
    copy: {
      eyebrow: "TH\u1EEC TH\xC1CH 30 NG\xC0Y",
      items: ["5 PH\xDAT M\u1ED6I S\xC1NG", "KH\xD4NG \u0110\u1ED2 NG\u1ECCT", "NG\u1EE6 \u0110\u1EE6 7 TI\u1EBENG"],
      cta: "THEO D\xD5I \u0110\u1EC2 XEM K\u1EBET QU\u1EA2"
    }
  },
  {
    id: "tpl-realestate-property-tour",
    name: "Property Tour Card",
    description: "Widescreen listing card: price line, specs, hotline CTA over the walkthrough.",
    industry: "realestate",
    category: "promo",
    aspectRatio: "16:9",
    seconds: 8,
    layout: "banner",
    thumbnail: "i-lucide-building-2",
    accent: "#38bdf8",
    mediaLabel: "Property Walkthrough",
    mediaTrackName: "Property Footage",
    tags: ["b\u1EA5t \u0111\u1ED9ng s\u1EA3n", "c\u0103n h\u1ED9", "nh\xE0 ph\u1ED1", "m\xF4i gi\u1EDBi", "real estate", "listing"],
    copy: {
      title: "C\u0102N H\u1ED8 2PN \xB7 VIEW S\xD4NG",
      subtitle: "78M\xB2 \xB7 S\u1ED4 H\u1ED2NG RI\xCANG \xB7 NH\u1EACN NH\xC0 NGAY",
      cta: "G\u1ECCI \u0110\u1EC2 XEM NH\xC0 TH\u1EF0C T\u1EBE"
    }
  },
  {
    id: "tpl-realestate-open-house",
    name: "Open House Hook",
    description: "Three-second hook for a viewing appointment, built to stop the scroll.",
    industry: "realestate",
    category: "intro",
    aspectRatio: "9:16",
    seconds: 5,
    layout: "hook",
    thumbnail: "i-lucide-map-pin",
    accent: "#38bdf8",
    mediaLabel: "House Tour Footage",
    mediaTrackName: "House Footage",
    tags: ["nh\xE0 \u0111\u1EA5t", "m\u1EDF b\xE1n", "b\u1EA5t \u0111\u1ED9ng s\u1EA3n", "hook", "open house"],
    copy: {
      title: "NH\xC0 N\xC0Y C\xD3 G\xCC \u0110\u1EB6C BI\u1EC6T?",
      subtitle: "XEM H\u1EBET 15 GI\xC2Y L\xC0 BI\u1EBET",
      cta: "L\u01AFU TIN \u0110\u1EC2 \u0110I XEM"
    }
  },
  {
    id: "tpl-education-course-launch",
    name: "Course Launch Banner",
    description: "Widescreen course announcement with schedule line and early-bird CTA.",
    industry: "education",
    category: "promo",
    aspectRatio: "16:9",
    seconds: 8,
    layout: "banner",
    thumbnail: "i-lucide-graduation-cap",
    accent: "#a78bfa",
    mediaLabel: "Class / Campus Footage",
    mediaTrackName: "Course Footage",
    tags: ["kh\xF3a h\u1ECDc", "\u0111\xE0o t\u1EA1o", "h\u1ECDc excel", "tuy\u1EC3n sinh", "education", "course"],
    copy: {
      title: "KHO\xC1 H\u1ECCC EXCEL TH\u1EF0C CHI\u1EBEN",
      subtitle: "8 BU\u1ED4I \xB7 L\xC0M \u0110\u01AF\u1EE2C VI\u1EC6C NGAY",
      cta: "\u0110\u0102NG K\xDD S\u1EDAM \u0110\u1EC2 GI\u1EEE GI\xC1"
    }
  },
  {
    id: "tpl-education-micro-lesson",
    name: "3 Tips Micro-Lesson",
    description: "Short-form lesson listicle: three actionable tips and a save CTA.",
    industry: "education",
    category: "minimal",
    aspectRatio: "9:16",
    seconds: 9,
    layout: "listicle",
    thumbnail: "i-lucide-lightbulb",
    accent: "#a78bfa",
    mediaLabel: "Study / Teaching Footage",
    mediaTrackName: "Lesson Footage",
    tags: ["m\u1EB9o h\u1ECDc", "sinh vi\xEAn", "k\u1EF9 n\u0103ng", "tips", "study"],
    copy: {
      eyebrow: "3 M\u1EB8O H\u1ECCC NHANH",
      items: ["01 \xB7 CHIA NH\u1ECE M\u1EE4C TI\xCAU", "02 \xB7 \xD4N THEO CHU K\u1EF2", "03 \xB7 D\u1EA0Y L\u1EA0I NG\u01AF\u1EDCI KH\xC1C"],
      cta: "L\u01AFU B\xC0I N\xC0Y L\u1EA0I"
    }
  },
  {
    id: "tpl-travel-destination-hook",
    name: "Destination Hook",
    description: "Travel opener with price line and a comment-pinned itinerary CTA.",
    industry: "travel",
    category: "intro",
    aspectRatio: "9:16",
    seconds: 6,
    layout: "hook",
    thumbnail: "i-lucide-plane",
    accent: "#fbbf24",
    mediaLabel: "Destination Footage",
    mediaTrackName: "Travel Footage",
    tags: ["du l\u1ECBch", "\u0111\xE0 l\u1EA1t", "combo", "homestay", "travel", "destination"],
    copy: {
      title: "\u0110\u1EEANG B\u1ECE L\u1EE0 \u0110\xC0 L\u1EA0T M\xD9A N\xC0Y",
      subtitle: "3 NG\xC0Y 2 \u0110\xCAM \xB7 2TR5/NG\u01AF\u1EDCI",
      cta: "L\u1ECACH TR\xCCNH CHI TI\u1EBET \u1EDE B\xCCNH LU\u1EACN"
    }
  },
  {
    id: "tpl-travel-room-tour",
    name: "Hotel Room Tour",
    description: "Widescreen room-tour card with nightly rate, inclusions and booking CTA.",
    industry: "travel",
    category: "promo",
    aspectRatio: "16:9",
    seconds: 8,
    layout: "banner",
    thumbnail: "i-lucide-hotel",
    accent: "#fbbf24",
    mediaLabel: "Room / Resort Footage",
    mediaTrackName: "Room Footage",
    tags: ["kh\xE1ch s\u1EA1n", "resort", "ph\xF2ng", "du l\u1ECBch", "hotel", "room tour"],
    copy: {
      title: "PH\xD2NG VIEW BI\u1EC2N \xB7 1TR2/\u0110\xCAM",
      subtitle: "G\u1ED2M BUFFET S\xC1NG V\xC0 XE \u0110\u01AFA \u0110\xD3N",
      cta: "\u0110\u1EB6T PH\xD2NG NGAY H\xD4M NAY"
    }
  },
  {
    id: "tpl-tech-product-launch",
    name: "Product Launch Banner",
    description: "Widescreen launch announcement: product name, value props, trial CTA.",
    industry: "tech",
    category: "promo",
    aspectRatio: "16:9",
    seconds: 6,
    layout: "banner",
    thumbnail: "i-lucide-rocket",
    accent: "#60a5fa",
    mediaLabel: "Product / UI Footage",
    mediaTrackName: "Product Footage",
    tags: ["s\u1EA3n ph\u1EA9m", "ra m\u1EAFt", "saas", "app", "launch", "tech"],
    copy: {
      title: "RA M\u1EAET TMCUT 2.0",
      subtitle: "D\u1EF0NG VIDEO T\u1EF0 \u0110\u1ED8NG \xB7 XU\u1EA4T 4K \xB7 D\xD9NG TH\u1EEC 14 NG\xC0Y",
      cta: "B\u1EA4M D\xD9NG TH\u1EEC NGAY"
    }
  },
  {
    id: "tpl-tech-feature-walkthrough",
    name: "Feature Walkthrough",
    description: "Two-line feature reveal for demo clips: kicker, feature name, try CTA.",
    industry: "tech",
    category: "minimal",
    aspectRatio: "16:9",
    seconds: 6,
    layout: "stack",
    thumbnail: "i-lucide-mouse-pointer-click",
    accent: "#60a5fa",
    mediaLabel: "Screen Recording",
    mediaTrackName: "Screen Capture",
    tags: ["t\xEDnh n\u0103ng", "demo", "product", "saas", "walkthrough"],
    copy: {
      eyebrow: "T\xCDNH N\u0102NG M\u1EDAI",
      title: "AUTOCUT B\u1EB0NG AI",
      cta: "B\u1EA4M TH\u1EEC NGAY"
    }
  },
  {
    id: "tpl-finance-loan-explainer",
    name: "Loan Product Explainer",
    description: "Three-point explainer for a finance product with a learn-more CTA.",
    industry: "finance",
    category: "promo",
    aspectRatio: "9:16",
    seconds: 9,
    layout: "listicle",
    thumbnail: "i-lucide-landmark",
    accent: "#34d399",
    mediaLabel: "Advisor / Office Footage",
    mediaTrackName: "Finance Footage",
    tags: ["vay v\u1ED1n", "t\xE0i ch\xEDnh", "ng\xE2n h\xE0ng", "b\u1EA3o hi\u1EC3m", "finance", "loan"],
    copy: {
      eyebrow: "VAY TI\xCAU D\xD9NG 2026",
      items: ["H\u1ED2 S\u01A0 \u0110\u01A0N GI\u1EA2N", "DUY\u1EC6T NHANH TRONG NG\xC0Y", "L\xC3I SU\u1EA4T LINH HO\u1EA0T"],
      cta: "T\xCCM HI\u1EC2U \u0110I\u1EC0U KI\u1EC6N VAY"
    }
  },
  {
    id: "tpl-automotive-car-listing",
    name: "Car Listing Reel",
    description: "Widescreen used-car listing: model line, condition specs, contact CTA.",
    industry: "automotive",
    category: "promo",
    aspectRatio: "16:9",
    seconds: 8,
    layout: "banner",
    thumbnail: "i-lucide-car",
    accent: "#f97316",
    mediaLabel: "Car Exterior / Interior",
    mediaTrackName: "Car Footage",
    tags: ["\xF4 t\xF4", "xe c\u0169", "b\xE1n xe", "car", "auto", "listing"],
    copy: {
      title: "VF8 2024 \xB7 L\u01AF\u1EDAT 12.000KM",
      subtitle: "XE CH\xCDNH CH\u1EE6 \xB7 B\u1EA2O H\xC0NH H\xC3NG",
      cta: "LI\xCAN H\u1EC6 XEM XE"
    }
  },
  {
    id: "tpl-medical-clinic-intro",
    name: "Clinic Introduction",
    description: "Clinic opener with opening hours and an online booking CTA.",
    industry: "medical",
    category: "intro",
    aspectRatio: "9:16",
    seconds: 6,
    layout: "hook",
    thumbnail: "i-lucide-stethoscope",
    accent: "#7dd3fc",
    mediaLabel: "Clinic / Team Footage",
    mediaTrackName: "Clinic Footage",
    tags: ["ph\xF2ng kh\xE1m", "nha khoa", "s\u1EE9c kh\u1ECFe", "\u0111\u1EB7t l\u1ECBch", "clinic", "medical"],
    copy: {
      title: "PH\xD2NG KH\xC1M M\u1EDE C\u1EECA 7H - 21H",
      subtitle: "\u0110\u1EB6T L\u1ECACH ONLINE \xB7 KH\xD4NG PH\u1EA2I CH\u1EDC",
      cta: "\u0110\u1EB6T L\u1ECACH KH\xC1M NGAY"
    }
  },
  {
    id: "tpl-services-local-offer",
    name: "Local Service Offer",
    description: "Service price card with response-time promise and booking CTA.",
    industry: "services",
    category: "promo",
    aspectRatio: "9:16",
    seconds: 6,
    layout: "price",
    thumbnail: "i-lucide-wrench",
    accent: "#f97316",
    mediaLabel: "Service / Job Footage",
    mediaTrackName: "Service Footage",
    tags: ["d\u1ECBch v\u1EE5", "s\u1EEDa ch\u1EEFa", "\u0111i\u1EC7n l\u1EA1nh", "v\u1EC7 sinh", "local service", "repair"],
    copy: {
      title: "V\u1EC6 SINH M\xC1Y L\u1EA0NH 99K",
      subtitle: "G\u1ECCI L\xC0 C\xD3 M\u1EB6T TRONG 2 GI\u1EDC",
      cta: "\u0110\u1EB6T L\u1ECACH NGAY"
    }
  },
  {
    id: "tpl-events-wedding-invite",
    name: "Wedding Invitation",
    description: "Elegant vertical invitation with couple names, date and RSVP CTA.",
    industry: "events",
    category: "intro",
    aspectRatio: "9:16",
    seconds: 8,
    layout: "stack",
    thumbnail: "i-lucide-heart-handshake",
    accent: "#f9a8d4",
    mediaLabel: "Couple / Venue Footage",
    mediaTrackName: "Wedding Footage",
    tags: ["\u0111\xE1m c\u01B0\u1EDBi", "thi\u1EC7p m\u1EDDi", "s\u1EF1 ki\u1EC7n", "wedding", "event", "invitation"],
    copy: {
      eyebrow: "SAVE THE DATE",
      title: "MINH & LAN \xB7 20.12.2026",
      cta: "XEM THI\u1EC6P M\u1EDCI"
    }
  },
  {
    id: "tpl-ecommerce-unboxing-hook",
    name: "Unboxing Hook",
    description: "Unboxing opener that lands the question and price before the reveal.",
    industry: "ecommerce",
    category: "minimal",
    aspectRatio: "9:16",
    seconds: 6,
    layout: "hook",
    thumbnail: "i-lucide-package-open",
    accent: "#facc15",
    mediaLabel: "Unboxing Footage",
    mediaTrackName: "Unboxing",
    tags: ["unboxing", "b\xF3c h\u1ED9p", "review", "shopee", "ecommerce", "haul"],
    copy: {
      title: "M\u1EDE H\u1ED8P \u0110\u01A0N 199K N\xC0Y",
      subtitle: "C\xD3 \u0110\xC1NG TI\u1EC0N KH\xD4NG?",
      cta: "MUA T\u1EA0I GI\u1ECE H\xC0NG"
    }
  },
  {
    id: "tpl-pets-ugc-review",
    name: "Pet UGC Review",
    description: "UGC-style pet review with a name card and product detail line.",
    industry: "pets",
    category: "minimal",
    aspectRatio: "9:16",
    seconds: 6,
    layout: "lower-third",
    thumbnail: "i-lucide-paw-print",
    accent: "#fda4af",
    mediaLabel: "Pet Footage",
    mediaTrackName: "Pet B-Roll",
    tags: ["th\xFA c\u01B0ng", "m\xE8o", "ch\xF3", "pate", "pet", "ugc"],
    copy: {
      title: "B\xD4NG \xB7 2 TU\u1ED4I",
      subtitle: "REVIEW PATE CHO M\xC8O K\xC9N \u0102N"
    }
  },
  {
    id: "tpl-creator-channel-outro",
    name: "Channel Outro Card",
    description: "Widescreen outro card: thank-you line, subscribe prompt, bell CTA.",
    industry: "creator",
    category: "outro",
    aspectRatio: "16:9",
    seconds: 5,
    layout: "banner",
    thumbnail: "i-lucide-bell",
    accent: "#ef4444",
    mediaLabel: "Background Footage",
    mediaTrackName: "Outro Background",
    tags: ["outro", "k\u1EBFt video", "youtube", "subscribe", "creator"],
    copy: {
      title: "C\u1EA2M \u01A0N \u0110\xC3 XEM",
      subtitle: "\u0110\u0102NG K\xDD K\xCANH \u0110\u1EC2 KH\xD4NG B\u1ECE L\u1EE0 VIDEO M\u1EDAI",
      cta: "B\u1EA4M CHU\xD4NG NGAY"
    }
  }
];
var BUILTIN_TEMPLATES = [
  {
    id: "tpl-tiktok-hook-intro",
    name: "TikTok / Reels Hook Intro",
    description: "Fast-paced viral vertical opener with high-impact headline text and media placeholder.",
    industry: "creator",
    category: "intro",
    aspectRatio: "9:16",
    canvas: { width: 1080, height: 1920, fps: 30 },
    durationTicks: 3 * TICKS_PER_SECOND,
    // 3 seconds = 360,000 ticks
    thumbnail: "i-lucide-smartphone",
    isBuiltin: true,
    createdAt: 1776e9,
    placeholders: [
      {
        id: "ph-hook-video",
        type: "video",
        label: "Hook Footage (3s)",
        clipId: "c-hook-video-1",
        trackId: "tr-video-1",
        required: true
      },
      {
        id: "ph-hook-headline",
        type: "text",
        label: "Catchy Headline Text",
        clipId: "c-hook-text-1",
        trackId: "tr-text-1",
        defaultContent: "STOP SCROLLING! \u26A1",
        required: true
      },
      {
        id: "ph-hook-sfx",
        type: "audio",
        label: "Whoosh SFX / Audio",
        clipId: "c-hook-audio-1",
        trackId: "tr-audio-1",
        required: false
      }
    ],
    tracks: [
      {
        id: "tr-text-1",
        type: "text",
        name: "Text Overlay",
        items: [
          {
            id: "c-hook-text-1",
            type: "text",
            name: "Headline",
            text: "STOP SCROLLING! \u26A1",
            color: "#ffdd00",
            fontSize: 54,
            fontFamily: "Outfit",
            bold: true,
            stroke: true,
            shadow: true,
            align: "center",
            animIn: "zoom-in",
            animInDuration: 0.35,
            x: 0,
            y: -150,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0,
            out: 36e4,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: "tr-video-1",
        type: "video",
        name: "Main Video",
        items: [
          {
            id: "c-hook-video-1",
            type: "video",
            name: "Hook Media Placeholder",
            src: "",
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: "crop",
            in: 0,
            out: 36e4,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: "tr-audio-1",
        type: "audio",
        name: "Audio SFX",
        items: [
          {
            id: "c-hook-audio-1",
            type: "audio",
            name: "Whoosh SFX",
            src: "",
            in: 0,
            out: 36e4,
            offset: 0,
            speed: 1,
            volume: 90,
            fade: { in: 0, out: TICKS_PER_SECOND * 0.5 },
            effects: [],
            keyframes: []
          }
        ]
      }
    ]
  },
  {
    id: "tpl-youtube-cinematic-intro",
    name: "YouTube Cinematic Title",
    description: "Clean cinematic widescreen intro with smooth fade, elegant typography and ambient atmosphere.",
    industry: "general",
    category: "intro",
    aspectRatio: "16:9",
    canvas: { width: 1920, height: 1080, fps: 30 },
    durationTicks: 5 * TICKS_PER_SECOND,
    // 5 seconds = 600,000 ticks
    thumbnail: "i-lucide-monitor",
    isBuiltin: true,
    createdAt: 1776e9,
    placeholders: [
      {
        id: "ph-cine-video",
        type: "video",
        label: "Scenic B-Roll Footage",
        clipId: "c-cine-video-1",
        trackId: "tr-cine-video",
        required: true
      },
      {
        id: "ph-cine-title",
        type: "text",
        label: "Cinematic Title",
        clipId: "c-cine-text-1",
        trackId: "tr-cine-text",
        defaultContent: "THE JOURNEY BEGINS",
        required: true
      },
      {
        id: "ph-cine-bgm",
        type: "audio",
        label: "Ambient Intro Music",
        clipId: "c-cine-audio-1",
        trackId: "tr-cine-audio",
        required: false
      }
    ],
    tracks: [
      {
        id: "tr-cine-text",
        type: "text",
        name: "Title Text",
        items: [
          {
            id: "c-cine-text-1",
            type: "text",
            name: "Cinematic Title",
            text: "THE JOURNEY BEGINS",
            color: "#ffffff",
            fontSize: 48,
            fontFamily: "Inter",
            bold: false,
            shadow: true,
            align: "center",
            animIn: "fade",
            animInDuration: 0.8,
            animOut: "fade",
            animOutDuration: 0.8,
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0,
            out: 6e5,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: "tr-cine-video",
        type: "video",
        name: "Background Video",
        items: [
          {
            id: "c-cine-video-1",
            type: "video",
            name: "Scenic B-Roll",
            src: "",
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: "fit",
            in: 0,
            out: 6e5,
            offset: 0,
            speed: 1,
            fade: { in: TICKS_PER_SECOND, out: TICKS_PER_SECOND },
            effects: [
              { type: "vignette", params: { intensity: 0.4 } }
            ],
            keyframes: []
          }
        ]
      },
      {
        id: "tr-cine-audio",
        type: "audio",
        name: "Background Music",
        items: [
          {
            id: "c-cine-audio-1",
            type: "audio",
            name: "Ambient Soundtrack",
            src: "",
            in: 0,
            out: 6e5,
            offset: 0,
            speed: 1,
            volume: 80,
            fade: { in: TICKS_PER_SECOND * 0.5, out: TICKS_PER_SECOND * 0.8 },
            effects: [],
            keyframes: []
          }
        ]
      }
    ]
  },
  {
    id: "tpl-split-screen-duo",
    name: "Dual Split-Screen (Top & Bottom)",
    description: "Two synchronized vertical boxes for reaction videos, comparisons, and dual camera angles.",
    industry: "creator",
    category: "split-screen",
    aspectRatio: "9:16",
    canvas: { width: 1080, height: 1920, fps: 30 },
    durationTicks: 6 * TICKS_PER_SECOND,
    // 6 seconds = 720,000 ticks
    thumbnail: "i-lucide-columns-2",
    isBuiltin: true,
    createdAt: 1776e9,
    placeholders: [
      {
        id: "ph-split-top",
        type: "video",
        label: "Top Video (Original / Subject)",
        clipId: "c-split-v1",
        trackId: "tr-split-top",
        required: true
      },
      {
        id: "ph-split-bottom",
        type: "video",
        label: "Bottom Video (Reaction / Comparison)",
        clipId: "c-split-v2",
        trackId: "tr-split-bottom",
        required: true
      },
      {
        id: "ph-split-badge",
        type: "text",
        label: "Center Separator Badge",
        clipId: "c-split-badge-1",
        trackId: "tr-split-badge",
        defaultContent: "VS",
        required: false
      }
    ],
    tracks: [
      {
        id: "tr-split-badge",
        type: "text",
        name: "Divider Badge",
        items: [
          {
            id: "c-split-badge-1",
            type: "text",
            name: "VS Badge",
            text: "VS",
            color: "#ff2d55",
            fontSize: 40,
            bold: true,
            stroke: true,
            align: "center",
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0,
            out: 72e4,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: "tr-split-top",
        type: "video",
        name: "Top Camera",
        items: [
          {
            id: "c-split-v1",
            type: "video",
            name: "Top Screen Footage",
            src: "",
            x: 0,
            y: -480,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: "crop",
            cropRect: { x: 0, y: 0.1, w: 1, h: 0.8 },
            in: 0,
            out: 72e4,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: "tr-split-bottom",
        type: "video",
        name: "Bottom Camera",
        items: [
          {
            id: "c-split-v2",
            type: "video",
            name: "Bottom Screen Footage",
            src: "",
            x: 0,
            y: 480,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: "crop",
            cropRect: { x: 0, y: 0.1, w: 1, h: 0.8 },
            in: 0,
            out: 72e4,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      }
    ]
  },
  {
    id: "tpl-modern-promo-card",
    name: "Instagram Square Product Promo",
    description: "Clean 1:1 square promo card with price tag, headline, and centered product media.",
    industry: "ecommerce",
    category: "promo",
    aspectRatio: "1:1",
    canvas: { width: 1080, height: 1080, fps: 30 },
    durationTicks: 4 * TICKS_PER_SECOND,
    // 4 seconds = 480,000 ticks
    thumbnail: "i-lucide-square",
    isBuiltin: true,
    createdAt: 1776e9,
    placeholders: [
      {
        id: "ph-promo-media",
        type: "image",
        label: "Product Photo / Video",
        clipId: "c-promo-media-1",
        trackId: "tr-promo-media",
        required: true
      },
      {
        id: "ph-promo-title",
        type: "text",
        label: "Promotion Title",
        clipId: "c-promo-text-1",
        trackId: "tr-promo-text",
        defaultContent: "SPECIAL DEAL 50% OFF",
        required: true
      },
      {
        id: "ph-promo-cta",
        type: "text",
        label: "Call to Action",
        clipId: "c-promo-text-2",
        trackId: "tr-promo-text",
        defaultContent: "TAP TO SHOP NOW",
        required: false
      }
    ],
    tracks: [
      {
        id: "tr-promo-text",
        type: "text",
        name: "Promo Overlay",
        items: [
          {
            id: "c-promo-text-1",
            type: "text",
            name: "Special Deal",
            text: "SPECIAL DEAL 50% OFF",
            color: "#ffffff",
            fontSize: 42,
            bold: true,
            shadow: true,
            align: "center",
            animIn: "slide-up",
            animInDuration: 0.4,
            x: 0,
            y: -360,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0,
            out: 48e4,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          },
          {
            id: "c-promo-text-2",
            type: "text",
            name: "Call to Action",
            text: "TAP TO SHOP NOW",
            color: "#00ffcc",
            fontSize: 28,
            bold: true,
            shadow: true,
            align: "center",
            animIn: "fade",
            animInDuration: 0.5,
            x: 0,
            y: 380,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 6e4,
            out: 48e4,
            offset: 6e4,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: "tr-promo-media",
        type: "video",
        name: "Product Showcase",
        items: [
          {
            id: "c-promo-media-1",
            type: "video",
            name: "Product Media",
            src: "",
            x: 0,
            y: 10,
            scale: 90,
            opacity: 100,
            rotation: 0,
            fit: "fit",
            in: 0,
            out: 48e4,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      }
    ]
  },
  {
    id: "tpl-outro-social-end",
    name: "YouTube Outro & Subscribe Card",
    description: "Widescreen outro screen prompting viewers to like, subscribe and check next video.",
    industry: "creator",
    category: "outro",
    aspectRatio: "16:9",
    canvas: { width: 1920, height: 1080, fps: 30 },
    durationTicks: 6 * TICKS_PER_SECOND,
    // 6 seconds = 720,000 ticks
    thumbnail: "i-lucide-share-2",
    isBuiltin: true,
    createdAt: 1776e9,
    placeholders: [
      {
        id: "ph-outro-video",
        type: "video",
        label: "Outro Loop / Background Video",
        clipId: "c-outro-video-1",
        trackId: "tr-outro-bg",
        required: false
      },
      {
        id: "ph-outro-thanks",
        type: "text",
        label: "Thank You Message",
        clipId: "c-outro-text-1",
        trackId: "tr-outro-text",
        defaultContent: "THANKS FOR WATCHING!",
        required: true
      },
      {
        id: "ph-outro-sub",
        type: "text",
        label: "Subscribe Text",
        clipId: "c-outro-text-2",
        trackId: "tr-outro-text",
        defaultContent: "LIKE & SUBSCRIBE FOR MORE",
        required: false
      }
    ],
    tracks: [
      {
        id: "tr-outro-text",
        type: "text",
        name: "Outro Titles",
        items: [
          {
            id: "c-outro-text-1",
            type: "text",
            name: "Thanks Message",
            text: "THANKS FOR WATCHING!",
            color: "#ffffff",
            fontSize: 46,
            bold: true,
            shadow: true,
            align: "center",
            animIn: "zoom-in",
            animInDuration: 0.5,
            x: 0,
            y: -220,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 0,
            out: 72e4,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          },
          {
            id: "c-outro-text-2",
            type: "text",
            name: "Subscribe Call",
            text: "LIKE & SUBSCRIBE FOR MORE",
            color: "#ff3b30",
            fontSize: 30,
            bold: true,
            shadow: true,
            align: "center",
            animIn: "slide-up",
            animInDuration: 0.5,
            x: 0,
            y: 260,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 96e3,
            out: 72e4,
            offset: 96e3,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: "tr-outro-bg",
        type: "video",
        name: "Outro Background",
        items: [
          {
            id: "c-outro-video-1",
            type: "video",
            name: "Outro Ambient BG",
            src: "",
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: "cover",
            in: 0,
            out: 72e4,
            offset: 0,
            speed: 1,
            effects: [
              { type: "blur", params: { radius: 10 } }
            ],
            keyframes: []
          }
        ]
      }
    ]
  },
  {
    id: "tpl-minimal-vlog-lowerthird",
    name: "Minimal Vlog & Lower Third",
    description: "Clean modern documentary overlay with lower-third speaker credit and location tag.",
    industry: "general",
    category: "minimal",
    aspectRatio: "16:9",
    canvas: { width: 1920, height: 1080, fps: 30 },
    durationTicks: 5 * TICKS_PER_SECOND,
    // 5 seconds = 600,000 ticks
    thumbnail: "i-lucide-subtitles",
    isBuiltin: true,
    createdAt: 1776e9,
    placeholders: [
      {
        id: "ph-vlog-footage",
        type: "video",
        label: "Interview / Vlog Video",
        clipId: "c-vlog-video-1",
        trackId: "tr-vlog-footage",
        required: true
      },
      {
        id: "ph-vlog-speaker",
        type: "text",
        label: "Speaker Name & Role",
        clipId: "c-vlog-text-1",
        trackId: "tr-vlog-titles",
        defaultContent: "ALEX RIVERA \xB7 TRAVEL JOURNALIST",
        required: true
      }
    ],
    tracks: [
      {
        id: "tr-vlog-titles",
        type: "text",
        name: "Lower Third Titles",
        items: [
          {
            id: "c-vlog-text-1",
            type: "text",
            name: "Speaker Tag",
            text: "ALEX RIVERA \xB7 TRAVEL JOURNALIST",
            color: "#ffffff",
            fontSize: 26,
            fontFamily: "Inter",
            bold: true,
            shadow: true,
            align: "left",
            animIn: "slide-right",
            animInDuration: 0.45,
            animOut: "fade",
            animOutDuration: 0.4,
            x: -420,
            y: 380,
            scale: 100,
            opacity: 100,
            rotation: 0,
            in: 6e4,
            out: 54e4,
            offset: 6e4,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      },
      {
        id: "tr-vlog-footage",
        type: "video",
        name: "Main Footage",
        items: [
          {
            id: "c-vlog-video-1",
            type: "video",
            name: "Vlog Interview",
            src: "",
            x: 0,
            y: 0,
            scale: 100,
            opacity: 100,
            rotation: 0,
            fit: "fit",
            in: 0,
            out: 6e5,
            offset: 0,
            speed: 1,
            effects: [],
            keyframes: []
          }
        ]
      }
    ]
  },
  ...INDUSTRY_TEMPLATE_SPECS.map(buildIndustryTemplate)
];
function getBuiltinTemplates() {
  return deepClone(BUILTIN_TEMPLATES);
}
function getTemplateById(templates, id) {
  const list = Array.isArray(templates) ? templates : BUILTIN_TEMPLATES;
  return list.find((t) => t && t.id === id) ?? null;
}
function validateTemplate(template) {
  const errors = [];
  if (!template || typeof template !== "object") {
    return { valid: false, errors: ["Template must be an object"] };
  }
  if (!template.id || typeof template.id !== "string") {
    errors.push("Missing or invalid template id");
  }
  if (!template.name || typeof template.name !== "string" || !template.name.trim()) {
    errors.push("Missing or empty template name");
  }
  if (!template.canvas || typeof template.canvas !== "object") {
    errors.push("Missing template canvas");
  } else {
    if (!Number.isFinite(template.canvas.width) || template.canvas.width <= 0) {
      errors.push("Invalid canvas width");
    }
    if (!Number.isFinite(template.canvas.height) || template.canvas.height <= 0) {
      errors.push("Invalid canvas height");
    }
  }
  if (!Number.isFinite(template.durationTicks) || template.durationTicks <= 0) {
    errors.push("Invalid template durationTicks");
  }
  if (!Array.isArray(template.tracks)) {
    errors.push("Template tracks must be an array");
  }
  if (template.schemaVersion !== void 0) {
    if (!Number.isFinite(template.schemaVersion) || !Number.isInteger(template.schemaVersion) || template.schemaVersion < 1) {
      errors.push("Invalid template schemaVersion");
    } else if (template.schemaVersion > TEMPLATE_SCHEMA_VERSION) {
      errors.push(`Template schemaVersion ${template.schemaVersion} is newer than this build supports (${TEMPLATE_SCHEMA_VERSION})`);
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
function migrateTemplate(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { migrated: null, errors: ["Template must be an object"] };
  }
  const tpl = deepClone(raw);
  const declared = Number.isInteger(tpl.schemaVersion) && tpl.schemaVersion >= 1 ? tpl.schemaVersion : TEMPLATE_MIN_SUPPORTED_VERSION;
  if (declared > TEMPLATE_SCHEMA_VERSION) {
    return {
      migrated: null,
      errors: [`Template was created by a newer TMCut (schema v${declared}); update the app to open it`]
    };
  }
  tpl.schemaVersion = TEMPLATE_SCHEMA_VERSION;
  const validation = validateTemplate(tpl);
  if (!validation.valid) {
    return { migrated: null, errors: validation.errors };
  }
  return { migrated: tpl, errors: [] };
}
function checkRequiredAssets(template, view = {}) {
  const installed = new Set(Array.isArray(view.installedIds) ? view.installedIds : []);
  const satisfied = [];
  const missingAssets = [];
  const localNeeds = [];
  for (const ref of template?.requiredAssets || []) {
    if (!ref || typeof ref.assetId !== "string") continue;
    if (ref.assetId.startsWith("local:")) {
      localNeeds.push(ref);
    } else if (installed.has(ref.assetId)) {
      satisfied.push(ref);
    } else {
      missingAssets.push(ref);
    }
  }
  return { satisfied, missingAssets, localNeeds };
}
function filterTemplates(templates, options = {}) {
  const list = Array.isArray(templates) ? templates : BUILTIN_TEMPLATES;
  const { category, aspectRatio, search, industry } = options;
  return list.filter((tpl) => {
    if (!tpl) return false;
    if (category && category !== "all" && tpl.category !== category) {
      return false;
    }
    if (industry && industry !== "all" && tpl.industry !== industry) {
      return false;
    }
    if (aspectRatio && aspectRatio !== "all" && tpl.aspectRatio !== aspectRatio) {
      return false;
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim().toLowerCase();
      const industryMeta = INDUSTRY_CATALOG.find((i) => i.id === tpl.industry);
      const haystack = [
        tpl.name,
        tpl.description,
        tpl.industry,
        industryMeta ? industryMeta.label : "",
        ...Array.isArray(tpl.tags) ? tpl.tags : []
      ];
      const matched = haystack.some((value) => String(value || "").toLowerCase().includes(q));
      if (!matched) return false;
    }
    return true;
  });
}
function createTemplateFromTimeline(timeline, meta = {}) {
  const tracks = deepClone(timeline?.tracks || []);
  const markers = deepClone(timeline?.markers || []);
  let maxEndTicks = 0;
  const placeholders = [];
  tracks.forEach((track, trkIdx) => {
    track.id = track.id || `tr-${trkIdx + 1}`;
    if (Array.isArray(track.items)) {
      track.items.forEach((item, itemIdx) => {
        const speed = item.speed || 1;
        const inTicks = item.in ?? 0;
        const outTicks = item.out ?? 5 * TICKS_PER_SECOND;
        const itemEnd = (item.offset ?? 0) + (outTicks - Math.max(0, Number.isFinite(inTicks) ? inTicks : 0)) / speed;
        if (itemEnd > maxEndTicks) maxEndTicks = itemEnd;
        placeholders.push({
          id: `ph-${track.type}-${trkIdx + 1}-${itemIdx + 1}`,
          type: track.type === "text" ? "text" : track.type === "audio" ? "audio" : "video",
          label: item.name || item.text || `Item ${itemIdx + 1}`,
          clipId: item.id,
          trackId: track.id,
          defaultContent: item.text,
          required: false
        });
      });
    }
  });
  const durationTicks2 = Math.max(TICKS_PER_SECOND, Math.round(maxEndTicks));
  const requiredAssets = [];
  const seenSrc = /* @__PURE__ */ new Set();
  tracks.forEach((track) => {
    if (!Array.isArray(track.items)) return;
    for (const item of track.items) {
      if (!item || track.type === "text") continue;
      const src = typeof item.src === "string" ? item.src : "";
      if (!src || seenSrc.has(src)) continue;
      seenSrc.add(src);
      const catalogRef = /^asset:\/\//.test(src) ? src.slice("asset://".length) : "";
      requiredAssets.push({
        assetId: catalogRef ? `asset:${catalogRef}` : `local:${localAssetFingerprint(src)}`,
        required: true,
        fallback: "ask-user",
        sourceHint: catalogRef ? "" : fileNameFromSrc(src)
      });
    }
  });
  const template = {
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    id: meta.id || uid("usr_tpl"),
    version: 1,
    name: meta.name || "Custom Template",
    description: meta.description || "",
    category: meta.category || "custom",
    aspectRatio: meta.aspectRatio || "16:9",
    canvas: meta.canvas ? deepClone(meta.canvas) : { width: 1920, height: 1080, fps: 30 },
    durationTicks: durationTicks2,
    thumbnail: meta.thumbnail || "i-lucide-layout-template",
    tracks,
    markers,
    placeholders: meta.placeholders || placeholders,
    requiredAssets,
    createdAt: meta.createdAt || Date.now(),
    isBuiltin: false,
    // §6.5 provenance label: "ai" for Template Plans, null/absent for the
    // manual "save as template" path. Display metadata only — the builder
    // sets it, validation never depends on it.
    generatedBy: meta.generatedBy || null
  };
  return template;
}
function instantiateTemplate(template, options = {}) {
  const cloned = deepClone(template);
  const replacements = options.replacements || {};
  const placeholderByClipId = /* @__PURE__ */ new Map();
  if (Array.isArray(cloned.placeholders)) {
    for (const ph of cloned.placeholders) {
      if (ph.clipId) {
        placeholderByClipId.set(ph.clipId, ph);
      }
    }
  }
  const tracks = (cloned.tracks || []).map((track, trkIdx) => {
    const newTrackId = `t-${track.type || "track"}-${trkIdx + 1}-${Math.random().toString(36).slice(2, 6)}`;
    const items = (track.items || []).map((item) => {
      const newClipId = `clip_${Math.random().toString(36).slice(2, 10)}`;
      const newItem = { ...item, id: newClipId };
      const ph = placeholderByClipId.get(item.id);
      if (ph && replacements[ph.id]) {
        const rep = replacements[ph.id];
        if (rep.src !== void 0) newItem.src = rep.src;
        if (rep.text !== void 0) newItem.text = rep.text;
        if (rep.name !== void 0) newItem.name = rep.name;
      }
      return newItem;
    });
    return {
      ...track,
      id: newTrackId,
      items
    };
  });
  const durationSec = cloned.durationTicks / TICKS_PER_SECOND;
  const durationMs = Math.round(durationSec * 1e3);
  return {
    canvas: cloned.canvas,
    timeline: {
      version: 1,
      tracks,
      durationMs,
      markers: cloned.markers || []
    },
    durationMs
  };
}
function replacePlaceholder(timeline, clipId, replacement = {}) {
  if (!timeline || !Array.isArray(timeline.tracks)) return false;
  let modified = false;
  for (const track of timeline.tracks) {
    if (!Array.isArray(track.items)) continue;
    for (const item of track.items) {
      if (item && item.id === clipId) {
        if (replacement.src !== void 0) item.src = replacement.src;
        if (replacement.text !== void 0) item.text = replacement.text;
        if (replacement.name !== void 0) item.name = replacement.name;
        if (replacement.thumbPath !== void 0) item.thumbPath = replacement.thumbPath;
        modified = true;
        break;
      }
    }
    if (modified) break;
  }
  return modified;
}

// src/htmlVideo.mjs
var HTML_VIDEO_SPEC_VERSION = 1;
var HTML_VIDEO_LIMITS = Object.freeze({
  minWidth: 64,
  maxWidth: 3840,
  minHeight: 64,
  maxHeight: 3840,
  minFps: 1,
  maxFps: 60,
  minDurationSec: 0.5,
  maxDurationSec: 120,
  /** Hard ceiling on captured frames: duration × fps. */
  maxFrames: 3600,
  maxHtmlBytes: 512 * 1024
});
var HTML_VIDEO_PRESETS = Object.freeze([
  { id: "9:16", width: 1080, height: 1920 },
  { id: "16:9", width: 1920, height: 1080 },
  { id: "1:1", width: 1080, height: 1080 },
  { id: "4:5", width: 1080, height: 1350 }
]);
function htmlVideoPreset(id) {
  return HTML_VIDEO_PRESETS.find((preset) => preset.id === id) || null;
}
var isFiniteNumber10 = (value) => typeof value === "number" && Number.isFinite(value);
var isInteger = (value) => Number.isInteger(value);
function frameCountFor(durationSec, fps) {
  if (!isFiniteNumber10(durationSec) || !isFiniteNumber10(fps) || durationSec <= 0 || fps <= 0) return 0;
  return Math.max(1, Math.round(durationSec * fps));
}
function frameTimeSec(frame, fps) {
  if (!isInteger(frame) || frame < 0 || !isFiniteNumber10(fps) || fps <= 0) return 0;
  return frame / fps;
}
function frameTimes(durationSec, fps) {
  const count = frameCountFor(durationSec, fps);
  const out = new Array(count);
  for (let i = 0; i < count; i += 1) out[i] = frameTimeSec(i, fps);
  return out;
}
var TOKEN_RE = /\{\{([A-Za-z0-9_]+)\}\}/g;
function collectHtmlTokens(html) {
  const source = String(html || "");
  const seen = /* @__PURE__ */ new Set();
  let match;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(source)) !== null) seen.add(match[1]);
  return [...seen].sort();
}
function htmlVideoEscape(value) {
  return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function replaceHtmlTokens(html, values = {}) {
  const source = String(html || "");
  const vars = values && typeof values === "object" ? values : {};
  return source.replace(TOKEN_RE, (whole, name) => {
    if (!Object.prototype.hasOwnProperty.call(vars, name)) return whole;
    return htmlVideoEscape(vars[name]);
  });
}
function unresolvedHtmlTokens(html, values = {}) {
  const vars = values && typeof values === "object" ? values : {};
  return collectHtmlTokens(html).filter((name) => !Object.prototype.hasOwnProperty.call(vars, name));
}
var LINT_RULES = [
  {
    code: "missing-composition-root",
    level: "error",
    test: (html) => !/<[^>]+data-composition-id\s*=/i.test(html),
    message: "The document needs a root element with data-composition-id \u2014 the renderer uses it to size and identify the composition."
  },
  {
    code: "missing-seek-contract",
    level: "error",
    test: (html) => htmlVideoSeekContract(html) === "declarative",
    message: "Expose the __hf seek contract \u2014 { duration, seek(t) } \u2014 or listen for the hf-seek event so frames can be requested one at a time."
  },
  {
    code: "wall-clock-animation",
    level: "warn",
    test: (html) => /requestAnimationFrame\s*\(/.test(html) && !/hf-seek/.test(html),
    message: "requestAnimationFrame makes motion depend on wall-clock time; renders will not be deterministic. Drive every property from the seek time instead."
  },
  {
    code: "unseeded-random",
    level: "warn",
    test: (html) => /Math\.random\s*\(/.test(html),
    message: "Math.random() is not reproducible across renders. Use a seeded PRNG so frame N is always the same frame."
  },
  {
    code: "remote-script",
    level: "warn",
    test: (html) => /<script[^>]+src\s*=\s*["']https?:/i.test(html),
    message: "Remote scripts need network access; the renderer blocks it by default. Inline the library or enable remote assets for this render."
  },
  {
    code: "unresolved-token",
    level: "warn",
    test: (html) => /\{\{[A-Za-z0-9_]+\}\}/.test(html),
    message: "Unfilled {{token}} slots are rendered verbatim. Fill them in the studio before exporting."
  }
];
function lintHtmlVideo(html) {
  const source = String(html || "");
  return LINT_RULES.filter((rule) => rule.test(source)).map((rule) => ({ code: rule.code, level: rule.level, message: rule.message }));
}
function htmlVideoSeekContract(html) {
  const source = String(html || "");
  return /__hf/.test(source) || /hf-seek/.test(source) ? "script" : "declarative";
}
function validateHtmlVideoSpec(spec = {}) {
  const errors = [];
  const warnings = [];
  const source = spec && typeof spec === "object" ? spec : {};
  const html = typeof source.html === "string" ? source.html : "";
  if (!html.trim()) {
    errors.push("html: a non-empty HTML document is required");
  } else {
    const bytes = BufferByteLength(html);
    if (bytes > HTML_VIDEO_LIMITS.maxHtmlBytes) {
      errors.push(`html: ${bytes} bytes exceeds the ${HTML_VIDEO_LIMITS.maxHtmlBytes}-byte limit`);
    }
  }
  const width = source.width;
  const height = source.height;
  if (!isInteger(width) || width < HTML_VIDEO_LIMITS.minWidth || width > HTML_VIDEO_LIMITS.maxWidth) {
    errors.push(`width: must be an integer in ${HTML_VIDEO_LIMITS.minWidth}..${HTML_VIDEO_LIMITS.maxWidth}`);
  } else if (width % 2 !== 0) {
    errors.push(`width: ${width} must be even (the encoder subsamples chroma 2x2)`);
  }
  if (!isInteger(height) || height < HTML_VIDEO_LIMITS.minHeight || height > HTML_VIDEO_LIMITS.maxHeight) {
    errors.push(`height: must be an integer in ${HTML_VIDEO_LIMITS.minHeight}..${HTML_VIDEO_LIMITS.maxHeight}`);
  } else if (height % 2 !== 0) {
    errors.push(`height: ${height} must be even (the encoder subsamples chroma 2x2)`);
  }
  const fps = source.fps;
  if (!isFiniteNumber10(fps) || fps < HTML_VIDEO_LIMITS.minFps || fps > HTML_VIDEO_LIMITS.maxFps) {
    errors.push(`fps: must be a number in ${HTML_VIDEO_LIMITS.minFps}..${HTML_VIDEO_LIMITS.maxFps}`);
  }
  const durationSec = source.durationSec;
  if (!isFiniteNumber10(durationSec) || durationSec < HTML_VIDEO_LIMITS.minDurationSec || durationSec > HTML_VIDEO_LIMITS.maxDurationSec) {
    errors.push(`durationSec: must be a number in ${HTML_VIDEO_LIMITS.minDurationSec}..${HTML_VIDEO_LIMITS.maxDurationSec}`);
  }
  let frames = 0;
  if (errors.length === 0) {
    frames = frameCountFor(durationSec, fps);
    if (frames > HTML_VIDEO_LIMITS.maxFrames) {
      errors.push(`durationSec \xD7 fps = ${frames} frames exceeds the ${HTML_VIDEO_LIMITS.maxFrames}-frame limit`);
    }
  }
  const variables = source.variables;
  if (variables !== void 0) {
    if (!variables || typeof variables !== "object" || Array.isArray(variables)) {
      errors.push("variables: must be a plain object");
    } else {
      for (const [key, value] of Object.entries(variables)) {
        if (!/^[A-Za-z0-9_]+$/.test(key)) {
          errors.push(`variables.${key}: names may contain only letters, digits and underscore`);
        } else if (value !== null && typeof value === "object") {
          errors.push(`variables.${key}: must be a string, number or boolean`);
        }
      }
    }
  }
  const lint = lintHtmlVideo(html);
  for (const issue of lint) {
    if (issue.level === "error") errors.push(`${issue.code}: ${issue.message}`);
    else warnings.push(`${issue.code}: ${issue.message}`);
  }
  return { valid: errors.length === 0, errors, warnings, frames, durationSec: errors.length === 0 ? durationSec : 0 };
}
function BufferByteLength(text) {
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 128) bytes += 1;
    else if (code < 2048) bytes += 2;
    else if (code >= 55296 && code <= 56319) {
      bytes += 4;
      i += 1;
    } else bytes += 3;
  }
  return bytes;
}
var PRIVATE_V4 = [
  [/^0\./, "this-network"],
  [/^10\./, "private"],
  [/^127\./, "loopback"],
  [/^169\.254\./, "link-local"],
  [/^172\.(1[6-9]|2\d|3[01])\./, "private"],
  [/^192\.168\./, "private"]
];
function isBlockedRenderHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host === "::" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host === "metadata.google.internal" || host === "metadata") return true;
  return PRIVATE_V4.some(([pattern]) => pattern.test(host));
}
function isAllowedRenderUrl(rawUrl, allowRemote = false) {
  let url;
  try {
    url = new URL(String(rawUrl));
  } catch {
    return false;
  }
  if (url.protocol === "data:" || url.protocol === "blob:" || url.protocol === "about:") return true;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (!allowRemote) return false;
  return !isBlockedRenderHost(url.hostname);
}

// src/exportEncode.mjs
var ENCODER_EVEN_DIMENSION_REASON = "the encoder subsamples chroma 2x2";
var DEFAULT_ENCODE_IN_FLIGHT = 4;
var AVC_LEVELS = Object.freeze([
  Object.freeze({ idc: "1f", maxMbPerFrame: 3600, maxMbPerSecond: 108e3 }),
  Object.freeze({ idc: "28", maxMbPerFrame: 8192, maxMbPerSecond: 245760 }),
  Object.freeze({ idc: "32", maxMbPerFrame: 22080, maxMbPerSecond: 589824 }),
  Object.freeze({ idc: "33", maxMbPerFrame: 36864, maxMbPerSecond: 983040 }),
  Object.freeze({ idc: "34", maxMbPerFrame: 36864, maxMbPerSecond: 2073600 })
]);
var AVC_HIGH_PROFILE = "64";
var VP9_CANDIDATE = "vp09.00.50.08";
var AV1_CANDIDATE = "av01.0.09M.08";
var MP4_AUDIO_CANDIDATES = Object.freeze(["mp4a.40.2", "aac"]);
var WEBM_AUDIO_CANDIDATE = "opus";
var AUDIO_PACKET_FRAMES = Object.freeze({
  "mp4a.40.2": 1024,
  "aac": 1024,
  "opus": 960
});
var ENCODE_BITS_PER_SAMPLE = 0.1;
var ENCODE_BITRATE_FLOOR = 1e6;
var ENCODE_BITRATE_CEILING = 4e7;
function isInteger2(value) {
  return typeof value === "number" && Number.isInteger(value);
}
function isFiniteNumber11(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function rationalError(value) {
  if (!value || typeof value !== "object") return "must be a { numerator, denominator } pair";
  if (!isInteger2(value.numerator) || value.numerator <= 0) return `numerator must be a positive integer, got ${String(value.numerator)}`;
  if (!isInteger2(value.denominator) || value.denominator <= 0) return `denominator must be a positive integer, got ${String(value.denominator)}`;
  return null;
}
function evenDimensionError(name, value) {
  if (!isInteger2(value) || value <= 0) return `${name}: must be a positive integer, got ${String(value)}`;
  if (value % 2 !== 0) {
    return `${name}: ${value} must be even (${ENCODER_EVEN_DIMENSION_REASON})`;
  }
  return null;
}
function presetErrors(video, audio) {
  const reasons = [];
  if (!video || typeof video !== "object") {
    reasons.push("video: an encode preset needs a video config");
    return reasons;
  }
  if (typeof video.codec !== "string" || !video.codec) reasons.push("video.codec: must name the codec that will be encoded");
  const width = evenDimensionError("width", video.width);
  if (width) reasons.push(width);
  const height = evenDimensionError("height", video.height);
  if (height) reasons.push(height);
  const fps = rationalError(video.fps);
  reasons.push(...fps ? [`fps: ${fps}`] : []);
  if (video.bitrate !== void 0 && (!isFiniteNumber11(video.bitrate) || video.bitrate <= 0)) {
    reasons.push(`video.bitrate: must be a positive number of bits per second, got ${String(video.bitrate)}`);
  }
  if (audio !== null && audio !== void 0) {
    if (!audio || typeof audio !== "object") {
      reasons.push("audio: must be a config or absent");
    } else {
      if (typeof audio.codec !== "string" || !audio.codec) reasons.push("audio.codec: must name the codec that will be encoded");
      if (!isInteger2(audio.sampleRate) || audio.sampleRate <= 0) {
        reasons.push(`audio.sampleRate: must be a positive integer, got ${String(audio.sampleRate)}`);
      }
      if (!isInteger2(audio.channelCount) || audio.channelCount <= 0) {
        reasons.push(`audio.channelCount: must be a positive integer, got ${String(audio.channelCount)}`);
      }
    }
  }
  return reasons;
}
function judgePreset(preset, answer) {
  const id = preset && typeof preset === "object" ? preset.id : void 0;
  const row = { id, verdict: "unsupported", reasons: [], preset: null, config: null };
  if (!preset || typeof preset !== "object" || typeof id !== "string" || !id) {
    row.verdict = "invalid";
    row.reasons = ["id: a preset must be named, or the matrix cannot report it"];
    return row;
  }
  row.preset = preset;
  const shape = presetErrors(preset.video, preset.audio ?? null);
  if (shape.length > 0) {
    row.verdict = "invalid";
    row.reasons = shape;
    return row;
  }
  const askedAudio = preset.audio ?? null;
  if (!answer || typeof answer !== "object" || !answer.video) {
    row.verdict = "unmeasured";
    row.reasons = [`no recorded VideoEncoder.isConfigSupported answer for ${id}`];
    return row;
  }
  const reasons = [];
  if (answer.video.supported !== true) reasons.push(`the runtime refused video ${preset.video.codec}`);
  const echoed = answer.video.config && answer.video.config.codec;
  if (echoed && echoed !== preset.video.codec) {
    row.verdict = "substituted";
    reasons.push(`asked ${preset.video.codec}, the runtime answered ${echoed} \u2014 the exporter does not swap codecs`);
  }
  if (askedAudio) {
    if (!answer.audio || typeof answer.audio !== "object") {
      row.verdict = "unmeasured";
      reasons.push(`no recorded AudioEncoder.isConfigSupported answer for ${id}`);
    } else if (answer.audio.supported !== true) {
      reasons.push(`the runtime refused audio ${askedAudio.codec}`);
    } else {
      const audioEchoed = answer.audio.config && answer.audio.config.codec;
      if (audioEchoed && audioEchoed !== askedAudio.codec) {
        row.verdict = "substituted";
        reasons.push(`asked ${askedAudio.codec}, the runtime answered ${audioEchoed} \u2014 the exporter does not swap codecs`);
      }
    }
  }
  row.reasons = reasons;
  if (reasons.length === 0 && row.verdict !== "substituted" && row.verdict !== "unmeasured") {
    row.verdict = "supported";
    row.config = {
      id,
      video: {
        codec: preset.video.codec,
        width: preset.video.width,
        height: preset.video.height,
        fps: { numerator: preset.video.fps.numerator, denominator: preset.video.fps.denominator },
        bitrate: preset.video.bitrate
      },
      audio: askedAudio ? { codec: askedAudio.codec, sampleRate: askedAudio.sampleRate, channelCount: askedAudio.channelCount } : null
    };
  }
  return row;
}
function levelError(width, height, rate) {
  return `no Annex A level carries ${width}x${height} at ${rate.numerator}/${rate.denominator} fps; the export is refused instead of clamped to a level that would be illegal in the file`;
}
function avcLevelsFor(width, height, fpsFloat) {
  const mbPerFrame = Math.ceil(width / 16) * Math.ceil(height / 16);
  const mbPerSecond = mbPerFrame * fpsFloat;
  const fitting = AVC_LEVELS.filter((level) => level.maxMbPerFrame >= mbPerFrame && level.maxMbPerSecond >= mbPerSecond);
  if (fitting.length === 0) return [];
  const tightest = fitting[0];
  const loosest = fitting[fitting.length - 1];
  return tightest === loosest ? [tightest.idc] : [tightest.idc, loosest.idc];
}
function audioPresetErrors(audio) {
  if (audio === void 0 || audio === null) return [];
  if (!audio || typeof audio !== "object") return ["audio: must be a { sampleRate, channelCount } pair or absent"];
  const reasons = [];
  if (!isInteger2(audio.sampleRate) || audio.sampleRate <= 0) {
    reasons.push(`audio.sampleRate: must be a positive integer, got ${String(audio.sampleRate)}`);
  }
  if (!isInteger2(audio.channelCount) || audio.channelCount <= 0) {
    reasons.push(`audio.channelCount: must be a positive integer, got ${String(audio.channelCount)}`);
  }
  return reasons;
}
function planEncodePresets(input = {}) {
  const request = input && typeof input === "object" ? input : {};
  const errors = [];
  const widthError = evenDimensionError("width", request.width);
  if (widthError) errors.push(widthError);
  const heightError = evenDimensionError("height", request.height);
  if (heightError) errors.push(heightError);
  const fpsError = rationalError(request.fps);
  if (fpsError) errors.push(`fps: ${fpsError}`);
  errors.push(...audioPresetErrors(request.audio ?? null));
  if (errors.length > 0) return Object.freeze({ presets: Object.freeze([]), errors: Object.freeze(errors) });
  const { width, height, fps } = request;
  const audio = request.audio ?? null;
  const fpsFloat = rationalToFloat(fps);
  const bitrate = Math.min(
    ENCODE_BITRATE_CEILING,
    Math.max(ENCODE_BITRATE_FLOOR, Math.round(width * height * fpsFloat * ENCODE_BITS_PER_SAMPLE))
  );
  const levels = avcLevelsFor(width, height, fpsFloat);
  if (levels.length === 0) {
    return Object.freeze({ presets: Object.freeze([]), errors: Object.freeze([levelError(width, height, fps)]) });
  }
  const video = (codec) => Object.freeze({
    codec,
    width,
    height,
    fps: Object.freeze({ numerator: fps.numerator, denominator: fps.denominator }),
    bitrate
  });
  const withAudio = (codec) => audio ? Object.freeze({ codec, sampleRate: audio.sampleRate, channelCount: audio.channelCount }) : null;
  const families = [
    ...levels.map((idc) => ({ container: "mp4", codec: `avc1.${AVC_HIGH_PROFILE}00${idc}`, audio: audio ? MP4_AUDIO_CANDIDATES : [null] })),
    { container: "webm", codec: VP9_CANDIDATE, audio: audio ? [WEBM_AUDIO_CANDIDATE] : [null] },
    { container: "webm", codec: AV1_CANDIDATE, audio: audio ? [WEBM_AUDIO_CANDIDATE] : [null] }
  ];
  const presets = families.flatMap((family) => family.audio.map((audioCodec) => {
    const audioConfig = audio ? withAudio(audioCodec) : null;
    const id = `${family.container}:${family.codec}:${width}x${height}@${fps.numerator}/${fps.denominator}` + (audioConfig ? `:${audioConfig.codec}` : "");
    return Object.freeze({ id, container: family.container, video: video(family.codec), audio: audioConfig });
  }));
  return Object.freeze({ presets: Object.freeze(presets), errors: Object.freeze([]) });
}
function planEncodeConfig(input = {}) {
  const presets = Array.isArray(input.presets) ? input.presets : [];
  if (presets.length === 0) return { kind: "refused", reason: "no-presets", checked: [] };
  const answers = input.answers && typeof input.answers === "object" ? input.answers : {};
  const checked = presets.map((preset) => judgePreset(preset, preset && preset.id ? answers[preset.id] : void 0));
  const winner = checked.find((row) => row.verdict === "supported");
  if (winner) return { kind: "ready", preset: winner.preset, config: winner.config, checked };
  const measured = checked.filter((row) => row.verdict !== "unmeasured");
  return {
    kind: "refused",
    reason: measured.length === 0 ? "nothing-measured" : "nothing-supported",
    checked
  };
}
function planEncodeSample(input = {}) {
  const { index, rate, contentEndTicks: contentEndTicks2, timescale = 1e6 } = input;
  if (!isInteger2(index) || index < 0) return null;
  if (rationalError(rate)) return null;
  if (!isFiniteNumber11(timescale) || timescale <= 0) return null;
  if (!isFiniteNumber11(contentEndTicks2) || contentEndTicks2 <= 0) return null;
  const startsAt = (position) => Math.round(position * timescale * rate.denominator / rate.numerator);
  const contentEnd = Math.round(contentEndTicks2 * timescale / TICKS_PER_SECOND);
  const timestamp = startsAt(index);
  if (timestamp >= contentEnd) return null;
  const next = startsAt(index + 1);
  return Object.freeze({
    timestamp,
    // A whole frame, unless the content ends first: muxing a full frame's
    // length past the timeline makes a file longer than the project.
    duration: Math.min(next - timestamp, contentEnd - timestamp),
    isLast: next >= contentEnd
  });
}
function encodeAudioSampleCount(input = {}) {
  const { contentEndTicks: contentEndTicks2, sampleRate } = input;
  if (!isFiniteNumber11(contentEndTicks2) || contentEndTicks2 <= 0) return null;
  if (!isInteger2(sampleRate) || sampleRate <= 0) return null;
  return Math.round(contentEndTicks2 * sampleRate / TICKS_PER_SECOND);
}
function planEncodeAudioSample(input = {}) {
  const { index, sampleRate, framesPerPacket, timescale = 1e6 } = input;
  if (!isInteger2(index) || index < 0) return null;
  if (!isInteger2(sampleRate) || sampleRate <= 0) return null;
  if (!isInteger2(framesPerPacket) || framesPerPacket <= 0) return null;
  if (!isFiniteNumber11(timescale) || timescale <= 0) return null;
  const totalSamples = encodeAudioSampleCount(input);
  if (totalSamples === null) return null;
  const startSample = index * framesPerPacket;
  if (startSample >= totalSamples) return null;
  const startsAt = (position) => Math.round(position * timescale / sampleRate);
  const frames = Math.min(framesPerPacket, totalSamples - startSample);
  const timestamp = startsAt(startSample);
  const end = startsAt(Math.min(startSample + framesPerPacket, totalSamples));
  return Object.freeze({
    startSample,
    frames,
    timestamp,
    duration: end - timestamp,
    isLast: startSample + frames >= totalSamples
  });
}
var ENCODE_OUTPUT_STATES = Object.freeze(["pending", "started", "canceled", "finalizing", "finalized"]);
var ENCODE_PROGRESS_UNTIL_CLOSED = 0.99;
function encodeAudioPacketCount(input = {}) {
  const { framesPerPacket } = input;
  if (!isInteger2(framesPerPacket) || framesPerPacket <= 0) return null;
  const totalSamples = encodeAudioSampleCount(input);
  if (totalSamples === null) return null;
  return Math.ceil(totalSamples / framesPerPacket);
}
function planEncodeFinish(input = {}) {
  const {
    totalFrames,
    framesQueued,
    videoPackets,
    audioPackets,
    totalAudioPackets,
    audioPacketsQueued,
    totalAudioHands = totalAudioPackets,
    videoInFlight,
    audioInFlight,
    videoParked = 0,
    audioParked = 0,
    videoFlushed,
    audioFlushed,
    outputState,
    hasVideo = true,
    hasAudio = true
  } = input;
  const counters = [
    totalFrames,
    framesQueued,
    videoPackets,
    audioPackets,
    totalAudioPackets,
    audioPacketsQueued,
    totalAudioHands,
    videoInFlight,
    audioInFlight,
    videoParked,
    audioParked
  ];
  if (counters.some((value) => !isInteger2(value) || value < 0)) return null;
  if (typeof videoFlushed !== "boolean" || typeof audioFlushed !== "boolean") return null;
  if (!ENCODE_OUTPUT_STATES.includes(outputState)) return null;
  if (outputState === "finalized") {
    return Object.freeze({ action: "done", ready: true, blocking: Object.freeze([]) });
  }
  if (outputState === "canceled" || outputState === "finalizing") {
    const reason = outputState === "canceled" ? "output-canceled" : "output-finalizing";
    return Object.freeze({ action: "stop", ready: false, blocking: Object.freeze([reason]) });
  }
  if (outputState === "pending") {
    return Object.freeze({ action: "start", ready: false, blocking: Object.freeze(["output-not-started"]) });
  }
  const blocking = [];
  if (hasVideo && framesQueued < totalFrames) blocking.push("frames-queued");
  if (hasAudio && audioPacketsQueued < totalAudioHands) blocking.push("audio-not-queued");
  if (hasVideo && !videoFlushed) blocking.push("video-not-flushed");
  if (hasAudio && !audioFlushed) blocking.push("audio-not-flushed");
  if (hasVideo && videoInFlight > 0) blocking.push("video-in-flight");
  if (hasAudio && audioInFlight > 0) blocking.push("audio-in-flight");
  if (hasVideo && videoPackets < framesQueued) blocking.push("video-packets");
  if (hasAudio && audioPackets < totalAudioPackets) blocking.push("audio-packets");
  if (blocking.length === 0) {
    return Object.freeze({ action: "finalize", ready: true, blocking: Object.freeze([]) });
  }
  const drained = (inFlight, written, parked, handed) => inFlight > 0 && written + parked >= handed;
  const owed = blocking.filter((reason) => reason !== "video-packets" && reason !== "audio-packets" && !(reason === "video-in-flight" && drained(videoInFlight, videoPackets, videoParked, framesQueued)) && !(reason === "audio-in-flight" && drained(audioInFlight, audioPackets, audioParked, audioPacketsQueued)));
  if (owed.length === 0) {
    return Object.freeze({ action: "stalled", ready: false, blocking: Object.freeze(blocking) });
  }
  const first = blocking[0];
  const action = first === "frames-queued" ? "paint" : first === "audio-not-queued" ? "pump" : first === "video-not-flushed" ? "flush-video" : first === "audio-not-flushed" ? "flush-audio" : "wait";
  return Object.freeze({ action, ready: false, blocking: Object.freeze(blocking) });
}
function planEncodePacketMeta(input = {}) {
  const { packetsAdded, hasMeta = false } = input;
  if (!isInteger2(packetsAdded) || packetsAdded < 0) return null;
  if (typeof hasMeta !== "boolean") return null;
  if (packetsAdded > 0) {
    return Object.freeze({
      action: "plain",
      reason: hasMeta ? "description-already-written" : void 0
    });
  }
  return hasMeta ? Object.freeze({ action: "with-meta", reason: "first-packet" }) : Object.freeze({ action: "hold", reason: "no-description" });
}
var AUDIO_MIN_HAND_PACKETS = Object.freeze({
  "mp4a.40.2": 2,
  "aac": 2,
  "opus": 1
});
function encodeAudioHandCount(input = {}) {
  const packets = encodeAudioPacketCount(input);
  if (packets === null) return null;
  const floor = AUDIO_MIN_HAND_PACKETS[input.codec] ?? 1;
  return Math.max(packets, floor);
}
function planEncodeAudioPadding(input = {}) {
  const { index, framesPerPacket } = input;
  if (!isInteger2(index) || index < 0) return null;
  if (!isInteger2(framesPerPacket) || framesPerPacket <= 0) return null;
  const packets = encodeAudioPacketCount(input);
  if (packets === null) return null;
  const hands = encodeAudioHandCount(input);
  if (index < packets || index >= hands) return null;
  const { sampleRate } = input;
  const startsAt = (position) => Math.round(position * 1e6 / sampleRate);
  const startSample = index * framesPerPacket;
  const timestamp = startsAt(startSample);
  return Object.freeze({
    startSample,
    frames: framesPerPacket,
    timestamp,
    duration: startsAt(startSample + framesPerPacket) - timestamp
  });
}
function planEncodeChunk(input = {}) {
  const { kind, openSamples, packetsAdmitted, packetTotal } = input;
  if (kind !== "video" && kind !== "audio") return null;
  const counters = [openSamples, packetsAdmitted, packetTotal];
  if (counters.some((value) => !isInteger2(value) || value < 0)) return null;
  const identity = kind === "audio" ? "ordinal" : "timestamp";
  if (packetsAdmitted >= packetTotal) {
    return kind === "audio" ? Object.freeze({ identity, action: "drop-tail", reason: "encoder-tail" }) : Object.freeze({ identity, action: "fail", reason: "packet-past-the-schedule" });
  }
  if (openSamples === 0) {
    return Object.freeze({ identity, action: "fail", reason: "no-sample-behind-packet" });
  }
  return Object.freeze({
    identity,
    action: "write",
    reason: kind === "audio" ? "measured-order-only" : "measured-timestamp-echo"
  });
}
function planEncodeProgress(input = {}) {
  const {
    totalFrames = 0,
    framesDone = 0,
    totalAudioPackets = 0,
    audioPacketsDone = 0,
    outputState
  } = input;
  const counters = [totalFrames, framesDone, totalAudioPackets, audioPacketsDone];
  if (counters.some((value) => !isInteger2(value) || value < 0)) return null;
  if (outputState !== void 0 && !ENCODE_OUTPUT_STATES.includes(outputState)) return null;
  const closed = outputState === "finalized";
  if (closed) return 1;
  const video = totalFrames === 0 ? null : Math.min(1, framesDone / totalFrames);
  const audio = totalAudioPackets === 0 ? null : Math.min(1, audioPacketsDone / totalAudioPackets);
  const shares = [video, audio].filter((share) => share !== null);
  if (shares.length === 0) return 0;
  const slowest = Math.min(...shares);
  return slowest >= 1 ? ENCODE_PROGRESS_UNTIL_CLOSED : slowest;
}
function planEncodeQueue(input = {}) {
  const { inFlight, limit } = input;
  const bound = isInteger2(limit) && limit > 0 ? limit : DEFAULT_ENCODE_IN_FLIGHT;
  const outstanding = isFiniteNumber11(inFlight) && inFlight > 0 ? Math.floor(inFlight) : 0;
  return Object.freeze({
    action: outstanding >= bound ? "wait" : "push",
    outstanding,
    limit: bound,
    room: Math.max(0, bound - outstanding)
  });
}

// src/exportContent.mjs
var ENCODE_AUDIO_REQUEST = Object.freeze({ sampleRate: 48e3, channelCount: 2 });
var ENCODE_REFUSAL_REASONS = Object.freeze([
  "bad-canvas",
  "background-image",
  "background-transparent",
  "empty",
  "stacked-rows",
  "text",
  "effects",
  "mask",
  "blend",
  "transition",
  "reverse",
  "stabilize",
  "fit-unsupported",
  "rotation"
]);
var EXPORT_BAKED_EFFECTS = Object.freeze([
  "blur",
  "mono",
  "negate",
  "sepia",
  "sharpen",
  "vibrance",
  "vivid"
]);
var EXPORT_BAKED = new Set(EXPORT_BAKED_EFFECTS);
function exportBakesEffect(type) {
  return EXPORT_BAKED.has(type);
}
function exportBakesEffectInstance(effect) {
  const type = effect?.type;
  if (typeof type !== "string") return false;
  if (EXPORT_BAKED.has(type)) return true;
  if (type !== "lut3d") return false;
  const preset = effect.params?.lut;
  if (!isRegisteredLut(preset)) return false;
  const grade = lutGrade(preset);
  if (grade === null) return true;
  return grade.every((op) => op.op !== "grain");
}
function isRegisteredLut(preset) {
  const spec = EFFECT_REGISTRY.lut3d?.params?.find((param) => param.name === "lut");
  return Array.isArray(spec?.options) && spec.options.includes(preset);
}
function refusedEffectName(effect) {
  const type = typeof effect?.type === "string" ? effect.type : "";
  if (type !== "lut3d") return type;
  const preset = effect.params?.lut;
  return typeof preset === "string" && preset ? `${type}:${preset}` : type;
}
function isFiniteNumber12(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function isPositiveInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
function usableRate(fps) {
  if (isPositiveInteger(fps?.numerator) && isPositiveInteger(fps?.denominator)) {
    return { numerator: fps.numerator, denominator: fps.denominator };
  }
  if (isFiniteNumber12(fps) && fps > 0) return fpsToRational(fps);
  return null;
}
function isPaintableFit(layout) {
  return layout.fit !== "smart";
}
function isRotated(clip) {
  const degrees = [
    clip?.transform?.rotation,
    clip?.rotation,
    ...Array.isArray(clip?.keyframes) ? clip.keyframes.filter((key) => key?.prop === "rotation").map((key) => key?.value) : []
  ];
  return degrees.some((value) => isFiniteNumber12(value) && value % 360 !== 0);
}
function makesSound(clip) {
  if (!(clipSpan(clip).duration > 0)) return false;
  const stored = isFiniteNumber12(clip?.volume) ? clip.volume : 100;
  if (stored > 0) return true;
  const keyed = Array.isArray(clip?.keyframes) ? clip.keyframes : [];
  return keyed.some((key) => key?.prop === "volume" && isFiniteNumber12(key?.value) && key.value > 0);
}
function planEncodeContent(input) {
  const reasons = /* @__PURE__ */ new Set();
  const canvas = input?.canvas ?? null;
  const fps = usableRate(canvas?.fps);
  if (!isPositiveInteger(canvas?.width) || !isPositiveInteger(canvas?.height) || !fps) {
    return verdict(["bad-canvas"], { fps: null, canvas: null, grid: { frameCount: 0, endTicks: 0 } });
  }
  const rows = selectFileRows(input);
  if (rows.rows.length === 0) reasons.add("empty");
  if (rows.stacked.length > 0) reasons.add("stacked-rows");
  if (rows.overlays.length > 0) reasons.add("text");
  const background = canvas.background;
  const blank = typeof background?.value !== "string" || background.value.trim() === "";
  if (background?.type === "image" && !blank) reasons.add("background-image");
  if (background?.type === "transparent") reasons.add("background-transparent");
  const tracks = projectTracks(input);
  const used = [...rows.rows, ...rows.audio].map((row) => tracks[row.trackIndex]).filter(Boolean);
  const blockedEffects = /* @__PURE__ */ new Set();
  for (const track of used) {
    const items = Array.isArray(track?.items) ? track.items : [];
    for (const clip of items) {
      if (!(clipSpan(clip).duration > 0)) continue;
      if (Array.isArray(clip.effects) && clip.effects.length > 0) {
        const unbaked = clip.effects.filter((effect) => !exportBakesEffectInstance(effect));
        if (unbaked.length > 0) {
          reasons.add("effects");
          for (const effect of unbaked) blockedEffects.add(refusedEffectName(effect));
        }
      }
      if (normalizeMask(clip.mask)) reasons.add("mask");
      if (blendModeOf(clip) !== "normal") reasons.add("blend");
      if (clip.transitionIn) reasons.add("transition");
      if (clip.reverse === true) reasons.add("reverse");
      if (clip.stabilize === true) reasons.add("stabilize");
      if (!isPaintableFit(resolveClipLayout(clip))) reasons.add("fit-unsupported");
      if (isRotated(clip)) reasons.add("rotation");
    }
  }
  const scheduler = createFrameScheduler(input, { rate: fps });
  const silent = !used.some((track) => !isTrackMuted(track) && (Array.isArray(track?.items) ? track.items : []).some((clip) => makesSound(clip)));
  return verdict([...reasons], { fps, canvas, grid: scheduler, silent, blockedEffects });
}
function verdict(rawReasons, { fps, canvas, grid, silent, blockedEffects = /* @__PURE__ */ new Set() }) {
  const reasons = ENCODE_REFUSAL_REASONS.filter((reason) => new Set(rawReasons).has(reason)).sort();
  const refused = reasons.length > 0;
  const contentEndTicks2 = grid.endTicks ?? 0;
  return Object.freeze({
    kind: refused ? "refused" : "eligible",
    reasons: Object.freeze(reasons),
    // Which effect types stand between this project and a file. Sorted and
    // de-duplicated so two clips with one blur name it once; empty when
    // `effects` is not among the reasons, so a caller cannot print a warning
    // about a project that would export.
    blockedEffects: Object.freeze([...blockedEffects].sort()),
    request: refused || !fps ? null : Object.freeze({
      width: canvas.width,
      height: canvas.height,
      fps: Object.freeze({ numerator: fps.numerator, denominator: fps.denominator }),
      audio: silent ? null : Object.freeze({ ...ENCODE_AUDIO_REQUEST })
    }),
    canvas: refused || !fps ? null : Object.freeze({ width: canvas.width, height: canvas.height, fps: Object.freeze({ ...fps }) }),
    totalFrames: grid.frameCount ?? 0,
    contentEndTicks: contentEndTicks2,
    durationSec: contentEndTicks2 / TICKS_PER_SECOND
  });
}
function clamp013(value) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}
function evenBox(size) {
  return Math.max(2, Math.floor(size / 2) * 2);
}
function positiveSize(value) {
  return isFiniteNumber12(value) && value > 0 ? Math.round(value) : 0;
}
function planEncodePlate(input = {}) {
  const mw = positiveSize(input.media?.width);
  const mh = positiveSize(input.media?.height);
  if (!(mw > 0 && mh > 0)) return null;
  const canvasW = positiveSize(input.canvas?.width);
  const canvasH = positiveSize(input.canvas?.height);
  if (!(canvasW > 0 && canvasH > 0)) return null;
  const layout = resolveClipLayout(input.layout ?? {});
  if (layout.fit === "smart") return null;
  const boxW = evenBox(canvasW);
  const boxH = evenBox(canvasH);
  let sx = 0;
  let sy = 0;
  let sw = mw;
  let sh = mh;
  if (layout.fit === "crop" && layout.cropRect) {
    const rect = layout.cropRect;
    const cx = clamp013(rect.x);
    const cy = clamp013(rect.y);
    const cw = clamp013(rect.w);
    const ch = clamp013(rect.h);
    if (cw > 0 && ch > 0 && (cx > 0 || cy > 0 || cw < 1 || ch < 1)) {
      sx = Math.round(cx * mw);
      sy = Math.round(cy * mh);
      sw = Math.max(1, Math.round(cw * mw));
      sh = Math.max(1, Math.round(ch * mh));
    }
  }
  if (layout.fit === "fill") {
    const target = boxW / boxH;
    const ratio = sw / sh;
    if (ratio > target) {
      const keep = Math.max(1, Math.round(sh * target));
      sx += Math.round((sw - keep) / 2);
      sw = keep;
    } else if (ratio < target) {
      const keep = Math.max(1, Math.round(sw / target));
      sy += Math.round((sh - keep) / 2);
      sh = keep;
    }
  }
  const covers = layout.fit === "fill" || layout.fit === "stretch";
  const scale = covers ? 1 : Math.min(boxW / sw, boxH / sh);
  const fitW = covers ? boxW : Math.max(1, Math.round(sw * scale));
  const fitH = covers ? boxH : Math.max(1, Math.round(sh * scale));
  const transform = input.transform ?? {};
  const scaleX = isFiniteNumber12(transform.scaleX) && transform.scaleX > 0 ? transform.scaleX : 1;
  const scaleY = isFiniteNumber12(transform.scaleY) && transform.scaleY > 0 ? transform.scaleY : 1;
  const dw = Math.max(1, Math.round(fitW * scaleX));
  const dh = Math.max(1, Math.round(fitH * scaleY));
  return Object.freeze({
    source: Object.freeze({ sx, sy, sw, sh }),
    dest: Object.freeze({
      dx: Math.round((boxW - dw) / 2 + (isFiniteNumber12(transform.x) ? transform.x : 0)),
      dy: Math.round((boxH - dh) / 2 + (isFiniteNumber12(transform.y) ? transform.y : 0)),
      dw,
      dh
    }),
    alpha: isFiniteNumber12(input.opacity) ? Math.min(1, Math.max(0, input.opacity)) : 1
  });
}
function cssColorOf(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text === "") return null;
  if (/^0x[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(text)) return `#${text.slice(2)}`;
  return text;
}
function encodeCanvasFill(canvas) {
  const background = canvas?.background;
  const type = background?.type;
  if (type === "transparent") return null;
  if (type === "image") return cssColorOf(background.value) === null ? "#000000" : null;
  return cssColorOf(background?.value) ?? "#000000";
}

// src/exportMix.mjs
function isFiniteNumber13(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function isPositiveInteger2(value) {
  return Number.isInteger(value) && value > 0;
}
var EXPORT_MIX_REFUSALS = Object.freeze([
  "reverse",
  "not-playable",
  "no-position",
  "no-pcm",
  "bad-rate",
  "bad-gain"
]);
function planeIndexFor(targetChannel, channelCount) {
  return Math.min(targetChannel, channelCount - 1);
}
function tapAt(samples, index) {
  if (!samples || index < 0 || index >= samples.length) return 0;
  const value = Number(samples[index]);
  return Number.isFinite(value) ? value : 0;
}
function contributionOf(source, atSec, target) {
  if (source.plays === false) {
    return { refusal: typeof source.refusal === "string" ? source.refusal : "not-playable" };
  }
  const gain = Number(source.gain);
  if (gain === 0) return null;
  if (!isFiniteNumber13(gain)) return { refusal: "bad-gain" };
  if (!isFiniteNumber13(source.mediaTicks)) return { refusal: "no-position" };
  const planes = Array.isArray(source.channels) ? source.channels : [];
  if (planes.length === 0) return { refusal: "no-pcm" };
  const sampleRate = Number(source.sampleRate);
  if (!isFiniteNumber13(sampleRate) || sampleRate <= 0) return { refusal: "bad-rate" };
  const rate = isFiniteNumber13(source.rate) ? source.rate : 1;
  const mediaStartSec = source.mediaTicks / TICKS_PER_SECOND;
  return {
    clipId: source.clipId ?? null,
    trackId: source.trackId ?? null,
    gain,
    rate,
    mediaStartSec,
    sampleRate,
    planes,
    atSec,
    targetRate: target.sampleRate
  };
}
function mediaIndexOf(who, startSample, offset) {
  const timelineSec = (startSample + offset) / who.targetRate;
  const mediaSec = who.mediaStartSec + who.rate * (timelineSec - who.atSec);
  return mediaSec * who.sampleRate;
}
function planExportMixPacket(input = {}) {
  const request = input && typeof input === "object" ? input : {};
  const frames = request.frames;
  const startSample = request.startSample;
  const at = request.at ?? 0;
  if (!isPositiveInteger2(frames)) return null;
  if (!Number.isInteger(startSample) || startSample < 0) return null;
  if (!isFiniteNumber13(at)) return null;
  const asked = request.target && typeof request.target === "object" ? request.target : {};
  const target = Object.freeze({
    sampleRate: asked.sampleRate ?? ENCODE_AUDIO_REQUEST.sampleRate,
    channelCount: asked.channelCount ?? ENCODE_AUDIO_REQUEST.channelCount
  });
  if (!isPositiveInteger2(target.sampleRate) || !isPositiveInteger2(target.channelCount)) return null;
  const channels = [];
  for (let index = 0; index < target.channelCount; index++) channels.push(new Float32Array(frames));
  const atSec = at / TICKS_PER_SECOND;
  const entries = Array.isArray(request.sources) ? request.sources : [];
  const mixed = [];
  const refused = [];
  for (const source of entries) {
    if (!source || typeof source !== "object") continue;
    const who = contributionOf(source, atSec, target);
    if (who === null) continue;
    if (who.refusal) {
      refused.push(Object.freeze({ clipId: source.clipId ?? null, reason: who.refusal }));
      continue;
    }
    let overRange = 0;
    for (let channel = 0; channel < target.channelCount; channel++) {
      const plane = who.planes[planeIndexFor(channel, who.planes.length)];
      const run = channels[channel];
      for (let offset = 0; offset < frames; offset++) {
        const position = mediaIndexOf(who, startSample, offset);
        const head = Math.floor(position);
        const fraction = position - head;
        const value = who.gain * (tapAt(plane, head) + (tapAt(plane, head + 1) - tapAt(plane, head)) * fraction);
        run[offset] += value;
        if (run[offset] > 1 || run[offset] < -1) overRange += 1;
      }
    }
    mixed.push(Object.freeze({
      clipId: who.clipId,
      trackId: who.trackId,
      gain: who.gain,
      rate: who.rate,
      mediaStartSec: who.mediaStartSec,
      sampleRate: who.sampleRate,
      overRange
    }));
  }
  return Object.freeze({
    at,
    startSample,
    frames,
    target,
    channels,
    mixed: Object.freeze(mixed),
    refused: Object.freeze(refused)
  });
}

// src/generationToAssetCenter.mjs
function normalizeGenerationOutput(raw) {
  return {
    providerTaskId: raw.providerTaskId || "",
    providerId: raw.providerId || "",
    model: raw.model || "",
    downloadUrl: raw.downloadUrl || "",
    mimeType: raw.mimeType || "video/mp4",
    width: Number(raw.width) || 0,
    height: Number(raw.height) || 0,
    durationSec: Number(raw.durationSec) || 0,
    fileSizeBytes: Number(raw.fileSizeBytes) || 0,
    sha256: raw.checksum || "",
    cost: Number(raw.cost) || 0,
    prompt: raw.prompt || "",
    negativePrompt: raw.negativePrompt || "",
    seed: raw.seed !== void 0 ? Number(raw.seed) : null,
    params: raw.params || {},
    localPath: raw.localPath || "",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function generationOutputToCatalogEntry(output, overrides = {}) {
  const normalized = normalizeGenerationOutput(output);
  const isVideo = normalized.mimeType.startsWith("video/");
  const isImage = normalized.mimeType.startsWith("image/");
  const isAudio = normalized.mimeType.startsWith("audio/");
  let category = "generated";
  if (isVideo) category = "video";
  else if (isImage) category = "image";
  else if (isAudio) category = "audio";
  const tags = ["generated", "ai", category, normalized.providerId, normalized.model];
  if (normalized.prompt) tags.push(...normalized.prompt.slice(0, 50).split(/\s+/).filter((w) => w.length > 3).slice(0, 5));
  const baseEntry = {
    assetKind: "media",
    category,
    tags,
    version: "1.0.0",
    sizeBytes: normalized.fileSizeBytes || 0,
    sha256: normalized.sha256 || `gen-${normalized.providerTaskId}`,
    source: {
      type: "remote",
      url: normalized.downloadUrl
    },
    sourceUrl: normalized.downloadUrl,
    previewRef: null,
    // Could be set to a thumbnail URL
    creator: `${normalized.providerId} (${normalized.model})`,
    priceUsd: 0,
    salesChannel: "generated",
    license: {
      status: "approved",
      name: "TM Tools Generated Content License",
      url: "https://tmtools.dev/licenses/generated",
      attribution: `Generated by ${normalized.providerId} (${normalized.model})`,
      commercialUse: true,
      redistributable: true,
      territories: ["worldwide"],
      expiresAt: null,
      proof: `Generated by ${normalized.providerId} (${normalized.model}) via TM Tools`,
      reviewer: "tmcut-system",
      reviewedAt: (/* @__PURE__ */ new Date()).toISOString(),
      review: {
        decision: "approved",
        by: "tmcut-system",
        at: (/* @__PURE__ */ new Date()).toISOString(),
        note: `AI-generated content via ${normalized.providerId}/${normalized.model}. Royalty-free for TM Tools projects.`
      }
    },
    // Generation metadata (preserved for traceability)
    generationMeta: {
      providerId: normalized.providerId,
      providerTaskId: normalized.providerTaskId,
      model: normalized.model,
      prompt: normalized.prompt,
      negativePrompt: normalized.negativePrompt,
      seed: normalized.seed,
      params: normalized.params,
      generatedAt: normalized.generatedAt,
      originalMimeType: normalized.mimeType,
      originalDimensions: { width: normalized.width, height: normalized.height },
      durationSec: normalized.durationSec,
      cost: normalized.cost
    }
  };
  return Object.assign({}, baseEntry, overrides, {
    id: overrides.id || `gen-${normalized.providerId}-${normalized.providerTaskId}`,
    title: overrides.title || `Generated ${category} (${normalized.model})`,
    description: overrides.description || `AI-generated ${category} via ${normalized.providerId}/${normalized.model}`,
    tags: [...baseEntry.tags || [], ...overrides.tags || []],
    category: overrides.category || category,
    generationMeta: baseEntry.generationMeta
  });
}
function getAssemblyReadyAssets(catalog, roles = ["music", "sfx"]) {
  return catalog.filter((entry) => {
    if (!entry.assetKind === "media") return false;
    if (entry.category === "music" && roles.includes("music")) return true;
    if (entry.category === "sound-effects" && roles.includes("sfx")) return true;
    if (entry.assetKind === "title-preset" && roles.includes("title")) return true;
    if (entry.assetKind === "effect-preset" && roles.includes("effect")) return true;
    return false;
  }).map((entry) => ({
    entryId: entry.id,
    title: entry.title,
    category: entry.category,
    assetKind: entry.assetKind,
    durationSec: entry.generationMeta?.durationSec || 0,
    fileSizeBytes: entry.sizeBytes,
    license: entry.license,
    source: entry.source,
    previewRef: entry.previewRef
  }));
}

// src/providerRouting.mjs
var CAPABILITY_MODALITY = {
  "video-gen": "video",
  "image-gen": "image"
};
function isProviderHealthy(manifest, unhealthy = []) {
  if (!manifest) return false;
  return !unhealthy.includes(manifest.providerId);
}
function canServe(manifest, request = {}) {
  if (!manifest || typeof manifest !== "object") return { ok: false, reason: "no-manifest" };
  const capabilities = Array.isArray(request.capabilities) ? request.capabilities : [];
  const modalities = Array.isArray(manifest.modalities) ? manifest.modalities : [];
  for (const capability of capabilities) {
    const needed = CAPABILITY_MODALITY[capability];
    if (needed) {
      if (!modalities.includes(needed)) return { ok: false, reason: `no-${needed}-modality` };
    } else if (Array.isArray(manifest.extraCapabilities)) {
      if (!manifest.extraCapabilities.includes(capability)) {
        return { ok: false, reason: `unsupported-${capability}` };
      }
    }
  }
  const durationSec = Number(request.durationSec);
  if (Number.isFinite(durationSec) && durationSec > 0) {
    const ceiling = Number(manifest.maxDurationSec);
    if (Number.isFinite(ceiling) && durationSec > ceiling) {
      return { ok: false, reason: `duration-${durationSec}s-over-${ceiling}s` };
    }
  }
  return { ok: true };
}
function routeScene(options = {}) {
  const request = options.request || {};
  const manifests = Array.isArray(options.manifests) ? options.manifests : [];
  const policy = options.policy || {};
  const unhealthy = Array.isArray(options.unhealthy) ? options.unhealthy : [];
  const requireVerified = Boolean(options.requireVerified);
  const byId = new Map(manifests.map((m) => [m.providerId, m]));
  const allowed = Array.isArray(policy.allowedProviders) && policy.allowedProviders.length > 0 ? new Set(policy.allowedProviders) : null;
  const fallback = Array.isArray(policy.fallbackOrder) ? policy.fallbackOrder : [];
  const minimums = Array.isArray(policy.minimumCapabilities) ? policy.minimumCapabilities : [];
  const capabilities = [.../* @__PURE__ */ new Set([...minimums, ...Array.isArray(request.capabilities) ? request.capabilities : []])];
  const ordered = [];
  const seen = /* @__PURE__ */ new Set();
  for (const id of fallback) {
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  }
  for (const [id] of byId) {
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  }
  const skipped = [];
  for (const providerId of ordered) {
    if (allowed && !allowed.has(providerId)) {
      skipped.push({ providerId, reason: "not-allowed-by-policy" });
      continue;
    }
    const manifest = byId.get(providerId);
    if (!manifest) {
      skipped.push({ providerId, reason: "not-registered" });
      continue;
    }
    if (!isProviderHealthy(manifest, unhealthy)) {
      skipped.push({ providerId, reason: "unhealthy" });
      continue;
    }
    if (requireVerified && !manifest.verified) {
      skipped.push({ providerId, reason: "not-verified" });
      continue;
    }
    const verdict2 = canServe(manifest, { ...request, capabilities });
    if (!verdict2.ok) {
      skipped.push({ providerId, reason: verdict2.reason });
      continue;
    }
    return { ok: true, providerId, skipped };
  }
  return {
    ok: false,
    reason: "no-capable-provider",
    skipped
  };
}
function routeStoryboard(options = {}) {
  const scenes = Array.isArray(options.scenes) ? options.scenes : [];
  const routed = [];
  let unrouted = 0;
  for (const scene of scenes) {
    const route = routeScene({ ...options, request: scene });
    if (route.ok) {
      routed.push({ sceneId: scene.sceneId ?? null, providerId: route.providerId, skipped: route.skipped });
    } else {
      unrouted += 1;
      routed.push({ sceneId: scene.sceneId ?? null, providerId: null, skipped: route.skipped, reason: route.reason });
    }
  }
  return { routed, unrouted, allRouted: unrouted === 0 };
}
function buildCapabilityMatrix(manifests = [], request = {}) {
  return manifests.map((manifest) => {
    const verdict2 = canServe(manifest, request);
    return {
      providerId: manifest.providerId,
      displayName: manifest.displayName || manifest.providerId,
      verified: Boolean(manifest.verified),
      modalities: Array.isArray(manifest.modalities) ? [...manifest.modalities] : [],
      maxDurationSec: Number(manifest.maxDurationSec) || 0,
      costModel: manifest.costModel || "per-credit",
      estimatedCostPerUnit: Number(manifest.estimatedCostPerUnit) || 0,
      canServe: verdict2.ok,
      reason: verdict2.ok ? null : verdict2.reason
    };
  });
}

// src/assetCenter.mjs
var ASSET_CENTER_SCHEMA_VERSION = 1;
var INSTALL_STATES = {
  catalog: "catalog",
  downloading: "downloading",
  verifying: "verifying",
  installed: "installed",
  error: "error"
};
var DOWNLOAD_STATES = {
  queued: "queued",
  active: "active",
  retrying: "retrying",
  done: "done",
  failed: "failed",
  cancelled: "cancelled"
};
var LICENSE_STATUS = {
  approved: "approved",
  review: "review",
  unknown: "unknown"
};
var ASSET_KINDS = ["media", "effect-preset", "title-preset"];
function createCatalogEntry(input = {}) {
  const source = normalizeSource(input.source, input.sourceUrl);
  return {
    schemaVersion: ASSET_CENTER_SCHEMA_VERSION,
    id: input.id || "",
    title: input.title || "",
    description: input.description || "",
    category: input.category || "other",
    assetKind: ASSET_KINDS.includes(input.assetKind) ? input.assetKind : "media",
    tags: Array.isArray(input.tags) ? input.tags.slice() : [],
    version: input.version || "1.0.0",
    sizeBytes: Number(input.sizeBytes) || 0,
    sha256: input.sha256 || "",
    sourceUrl: source.type === "remote" ? source.url : "",
    source,
    previewRef: input.previewRef || null,
    creator: input.creator || "",
    // Paid assets (USD) — a value > 0 additionally requires a live
    // entitlement grant in the install gate. Free catalog entries keep 0.
    priceUsd: Number(input.priceUsd) > 0 ? Number(input.priceUsd) : 0,
    // How grants get issued for a paid entry (publishing audit — the
    // install gate never trusts this field, only the grants themselves).
    salesChannel: typeof input.salesChannel === "string" ? input.salesChannel : "",
    license: normalizeLicense(input.license)
  };
}
function normalizeSource(source, legacyUrl) {
  if (source && typeof source === "object") {
    if (source.type === "remote" && typeof source.url === "string" && source.url) {
      return { type: "remote", url: source.url };
    }
    if (source.type === "sample" && typeof source.sampleId === "string" && source.sampleId) {
      return { type: "sample", sampleId: source.sampleId };
    }
    if (source.type === "embedded" && source.payload && typeof source.payload === "object") {
      return { type: "embedded", payload: source.payload };
    }
  }
  if (typeof legacyUrl === "string" && legacyUrl) return { type: "remote", url: legacyUrl };
  return { type: "embedded", payload: null };
}
function normalizeLicense(license) {
  if (!license || typeof license !== "object") {
    return { status: LICENSE_STATUS.unknown, name: "Unknown", url: "", attribution: "", commercialUse: false, redistrbutable: false, review: null };
  }
  const status = [LICENSE_STATUS.approved, LICENSE_STATUS.review, LICENSE_STATUS.unknown].includes(license.status) ? license.status : LICENSE_STATUS.unknown;
  return {
    status,
    name: typeof license.name === "string" ? license.name : "",
    url: typeof license.url === "string" ? license.url : "",
    attribution: typeof license.attribution === "string" ? license.attribution : "",
    commercialUse: license.commercialUse === true,
    redistrbutable: license.redistrbutable === true,
    territories: Array.isArray(license.territories) ? license.territories.slice() : [],
    expiresAt: license.expiresAt || null,
    proof: typeof license.proof === "string" ? license.proof : "",
    reviewer: typeof license.reviewer === "string" ? license.reviewer : null,
    reviewedAt: license.reviewedAt || null,
    // Review-decision audit trail (catalogPublish.stampLicenseReview):
    // { decision, by, at, note }. Survives normalization so the decision
    // travels with the published document.
    review: license.review && typeof license.review === "object" ? {
      decision: license.review.decision === "rejected" ? "rejected" : "approved",
      by: typeof license.review.by === "string" ? license.review.by : "",
      at: license.review.at || null,
      note: typeof license.review.note === "string" ? license.review.note.slice(0, 512) : ""
    } : null
  };
}
function canInstall(entry, { now = 0, entitlements = null } = {}) {
  const license = entry?.license;
  if (!license) return { allowed: false, reason: "license-missing" };
  if (license.status === LICENSE_STATUS.unknown) return { allowed: false, reason: "license-unknown" };
  if (license.status === LICENSE_STATUS.review) return { allowed: false, reason: "license-review" };
  if (license.expiresAt) {
    const exp = Date.parse(license.expiresAt);
    if (Number.isFinite(exp) && now && exp <= now) return { allowed: false, reason: "license-expired" };
  }
  if (Number(entry?.priceUsd || 0) > 0) {
    const grant = hasLiveEntitlement(entry?.id, entry?.version, entitlements, now);
    if (!grant) return { allowed: false, reason: "entitlement-missing" };
  }
  return { allowed: true, reason: null };
}
var ENTITLEMENT_SCHEMA_VERSION = 1;
function parseEntitlements(raw) {
  if (!raw || typeof raw !== "object") return [];
  const list = Array.isArray(raw.grants) ? raw.grants : Array.isArray(raw) ? raw : [];
  const out = [];
  for (const g of list) {
    if (!g || typeof g !== "object" || typeof g.entryId !== "string" || !g.entryId) continue;
    out.push({
      entryId: g.entryId,
      version: typeof g.version === "string" ? g.version : "",
      grantedAt: g.grantedAt || null,
      expiresAt: g.expiresAt || null,
      signature: typeof g.signature === "string" ? g.signature : ""
    });
  }
  return out;
}
function hasLiveEntitlement(entryId, version, entitlements, now = Date.now()) {
  if (!entryId) return false;
  const grants = Array.isArray(entitlements) ? entitlements : parseEntitlements(entitlements);
  const matches = grants.filter((g) => g.entryId === entryId && (g.version === "" || g.version === version));
  if (matches.length === 0) return false;
  const latest = matches.reduce((a, b) => String(a.grantedAt || "") >= String(b.grantedAt || "") ? a : b);
  if (latest.expiresAt) {
    const exp = Date.parse(latest.expiresAt);
    if (Number.isFinite(exp) && now && exp <= now) return false;
  }
  return true;
}
function createInstalledAsset(input = {}) {
  return {
    entryId: input.entryId || "",
    version: input.version || "1.0.0",
    state: INSTALL_STATES.installed,
    installedAt: input.installedAt || null,
    dir: input.dir || "",
    files: Array.isArray(input.files) ? input.files.slice() : [],
    sizeBytes: Number(input.sizeBytes) || 0,
    verified: input.verified === true
  };
}
function transitionInstall(record, state, extra = {}) {
  if (!record || !state) return record;
  const legal = {
    catalog: ["downloading", "error"],
    downloading: ["verifying", "error", "catalog"],
    verifying: ["installed", "error", "downloading"],
    error: ["downloading", "catalog"],
    installed: ["catalog"]
  };
  if (!legal[record.state]?.includes(state)) return record;
  record.state = state;
  Object.assign(record, extra);
  return record;
}
function recoverInstallStates(installed) {
  if (!Array.isArray(installed)) return [];
  const records = installed.filter((r) => r && typeof r === "object");
  for (const record of records) {
    if (record.state === INSTALL_STATES.downloading || record.state === INSTALL_STATES.verifying) {
      record.state = INSTALL_STATES.catalog;
    }
  }
  return records;
}
var queueSeq = 0;
function nextJobId() {
  queueSeq += 1;
  return `dljob_${Date.now().toString(36)}_${queueSeq.toString(36)}`;
}
function createDownloadQueue({ concurrency = 2, maxRetries = 3, baseDelayMs = 1e3, maxDelayMs = 3e4, entitlements = null } = {}) {
  const jobs = [];
  let activeCount = 0;
  const entitlementsOf = () => typeof entitlements === "function" ? entitlements() : entitlements;
  function snapshot() {
    return jobs.map((j) => ({ ...j, progress: { ...j.progress } }));
  }
  function enqueue(entry) {
    const { allowed, reason } = canInstall(entry, { entitlements: entitlementsOf() });
    const job = {
      id: nextJobId(),
      entryId: entry.id,
      version: entry.version,
      url: entry.sourceUrl,
      sha256: entry.sha256,
      sizeBytes: entry.sizeBytes,
      state: allowed ? DOWNLOAD_STATES.queued : DOWNLOAD_STATES.cancelled,
      progress: { loaded: 0, total: Number(entry.sizeBytes) || 0, percent: 0 },
      attempts: 0,
      maxRetries,
      delayMs: 0,
      reason: allowed ? null : reason && !reason.startsWith("license-") ? reason : `license-${String(reason).replace("license-", "")}`
    };
    jobs.push(job);
    return job;
  }
  function startNext() {
    if (activeCount >= concurrency) return null;
    const job = jobs.find((j) => j.state === DOWNLOAD_STATES.queued) || null;
    if (!job) return null;
    job.state = DOWNLOAD_STATES.active;
    job.attempts += 1;
    activeCount += 1;
    return job;
  }
  function reportProgress(jobId, loaded, total) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.state !== DOWNLOAD_STATES.active) return null;
    job.progress.loaded = Number(loaded) || 0;
    if (total) job.progress.total = Number(total);
    job.progress.percent = job.progress.total > 0 ? Math.min(100, Math.round(job.progress.loaded / job.progress.total * 100)) : 0;
    return job;
  }
  function reportResult(jobId, { ok, error = null, verified = false }) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.state !== DOWNLOAD_STATES.active && job.state !== DOWNLOAD_STATES.retrying) return null;
    activeCount = Math.max(0, activeCount - 1);
    if (ok && verified) {
      job.state = DOWNLOAD_STATES.done;
      job.reason = null;
      return job;
    }
    if (!ok) job.reason = error || "download-failed";
    if (job.attempts > job.maxRetries) {
      job.state = DOWNLOAD_STATES.failed;
      return job;
    }
    job.delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (job.attempts - 1));
    job.state = DOWNLOAD_STATES.retrying;
    return job;
  }
  function armRetry(jobId) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.state !== DOWNLOAD_STATES.retrying) return null;
    if (activeCount >= concurrency) return null;
    job.state = DOWNLOAD_STATES.active;
    job.attempts += 1;
    activeCount += 1;
    return job;
  }
  function cancel(jobId) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return null;
    if (job.state === DOWNLOAD_STATES.active) activeCount = Math.max(0, activeCount - 1);
    job.state = DOWNLOAD_STATES.cancelled;
    return job;
  }
  function pendingCount() {
    return jobs.filter((j) => [DOWNLOAD_STATES.queued, DOWNLOAD_STATES.active, DOWNLOAD_STATES.retrying].includes(j.state)).length;
  }
  return {
    enqueue,
    startNext,
    armRetry,
    reportProgress,
    reportResult,
    cancel,
    snapshot,
    pendingCount,
    get concurrency() {
      return concurrency;
    }
  };
}
function storageReport(installed, { usedProjectIds = [], quotaBytes = 0 } = {}) {
  const totalBytes = installed.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
  const usable = installed.filter((a) => a.state === INSTALL_STATES.installed && a.verified);
  const usableBytes = usable.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
  const orphanBytes = totalBytes - usableBytes;
  const reclaimable = usable.filter((a) => !usedProjectIds.includes(a.entryId));
  const reclaimableBytes = reclaimable.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
  const quotaPct = quotaBytes > 0 ? Math.min(100, Math.round(totalBytes / quotaBytes * 100)) : 0;
  return {
    totalBytes,
    usableBytes,
    orphanBytes,
    reclaimableBytes,
    reclaimableIds: reclaimable.map((a) => a.entryId),
    quotaBytes,
    quotaPct
  };
}

// src/marketplaceCatalog.mjs
var ROYALTY_FREE_LICENSE = normalizeLicense({
  status: "approved",
  name: "Royalty-Free (TM Tools)",
  url: "https://tmtools.dev/licenses/royalty-free",
  attribution: "Royalty-free via TM Tools",
  commercialUse: true,
  redistrbutable: true,
  territories: ["worldwide"],
  expiresAt: null,
  proof: "TM Tools Royalty-Free License \u2014 bundled with app",
  reviewer: "tmcut-publisher",
  reviewedAt: (/* @__PURE__ */ new Date()).toISOString(),
  review: { decision: "approved", by: "tmcut-publisher", at: (/* @__PURE__ */ new Date()).toISOString(), note: "Royalty-free for commercial use within TM Tools projects" }
});
function createMusicEntry(overrides = {}) {
  return createCatalogEntry({
    assetKind: "media",
    category: "music",
    tags: ["music", "background", "loop", "royalty-free", ...overrides.tags || []],
    version: "1.0.0",
    sizeBytes: overrides.sizeBytes || 2048e3,
    // ~2MB typical
    sha256: overrides.sha256 || "sample-placeholder",
    source: { type: "sample", sampleId: overrides.sampleId || `music-${overrides.id}` },
    sourceUrl: "",
    previewRef: overrides.previewRef || null,
    creator: overrides.creator || "TM Tools Music Library",
    priceUsd: 0,
    salesChannel: "bundled",
    license: ROYALTY_FREE_LICENSE,
    ...overrides
  });
}
function createSfxEntry(overrides = {}) {
  return createCatalogEntry({
    assetKind: "media",
    category: "sound-effects",
    tags: ["sfx", "sound-effect", "whoosh", "impact", "transition", "royalty-free", ...overrides.tags || []],
    version: "1.0.0",
    sizeBytes: overrides.sizeBytes || 256e3,
    // ~256KB typical
    sha256: overrides.sha256 || "sample-placeholder",
    source: { type: "sample", sampleId: overrides.sampleId || `sfx-${overrides.id}` },
    sourceUrl: "",
    previewRef: overrides.previewRef || null,
    creator: overrides.creator || "TM Tools SFX Library",
    priceUsd: 0,
    salesChannel: "bundled",
    license: ROYALTY_FREE_LICENSE,
    ...overrides
  });
}
function createFontEntry(overrides = {}) {
  return createCatalogEntry({
    assetKind: "media",
    category: "fonts",
    tags: ["font", "typography", "caption", "title", "royalty-free", ...overrides.tags || []],
    version: "1.0.0",
    sizeBytes: overrides.sizeBytes || 102400,
    // ~100KB typical
    sha256: overrides.sha256 || "sample-placeholder",
    source: { type: "sample", sampleId: overrides.sampleId || `font-${overrides.id}` },
    sourceUrl: "",
    previewRef: overrides.previewRef || null,
    creator: overrides.creator || "TM Tools Font Library",
    priceUsd: 0,
    salesChannel: "bundled",
    license: ROYALTY_FREE_LICENSE,
    ...overrides
  });
}
var STARTER_MUSIC_CATALOG = [
  createMusicEntry({
    id: "music-lofi-chill",
    title: "Lo-Fi Chill Loop",
    description: "Relaxed lo-fi hip hop beat, perfect for vlogs and study videos. Seamless loop.",
    tags: ["lofi", "chill", "hip-hop", "loop", "vlog"],
    sampleId: "music-lofi-chill",
    durationSec: 30
  }),
  createMusicEntry({
    id: "music-upbeat-pop",
    title: "Upbeat Pop Groove",
    description: "Energetic pop instrumental with catchy melody. Great for intros and promos.",
    tags: ["pop", "upbeat", "energetic", "promo", "intro"],
    sampleId: "music-upbeat-pop",
    durationSec: 45
  }),
  createMusicEntry({
    id: "music-cinematic-ambient",
    title: "Cinematic Ambient",
    description: "Atmospheric cinematic bed for documentaries and storytelling. Slow evolving pads.",
    tags: ["cinematic", "ambient", "documentary", "storytelling", "emotional"],
    sampleId: "music-cinematic-ambient",
    durationSec: 60
  }),
  createMusicEntry({
    id: "music-corporate-inspire",
    title: "Corporate Inspire",
    description: "Positive corporate track with piano and light percussion. Professional and uplifting.",
    tags: ["corporate", "inspire", "piano", "professional", "business"],
    sampleId: "music-corporate-inspire",
    durationSec: 40
  }),
  createMusicEntry({
    id: "music-trap-beat",
    title: "Trap Beat Loop",
    description: "Modern trap beat with 808s and hi-hats. Ideal for TikTok/Reels transitions.",
    tags: ["trap", "beat", "808", "short-form", "transition"],
    sampleId: "music-trap-beat",
    durationSec: 15
  }),
  createMusicEntry({
    id: "music-acoustic-folk",
    title: "Acoustic Folk",
    description: "Warm acoustic guitar melody. Intimate and authentic feel for personal videos.",
    tags: ["acoustic", "folk", "guitar", "intimate", "personal"],
    sampleId: "music-acoustic-folk",
    durationSec: 50
  })
];
var STARTER_SFX_CATALOG = [
  createSfxEntry({
    id: "sfx-whoosh-fast",
    title: "Fast Whoosh",
    description: "Quick whoosh for rapid transitions and scene changes.",
    tags: ["whoosh", "transition", "fast", "swish"],
    sampleId: "sfx-whoosh-fast",
    durationSec: 1
  }),
  createSfxEntry({
    id: "sfx-whoosh-slow",
    title: "Slow Whoosh",
    description: "Long sweeping whoosh for dramatic reveals and montages.",
    tags: ["whoosh", "transition", "slow", "sweep", "cinematic"],
    sampleId: "sfx-whoosh-slow",
    durationSec: 2
  }),
  createSfxEntry({
    id: "sfx-impact-punch",
    title: "Impact Punch",
    description: "Hard impact sound for text reveals, logos, and emphasis.",
    tags: ["impact", "punch", "hit", "reveal", "logo"],
    sampleId: "sfx-impact-punch",
    durationSec: 1
  }),
  createSfxEntry({
    id: "sfx-pop-bubble",
    title: "Pop Bubble",
    description: "Light pop for UI interactions, checkmarks, and playful moments.",
    tags: ["pop", "bubble", "ui", "playful", "notification"],
    sampleId: "sfx-pop-bubble",
    durationSec: 0.5
  }),
  createSfxEntry({
    id: "sfx-glitch-digital",
    title: "Digital Glitch",
    description: "Short digital glitch for tech videos, transitions, and effects.",
    tags: ["glitch", "digital", "tech", "error", "distortion"],
    sampleId: "sfx-glitch-digital",
    durationSec: 1
  }),
  createSfxEntry({
    id: "sfx-riser-sweep",
    title: "Riser Sweep",
    description: "Building riser for energy buildup before drops and reveals.",
    tags: ["riser", "sweep", "buildup", "energy", "drop"],
    sampleId: "sfx-riser-sweep",
    durationSec: 3
  }),
  createSfxEntry({
    id: "sfx-camera-shutter",
    title: "Camera Shutter",
    description: "Classic camera shutter click for photo transitions and snapshots.",
    tags: ["camera", "shutter", "photo", "click", "snapshot"],
    sampleId: "sfx-camera-shutter",
    durationSec: 0.3
  }),
  createSfxEntry({
    id: "sfx-typewriter",
    title: "Typewriter Keys",
    description: "Mechanical typewriter sounds for text animations and captions.",
    tags: ["typewriter", "keys", "text", "animation", "retro"],
    sampleId: "sfx-typewriter",
    durationSec: 2
  })
];
var STARTER_FONT_CATALOG = [
  createFontEntry({
    id: "font-inter",
    title: "Inter",
    description: "Clean, modern variable font optimized for UI and captions. Multiple weights.",
    tags: ["sans-serif", "variable", "ui", "caption", "modern", "clean"],
    sampleId: "font-inter",
    family: "Inter",
    weights: [300, 400, 500, 600, 700],
    variable: true
  }),
  createFontEntry({
    id: "font-montserrat",
    title: "Montserrat",
    description: "Geometric sans-serif with strong personality. Excellent for titles and headlines.",
    tags: ["sans-serif", "geometric", "title", "headline", "bold"],
    sampleId: "font-montserrat",
    family: "Montserrat",
    weights: [400, 500, 600, 700, 800, 900]
  }),
  createFontEntry({
    id: "font-poppins",
    title: "Poppins",
    description: "Geometric sans-serif with rounded corners. Friendly and readable at all sizes.",
    tags: ["sans-serif", "geometric", "rounded", "friendly", "readable"],
    sampleId: "font-poppins",
    family: "Poppins",
    weights: [300, 400, 500, 600, 700, 800, 900]
  }),
  createFontEntry({
    id: "font-roboto-mono",
    title: "Roboto Mono",
    description: "Monospace font for code, timestamps, and technical overlays.",
    tags: ["monospace", "code", "technical", "timestamp", "mono"],
    sampleId: "font-roboto-mono",
    family: "Roboto Mono",
    weights: [300, 400, 500, 600, 700]
  }),
  createFontEntry({
    id: "font-playfair-display",
    title: "Playfair Display",
    description: "Elegant serif with high contrast. Perfect for cinematic titles and quotes.",
    tags: ["serif", "elegant", "cinematic", "title", "quote", "high-contrast"],
    sampleId: "font-playfair-display",
    family: "Playfair Display",
    weights: [400, 500, 600, 700, 800, 900]
  }),
  createFontEntry({
    id: "font-jetbrains-mono",
    title: "JetBrains Mono",
    description: "Developer-focused monospace with ligatures. Great for coding tutorials.",
    tags: ["monospace", "code", "ligatures", "developer", "programming"],
    sampleId: "font-jetbrains-mono",
    family: "JetBrains Mono",
    weights: [300, 400, 500, 600, 700, 800]
  })
];
var STARTER_MARKETPLACE_CATALOG = [
  ...STARTER_MUSIC_CATALOG,
  ...STARTER_SFX_CATALOG,
  ...STARTER_FONT_CATALOG
];
function getMarketplaceByCategory(category) {
  return STARTER_MARKETPLACE_CATALOG.filter((entry) => entry.category === category);
}
function getMarketplaceMusic() {
  return getMarketplaceByCategory("music");
}
function getMarketplaceSfx() {
  return getMarketplaceByCategory("sound-effects");
}
function getMarketplaceFonts() {
  return getMarketplaceByCategory("fonts");
}
function getMarketplaceEntryById(id) {
  return STARTER_MARKETPLACE_CATALOG.find((entry) => entry.id === id);
}

// src/aiPlan.mjs
var AI_EDIT_PLAN_SCHEMA_VERSION = 1;
var EDIT_OPERATION_TYPES = [
  "set-canvas",
  "add-clip",
  "set-clip",
  "move-clip",
  "remove-clip",
  "set-effect",
  "set-transition",
  "set-speed",
  "set-volume"
];
var MAX_PLAN_OPERATIONS = 100;
var MAX_STRING_LEN = 512;
var TRACK_TYPES = ["video", "audio", "text"];
var TRACK_TYPES_WITH_MEDIA = ["video", "audio"];
function isPlainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function positiveFiniteNumber(v, name, errors, max = Number.MAX_SAFE_INTEGER) {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > max) {
    errors.push(`${name} must be a positive finite number`);
    return false;
  }
  return true;
}
function nonNegativeFiniteNumber(v, name, errors, max = Number.MAX_SAFE_INTEGER) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max) {
    errors.push(`${name} must be a non-negative finite number`);
    return false;
  }
  return true;
}
function cleanString(v, name, errors, { required = false, max = MAX_STRING_LEN } = {}) {
  if (typeof v !== "string" || required && v.trim() === "") {
    if (required) errors.push(`${name} is required`);
    return null;
  }
  if (v.length > max) {
    errors.push(`${name} exceeds ${max} characters`);
    return null;
  }
  return v;
}
function checkMediaRef(v, name, errors, required = true) {
  if (v === void 0 || v === null) {
    if (required) errors.push(`${name} is required`);
    return null;
  }
  const s = cleanString(v, name, errors, { required: true });
  if (!s) return null;
  if (!/^[\w.-]+$/.test(s)) {
    errors.push(`${name} may only contain letters, digits, ".", "_" and "-"`);
    return null;
  }
  return s;
}
function validateEditPlan(plan2, options = {}) {
  const errors = [];
  if (!isPlainObject(plan2)) return { valid: false, errors: ["plan must be an object"] };
  if (plan2.schemaVersion !== void 0 && plan2.schemaVersion !== AI_EDIT_PLAN_SCHEMA_VERSION) {
    errors.push(`unsupported plan schemaVersion ${plan2.schemaVersion} (expected ${AI_EDIT_PLAN_SCHEMA_VERSION})`);
  }
  cleanString(plan2.intentSummary, "intentSummary", errors, { max: 1e3 });
  if (plan2.assumptions !== void 0 && !Array.isArray(plan2.assumptions)) {
    errors.push("assumptions must be an array");
  }
  if (plan2.target !== void 0) {
    if (!isPlainObject(plan2.target)) {
      errors.push("target must be an object");
    } else {
      if (plan2.target.durationTicks !== void 0) positiveFiniteNumber(plan2.target.durationTicks, "target.durationTicks", errors);
    }
  }
  const ops = plan2.operations;
  if (!Array.isArray(ops) || ops.length === 0) {
    errors.push("operations must be a non-empty array");
    return { valid: false, errors };
  }
  if (ops.length > MAX_PLAN_OPERATIONS) {
    errors.push(`plan has ${ops.length} operations (max ${MAX_PLAN_OPERATIONS})`);
    return { valid: false, errors };
  }
  const timeline = options.timeline || null;
  const offeredMedia = options.mediaRefs ? new Set(Array.from(options.mediaRefs)) : null;
  ops.forEach((op, i) => {
    const where = `op[${i}]`;
    if (!isPlainObject(op)) {
      errors.push(`${where} must be an object`);
      return;
    }
    const type = op.type;
    if (!EDIT_OPERATION_TYPES.includes(type)) {
      errors.push(`${where} has unknown type: ${type}`);
      return;
    }
    switch (type) {
      case "set-canvas": {
        positiveFiniteNumber(op.width, `${where}.width`, errors, 32768);
        positiveFiniteNumber(op.height, `${where}.height`, errors, 32768);
        positiveFiniteNumber(op.fps, `${where}.fps`, errors, 240);
        break;
      }
      case "add-clip": {
        if (!TRACK_TYPES.includes(op.trackType)) errors.push(`${where}.trackType must be one of ${TRACK_TYPES.join(", ")}`);
        cleanString(op.name, `${where}.name`, errors);
        if (typeof op.text !== "string" && op.text !== void 0) errors.push(`${where}.text must be a string`);
        if (op.effects !== void 0) {
          if (!Array.isArray(op.effects)) {
            errors.push(`${where}.effects must be an array`);
          } else {
            op.effects.forEach((fx, j) => {
              errors.push(...validateEffect(fx).map((e) => `${where}.effects[${j}]: ${e}`));
            });
          }
        }
        if (op.trackType === "text") {
          if (op.mediaRef !== void 0) checkMediaRef(op.mediaRef, `${where}.mediaRef`, errors);
        } else if (TRACK_TYPES_WITH_MEDIA.includes(op.trackType)) {
          const ref = checkMediaRef(op.mediaRef, `${where}.mediaRef`, errors, true);
          if (ref && offeredMedia && !offeredMedia.has(ref)) {
            errors.push(`${where}.mediaRef "${ref}" is not among the offered media refs`);
          }
        }
        if (op.in !== void 0) nonNegativeFiniteNumber(op.in, `${where}.in`, errors, 10 * 3600 * TICKS_PER_SECOND);
        if (op.out !== void 0) nonNegativeFiniteNumber(op.out, `${where}.out`, errors, 10 * 3600 * TICKS_PER_SECOND);
        if (op.offset !== void 0) nonNegativeFiniteNumber(op.offset, `${where}.offset`, errors, 10 * 3600 * TICKS_PER_SECOND);
        if (op.volume !== void 0 && (typeof op.volume !== "number" || !Number.isFinite(op.volume) || op.volume < 0 || op.volume > 400)) {
          errors.push(`${where}.volume must be a number in [0, 400]`);
        }
        if (op.fade !== void 0) {
          if (!isPlainObject(op.fade)) {
            errors.push(`${where}.fade must be an object with optional in/out ticks`);
          } else {
            if (op.fade.in !== void 0) nonNegativeFiniteNumber(op.fade.in, `${where}.fade.in`, errors, TICKS_PER_SECOND * 60);
            if (op.fade.out !== void 0) nonNegativeFiniteNumber(op.fade.out, `${where}.fade.out`, errors, TICKS_PER_SECOND * 60);
          }
        }
        if (op.fontSize !== void 0) positiveFiniteNumber(op.fontSize, `${where}.fontSize`, errors, 1024);
        if (op.color !== void 0 && (typeof op.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(op.color))) {
          errors.push(`${where}.color must be a #rrggbb string`);
        }
        break;
      }
      case "set-clip": {
        if (timeline) requireClipId(op, where, errors, timeline);
        if (typeof op.text !== "string" && op.text !== void 0) errors.push(`${where}.text must be a string`);
        if (op.color !== void 0 && (typeof op.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(op.color))) {
          errors.push(`${where}.color must be a #rrggbb string`);
        }
        if (op.fontSize !== void 0) positiveFiniteNumber(op.fontSize, `${where}.fontSize`, errors, 1024);
        break;
      }
      case "move-clip": {
        if (timeline) requireClipId(op, where, errors, timeline);
        if (typeof op.startTicks !== "number" || !Number.isFinite(op.startTicks) || op.startTicks < 0) {
          errors.push(`${where}.startTicks must be a non-negative number`);
        }
        break;
      }
      case "remove-clip": {
        if (timeline) requireClipId(op, where, errors, timeline);
        break;
      }
      case "set-effect": {
        if (timeline) requireClipId(op, where, errors, timeline);
        if (!Array.isArray(op.effects)) {
          errors.push(`${where}.effects must be an array`);
        } else {
          op.effects.forEach((fx, j) => {
            errors.push(...validateEffect(fx).map((e) => `${where}.effects[${j}]: ${e}`));
          });
        }
        break;
      }
      case "set-transition": {
        if (timeline) requireClipId(op, where, errors, timeline);
        if (!KNOWN_TRANSITIONS.includes(op.transition)) {
          errors.push(`${where}.transition must be one of ${KNOWN_TRANSITIONS.join(", ")}`);
        }
        if (typeof op.durationTicks !== "number" || !Number.isFinite(op.durationTicks) || op.durationTicks <= 0) {
          errors.push(`${where}.durationTicks must be a positive number`);
        }
        break;
      }
      case "set-speed": {
        if (timeline) requireClipId(op, where, errors, timeline);
        if (typeof op.speed !== "number" || !Number.isFinite(op.speed) || op.speed < 0.01 || op.speed > 100) {
          errors.push(`${where}.speed must be a finite number in [0.01, 100]`);
        }
        break;
      }
      case "set-volume": {
        if (timeline) requireClipId(op, where, errors, timeline);
        if (typeof op.volume !== "number" || !Number.isFinite(op.volume) || op.volume < 0 || op.volume > 400) {
          errors.push(`${where}.volume must be a number in [0, 400]`);
        }
        break;
      }
    }
  });
  return { valid: errors.length === 0, errors };
}
function requireClipId(op, where, errors, timeline) {
  const clipId = cleanString(op.clipId, `${where}.clipId`, errors, { required: true });
  if (clipId && !findClip(timeline, clipId)) {
    errors.push(`${where}.clipId "${clipId}" does not exist in the target timeline`);
  }
}
function applyEditPlan(timeline, plan2, options = {}) {
  const trace = { applied: [], skipped: [], warnings: [] };
  const resolution = options.mediaResolution || {};
  const canvas = options.canvas || null;
  for (const [i, op] of (plan2.operations || []).entries()) {
    const step = { index: i, type: op.type, ok: true, reason: null };
    try {
      switch (op.type) {
        case "set-canvas": {
          if (!canvas) {
            step.ok = false;
            step.reason = "no-canvas-target";
            break;
          }
          canvas.width = Math.round(op.width);
          canvas.height = Math.round(op.height);
          canvas.fps = op.fps;
          break;
        }
        case "add-clip": {
          if (op.trackType === "text") {
            const clip2 = addClip(timeline, "text", {
              name: op.name || "Text",
              text: op.text ?? op.name ?? "",
              in: op.in ?? 0,
              out: op.out ?? 4 * TICKS_PER_SECOND,
              offset: op.offset,
              fontSize: op.fontSize,
              color: op.color,
              effects: op.effects ? normalizeEffects(op.effects) : void 0
            });
            if (!clip2) {
              step.ok = false;
              step.reason = "track-locked";
            }
            break;
          }
          const resolved = op.mediaRef ? resolution[op.mediaRef] : void 0;
          if (!resolved || typeof resolved.src !== "string") {
            step.ok = false;
            step.reason = "media-ref-missing";
            break;
          }
          const clip = addClip(timeline, op.trackType, {
            name: op.name || resolved.name || op.mediaRef,
            src: resolved.src,
            in: op.in ?? 0,
            out: op.out ?? 5 * TICKS_PER_SECOND,
            offset: op.offset,
            // Phase 8: music beds / SFX carry loudness + fades on the op;
            // validateEditPlan already range-checked both.
            volume: op.volume,
            fade: op.fade,
            effects: op.effects ? normalizeEffects(op.effects) : void 0
          });
          if (!clip) {
            step.ok = false;
            step.reason = "track-locked";
          }
          break;
        }
        case "set-clip": {
          const found = findClip(timeline, op.clipId);
          if (!found) {
            step.ok = false;
            step.reason = "clip-missing";
            break;
          }
          if (found.track.locked) {
            step.ok = false;
            step.reason = "track-locked";
            break;
          }
          if (op.name !== void 0) found.clip.name = op.name;
          if (op.text !== void 0) found.clip.text = op.text;
          if (op.color !== void 0) found.clip.color = op.color;
          if (op.fontSize !== void 0) found.clip.fontSize = op.fontSize;
          break;
        }
        case "move-clip": {
          const found = findClip(timeline, op.clipId);
          if (!found) {
            step.ok = false;
            step.reason = "clip-missing";
            break;
          }
          if (found.track.locked) {
            step.ok = false;
            step.reason = "track-locked";
            break;
          }
          found.clip.timeline.start = Math.max(0, Math.round(op.startTicks));
          break;
        }
        case "remove-clip": {
          if (!removeClip(timeline, op.clipId)) {
            step.ok = false;
            step.reason = "clip-missing-or-locked";
          }
          break;
        }
        case "set-effect": {
          const found = findClip(timeline, op.clipId);
          if (!found) {
            step.ok = false;
            step.reason = "clip-missing";
            break;
          }
          if (found.track.locked) {
            step.ok = false;
            step.reason = "track-locked";
            break;
          }
          found.clip.effects = normalizeEffects(op.effects);
          break;
        }
        case "set-transition": {
          const gate = canApplyTransition(timeline, op.clipId, op.transition, op.durationTicks);
          if (!gate.ok) {
            step.ok = false;
            step.reason = gate.reason || "cannot-apply";
            break;
          }
          const ok = applyTransition(timeline, op.clipId, op.transition, op.durationTicks);
          if (!ok) {
            step.ok = false;
            step.reason = "apply-failed";
          }
          break;
        }
        case "set-speed": {
          const found = findClip(timeline, op.clipId);
          if (!found) {
            step.ok = false;
            step.reason = "clip-missing";
            break;
          }
          if (found.track.locked) {
            step.ok = false;
            step.reason = "track-locked";
            break;
          }
          found.clip.speed = op.speed;
          break;
        }
        case "set-volume": {
          const found = findClip(timeline, op.clipId);
          if (!found) {
            step.ok = false;
            step.reason = "clip-missing";
            break;
          }
          if (found.track.locked) {
            step.ok = false;
            step.reason = "track-locked";
            break;
          }
          found.clip.volume = op.volume;
          break;
        }
        default:
          step.ok = false;
          step.reason = "unknown-op";
      }
    } catch (err) {
      step.ok = false;
      step.reason = "exception";
      trace.warnings.push(`op[${i}] ${op.type}: ${err?.message || "exception"}`);
    }
    if (step.ok) trace.applied.push(step);
    else trace.skipped.push(step);
  }
  const timelineErrors = validateTimeline(timeline);
  if (Array.isArray(timelineErrors) && timelineErrors.length > 0) {
    trace.warnings.push(`post-apply timeline validation: ${timelineErrors.join("; ")}`);
  }
  return trace;
}
function extractJsonObject(text) {
  if (typeof text !== "string" || text.trim() === "") return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const sources = [fence?.[1], text.trim()];
  const firstBrace = text.indexOf("{");
  if (firstBrace !== -1) {
    const lastBrace = text.lastIndexOf("}");
    if (lastBrace > firstBrace) sources.push(text.slice(firstBrace, lastBrace + 1));
  }
  for (const src of sources) {
    if (!src || typeof src !== "string") continue;
    try {
      const parsed = JSON.parse(src);
      if (isPlainObject(parsed)) return parsed;
    } catch {
    }
  }
  return null;
}
function parseEditPlanReply(text, options = {}) {
  if (typeof text !== "string" || text.trim() === "") {
    return { ok: false, errors: ["empty reply"] };
  }
  const candidate = extractJsonObject(text);
  if (!candidate) return { ok: false, errors: ["no JSON object found in reply"] };
  const check = validateEditPlan(candidate, options);
  if (!check.valid) return { ok: false, errors: check.errors };
  return { ok: true, plan: candidate };
}
function summarizeEditPlan(plan2, labels = {}) {
  const lines = [];
  for (const op of plan2?.operations || []) {
    switch (op.type) {
      case "set-canvas": {
        lines.push(`canvas ${op.width}x${op.height} @${op.fps}fps`);
        break;
      }
      case "add-clip": {
        lines.push(`add ${op.trackType} "${op.name || op.mediaRef || ""}"`);
        break;
      }
      case "set-clip": {
        lines.push(`edit clip ${labels[op.clipId] || op.clipId}`);
        break;
      }
      case "move-clip": {
        const to = (op.startTicks / TICKS_PER_SECOND).toFixed(2);
        lines.push(`move clip ${labels[op.clipId] || op.clipId} to ${to}s`);
        break;
      }
      case "remove-clip": {
        lines.push(`remove clip ${labels[op.clipId] || op.clipId}`);
        break;
      }
      case "set-effect": {
        const names = (op.effects || []).map((f) => f.type).join(", ") || "(clear)";
        lines.push(`effects -> ${names}`);
        break;
      }
      case "set-transition": {
        const sec = (op.durationTicks / TICKS_PER_SECOND).toFixed(2);
        lines.push(`transition ${op.transition} ${sec}s`);
        break;
      }
      case "set-speed": {
        lines.push(`speed x${op.speed}`);
        break;
      }
      case "set-volume": {
        lines.push(`volume ${op.volume}%`);
        break;
      }
      default:
        lines.push(op.type);
    }
  }
  return lines;
}

// src/templatePlan.mjs
var TEMPLATE_PLAN_SCHEMA_VERSION = 1;
var MAX_PLAN_OPERATIONS2 = 100;
var TEMPLATE_CATEGORIES = ["intro", "promo", "outro", "split-screen", "minimal", "custom"];
var ASPECT_RATIOS = ["16:9", "9:16", "1:1"];
function isPlain(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function validateTemplatePlan(plan2, options = {}) {
  const errors = [];
  if (!isPlain(plan2)) return { valid: false, errors: ["plan must be an object"] };
  if (plan2.schemaVersion !== void 0 && plan2.schemaVersion !== TEMPLATE_PLAN_SCHEMA_VERSION) {
    errors.push(`unsupported template plan schemaVersion ${plan2.schemaVersion} (expected ${TEMPLATE_PLAN_SCHEMA_VERSION})`);
  }
  const tpl = plan2.template;
  if (!isPlain(tpl)) {
    errors.push("template must be an object");
  } else {
    if (typeof tpl.name !== "string" || tpl.name.trim() === "" || tpl.name.length > 200) {
      errors.push("template.name is required (max 200 characters)");
    }
    if (tpl.description !== void 0 && (typeof tpl.description !== "string" || tpl.description.length > 1e3)) {
      errors.push("template.description must be a string of at most 1000 characters");
    }
    if (tpl.category !== void 0 && !TEMPLATE_CATEGORIES.includes(tpl.category)) {
      errors.push(`template.category must be one of ${TEMPLATE_CATEGORIES.join(", ")}`);
    }
    if (tpl.aspectRatio !== void 0 && !ASPECT_RATIOS.includes(tpl.aspectRatio)) {
      errors.push(`template.aspectRatio must be one of ${ASPECT_RATIOS.join(", ")}`);
    }
    for (const [key, max] of [["width", 32768], ["height", 32768], ["fps", 240]]) {
      const value = tpl[key];
      if (value !== void 0 && (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > max)) {
        errors.push(`template.${key} must be a positive number (max ${max})`);
      }
    }
    if (tpl.width && tpl.height && tpl.aspectRatio) {
      const parity = (tpl.width / tpl.height).toFixed(3);
      const [aw, ah] = tpl.aspectRatio.split(":").map(Number);
      if (Math.abs(Number(parity) - aw / ah) > 0.02) {
        errors.push(`template.aspectRatio ${tpl.aspectRatio} contradicts canvas ${tpl.width}x${tpl.height}`);
      }
    }
  }
  const ops = plan2.operations;
  if (!Array.isArray(ops) || ops.length === 0) {
    errors.push("operations must be a non-empty array");
    return { valid: false, errors };
  }
  if (ops.length > MAX_PLAN_OPERATIONS2) {
    errors.push(`plan has ${ops.length} operations (max ${MAX_PLAN_OPERATIONS2})`);
    return { valid: false, errors };
  }
  const offeredMedia = options.mediaRefs ? new Set(Array.from(options.mediaRefs)) : null;
  ops.forEach((op, i) => {
    const where = `op[${i}]`;
    if (!isPlain(op)) {
      errors.push(`${where} must be an object`);
      return;
    }
    if (op.type !== "add-clip") {
      errors.push(`${where}.type must be "add-clip" (template plans only add)`);
      return;
    }
    if (!["video", "audio", "text"].includes(op.trackType)) {
      errors.push(`${where}.trackType must be one of video, audio, text`);
    }
    if (op.name !== void 0 && (typeof op.name !== "string" || op.name.length > 120)) {
      errors.push(`${where}.name must be a string of at most 120 characters`);
    }
    if (op.text !== void 0 && (typeof op.text !== "string" || op.text.length > 512)) {
      errors.push(`${where}.text must be a string of at most 512 characters`);
    }
    if (op.effects !== void 0 && !Array.isArray(op.effects)) {
      errors.push(`${where}.effects must be an array`);
    }
    const colorOk = op.color === void 0 || typeof op.color === "string" && /^#[0-9a-fA-F]{6}$/.test(op.color);
    if (!colorOk) errors.push(`${where}.color must be a #rrggbb string`);
    if (op.fontSize !== void 0 && (typeof op.fontSize !== "number" || !Number.isFinite(op.fontSize) || op.fontSize <= 0 || op.fontSize > 1024)) {
      errors.push(`${where}.fontSize must be a number in (0, 1024]`);
    }
    for (const key of ["in", "out", "offset"]) {
      if (op[key] !== void 0 && (typeof op[key] !== "number" || !Number.isFinite(op[key]) || op[key] < 0)) {
        errors.push(`${where}.${key} must be a non-negative finite number (ticks)`);
      }
    }
    if (op.mediaRef !== void 0) {
      if (typeof op.mediaRef !== "string" || !/^[\w.-]+$/.test(op.mediaRef)) {
        errors.push(`${where}.mediaRef may only contain letters, digits, ".", "_" and "-"`);
      } else if (offeredMedia && !offeredMedia.has(op.mediaRef)) {
        errors.push(`${where}.mediaRef "${op.mediaRef}" is not among the offered media refs`);
      }
    }
  });
  return { valid: errors.length === 0, errors };
}
function buildTemplateFromPlan(plan2, options = {}) {
  const warnings = [];
  const resolution = options.mediaResolution || {};
  const timeline = { version: 3, tracks: [], markers: [] };
  (plan2.operations || []).forEach((op, i) => {
    if (op.trackType === "text") {
      addClip(timeline, "text", {
        name: op.name || op.text || "Text",
        text: op.text ?? op.name ?? "",
        in: op.in ?? 0,
        out: op.out ?? 4 * TICKS_PER_SECOND,
        offset: op.offset,
        fontSize: op.fontSize,
        color: op.color,
        effects: Array.isArray(op.effects) ? op.effects : void 0
      });
      return;
    }
    const resolved = op.mediaRef ? resolution[op.mediaRef] : void 0;
    const range = {
      in: op.in ?? 0,
      out: op.out ?? 5 * TICKS_PER_SECOND,
      offset: op.offset
    };
    if (resolved && typeof resolved.src === "string") {
      addClip(timeline, op.trackType, {
        name: op.name || resolved.name || op.mediaRef,
        src: resolved.src,
        ...range
      });
      return;
    }
    addClip(timeline, op.trackType, {
      name: op.name || `${op.trackType} placeholder`,
      ...range
    });
    warnings.push(`op[${i}]: ${op.mediaRef ? `mediaRef "${op.mediaRef}" unresolved` : "no mediaRef"} \u2014 placeholder slot kept`);
  });
  const flatTracks = timeline.tracks.map((track, index) => ({
    id: track.id || `tr-${track.type}-${index + 1}`,
    type: track.type,
    name: track.name || track.type,
    items: (track.items || []).map((clip) => v3ClipToTicks(clip))
  }));
  const tpl = plan2.template || {};
  const canvas = {
    width: tpl.width || 1920,
    height: tpl.height || 1080,
    fps: tpl.fps || 30
  };
  const aspectRatio = tpl.aspectRatio || (canvas.width === canvas.height ? "1:1" : canvas.width > canvas.height ? "16:9" : "9:16");
  const template = createTemplateFromTimeline({ tracks: flatTracks, markers: [] }, {
    name: tpl.name,
    description: tpl.description || "",
    category: tpl.category || "custom",
    aspectRatio,
    canvas,
    // §6.5 provenance: AI-generated material must be labelled; provider/
    // model passed through for display only — never secrets, never prompts.
    generatedBy: {
      tool: "ai",
      provider: options.provider || null,
      model: options.model || null,
      at: Date.now()
    }
  });
  return { template, warnings };
}
function parseTemplatePlanReply(text, options = {}) {
  if (typeof text !== "string" || text.trim() === "") {
    return { ok: false, errors: ["empty reply"] };
  }
  const candidate = extractJsonObject(text);
  if (!candidate) return { ok: false, errors: ["no JSON object found in reply"] };
  const check = validateTemplatePlan(candidate, options);
  if (!check.valid) return { ok: false, errors: check.errors };
  return { ok: true, plan: candidate };
}
function summarizeTemplatePlan(plan2) {
  const lines = [];
  const tpl = plan2?.template || {};
  lines.push(`template "${tpl.name || ""}" ${tpl.aspectRatio || ""} ${tpl.width || ""}x${tpl.height || ""}`.trim());
  for (const op of plan2?.operations || []) {
    if (op.trackType === "text") {
      lines.push(`text "${(op.text || op.name || "").slice(0, 40)}" @ ${((op.offset || 0) / TICKS_PER_SECOND).toFixed(1)}s`);
    } else {
      lines.push(`${op.trackType} ${op.mediaRef ? `ref ${op.mediaRef}` : "(placeholder)"} ${((op.offset || 0) / TICKS_PER_SECOND).toFixed(1)}s + ${(((op.out || 0) - (op.in || 0)) / TICKS_PER_SECOND).toFixed(1)}s`);
    }
  }
  return lines;
}

// src/autocutPlan.mjs
var MAX_CAPTION_CHARS = 120;
var MIN_CAPTION_TICKS = Math.round(0.4 * TICKS_PER_SECOND);
function secToTicksLocal(sec) {
  return Math.max(0, Math.round(sec * TICKS_PER_SECOND));
}
function clampText(text) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > MAX_CAPTION_CHARS ? `${clean.slice(0, MAX_CAPTION_CHARS - 1)}\u2026` : clean;
}
function editPlanFromEdl(edl, segments, options = {}) {
  const warnings = [];
  const mediaRef = typeof options.mediaRef === "string" ? options.mediaRef : "";
  const operations = [];
  const clips = segmentsToClips(edl, Array.isArray(segments) && segments.length > 0 ? segments : edl?.segments);
  for (const clip of clips) {
    operations.push({
      type: "add-clip",
      trackType: "video",
      name: options.name || "AutoCut segment",
      mediaRef,
      in: Math.round(clip.in ?? 0),
      out: Math.round(clip.out ?? 0),
      offset: Math.round(clip.offset ?? 0)
    });
  }
  if (Array.isArray(options.captions) && options.captions.length > 0) {
    const spans = clips.map((clip) => ({
      srcStart: (clip.in ?? 0) / TICKS_PER_SECOND,
      srcEnd: (clip.out ?? 0) / TICKS_PER_SECOND,
      tlStart: (clip.offset ?? 0) / TICKS_PER_SECOND
    }));
    let added = 0;
    for (const line of options.captions) {
      const start = Number(line?.start);
      const end = Number(line?.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      const text = clampText(line.text);
      if (!text) continue;
      const span = spans.find((s) => end > s.srcStart && start < s.srcEnd);
      if (!span) {
        warnings.push(`caption at ${start.toFixed(1)}s dropped (in a removed span)`);
        continue;
      }
      const tlStart = span.tlStart + (Math.max(start, span.srcStart) - span.srcStart);
      const tlEnd = span.tlStart + (Math.min(end, span.srcEnd) - span.srcStart);
      const offsetTicks = secToTicksLocal(tlStart);
      const outTicks = offsetTicks + Math.max(MIN_CAPTION_TICKS, secToTicksLocal(tlEnd - tlStart));
      operations.push({
        type: "add-clip",
        trackType: "text",
        name: "Caption",
        text,
        offset: offsetTicks,
        out: outTicks,
        fontSize: 32,
        color: "#ffffff"
      });
      added += 1;
    }
    warnings.push(`${added} caption clip(s) from ${options.captions.length} transcript line(s)`);
  }
  const plan2 = {
    schemaVersion: 1,
    intentSummary: options.intentSummary || `AutoCut: ${edl?.profile || "custom"} \u2014 ${clips.length} segment(s) kept`,
    assumptions: [
      "Deterministic pipeline output (scenes/silence/transcript analysis), not a language model."
    ],
    operations
  };
  return { plan: plan2, warnings };
}

// src/audioOrchestration.mjs
var USABLE_LICENSE_STATUSES = ["approved", "review"];
function rankAudioCandidates(candidates = [], { allowGenerated = false } = {}) {
  const TIER = {
    "license-approved": 0,
    "license-review": 1
  };
  const ORIGIN = { "library": 0, "asset-center": 1, "generated": 2 };
  return candidates.filter((c) => c && typeof c.mediaRef === "string" && c.mediaRef !== "").filter((c) => USABLE_LICENSE_STATUSES.includes(c.licenseStatus || "unknown")).filter((c) => allowGenerated || c.origin !== "generated").slice().sort((a, b) => {
    const tier = (TIER[`license-${a.licenseStatus}`] ?? 9) - (TIER[`license-${b.licenseStatus}`] ?? 9);
    if (tier !== 0) return tier;
    const origin = (ORIGIN[a.origin] ?? 9) - (ORIGIN[b.origin] ?? 9);
    if (origin !== 0) return origin;
    return (b.addedAt || 0) - (a.addedAt || 0);
  });
}
function clampFade(ticks, maxTicks) {
  const t = Math.max(0, Math.round(Number(ticks) || 0));
  return Math.min(t, Math.round(maxTicks));
}
function planMusicBed(candidates, context, options = {}) {
  const operations = [];
  const provenance = [];
  const ranked = rankAudioCandidates(candidates, options);
  const pick = ranked[0];
  const durationTicks2 = Math.max(0, Math.round(Number(context?.durationTicks) || 0));
  if (!pick || durationTicks2 <= 0) return { operations, provenance };
  const bedVolume = context?.dialoguePresent === false || options.dialoguePresent === false ? 90 : options.bedVolume ?? 35;
  const fadeInTicks = clampFade(options.fadeInTicks ?? 0.75 * TICKS_PER_SECOND, durationTicks2);
  const trackTicks = Math.max(TICKS_PER_SECOND, Math.round(Number(pick.durationTicks) || durationTicks2));
  let cursor = 0;
  let part = 0;
  while (cursor < durationTicks2 && part < 200) {
    const remaining = durationTicks2 - cursor;
    const clipTicks = Math.min(trackTicks, remaining);
    const isFirst = part === 0;
    const isLast = cursor + clipTicks >= durationTicks2;
    const fade = {
      in: isFirst ? fadeInTicks : 0,
      out: isLast ? clampFade(options.fadeOutTicks ?? 1.5 * TICKS_PER_SECOND, clipTicks) : 0
    };
    operations.push({
      type: "add-clip",
      trackType: "audio",
      name: `${pick.name || "Music bed"}${part > 0 ? ` (part ${part + 1})` : ""}`,
      mediaRef: pick.mediaRef,
      in: 0,
      out: clipTicks,
      offset: cursor,
      volume: bedVolume,
      fade
    });
    provenance.push({
      mediaRef: pick.mediaRef,
      role: "music-bed",
      part,
      timeline: { startTicks: cursor, durationTicks: clipTicks },
      source: pick.source || null,
      origin: pick.origin || null,
      license: { status: pick.licenseStatus || "unknown", name: pick.licenseName || "", attribution: pick.attribution || "" }
    });
    cursor += clipTicks;
    part += 1;
  }
  return { operations, provenance };
}
function planSfxCues(candidates, cues, context, options = {}) {
  const operations = [];
  const provenance = [];
  const skipped = [];
  const ranked = rankAudioCandidates(candidates, options);
  const pick = ranked[0];
  const durationTicks2 = Math.max(0, Math.round(Number(context?.durationTicks) || 0));
  if (!pick || !Array.isArray(cues) || cues.length === 0) return { operations, provenance, skipped };
  const minGapTicks = Math.max(0, Math.round(Number(options.minGapTicks) || 0.5 * TICKS_PER_SECOND));
  const sfxTicks = Math.max(1, Math.round(Number(pick.durationTicks) || 0.6 * TICKS_PER_SECOND));
  const sorted = cues.map((cue) => ({ atTicks: Math.max(0, Math.round(Number(cue?.atTicks) || 0)), name: String(cue?.name || "Transition") })).sort((a, b) => a.atTicks - b.atTicks);
  let lastEnd = -Infinity;
  for (const cue of sorted) {
    if (cue.atTicks + sfxTicks > durationTicks2 + TICKS_PER_SECOND) {
      skipped.push({ ...cue, reason: "past-timeline-end" });
      continue;
    }
    if (cue.atTicks < lastEnd + minGapTicks) {
      skipped.push({ ...cue, reason: "too-close" });
      continue;
    }
    operations.push({
      type: "add-clip",
      trackType: "audio",
      name: `SFX: ${cue.name}`,
      mediaRef: pick.mediaRef,
      in: 0,
      out: sfxTicks,
      offset: cue.atTicks,
      volume: options.cueVolume ?? 80,
      fade: { in: TICKS_PER_SECOND / 4, out: TICKS_PER_SECOND / 4 }
    });
    provenance.push({
      mediaRef: pick.mediaRef,
      role: "sfx-cue",
      cueName: cue.name,
      timeline: { startTicks: cue.atTicks, durationTicks: sfxTicks },
      source: pick.source || null,
      origin: pick.origin || null,
      license: { status: pick.licenseStatus || "unknown", name: pick.licenseName || "", attribution: pick.attribution || "" }
    });
    lastEnd = cue.atTicks + sfxTicks;
  }
  return { operations, provenance, skipped };
}
function mergeAudioProvenance(existing, additions) {
  const stamp = Date.now();
  const out = Array.isArray(existing) ? existing.slice() : [];
  for (const rec of additions || []) {
    out.push({ ...rec, addedAt: stamp, via: "audio-orchestration" });
  }
  return out;
}

// src/takedown.mjs
var TAKEDOWN_SCHEMA_VERSION = 1;
var REASONS = ["license-revoked", "rights-claim", "policy-violation", "recall"];
function cleanString2(value, max = 256) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function normalizeTakedownNotice(input) {
  if (!input || typeof input !== "object") return null;
  const entryId = cleanString2(input.entryId, 128);
  if (!entryId) return null;
  const rawIssued = input.issuedAt;
  const rawEffective = input.effectiveFrom;
  const issuedAt = (typeof rawIssued === "number" ? rawIssued : Date.parse(rawIssued || "")) || Date.now();
  const effectiveFrom = (typeof rawEffective === "number" ? rawEffective : Date.parse(rawEffective || "")) || issuedAt;
  return {
    entryId,
    // Unknown reasons are kept (a notice the app does not recognize must
    // still block; inventing 'policy-violation' would misreport the cause).
    reason: REASONS.includes(input.reason) ? input.reason : "policy-violation",
    ref: cleanString2(input.ref, 512),
    issuedAt,
    effectiveFrom
  };
}
function parseTakedownRegistry(raw) {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.notices)) {
    return { schemaVersion: TAKEDOWN_SCHEMA_VERSION, notices: [] };
  }
  const seen = /* @__PURE__ */ new Set();
  const notices = [];
  for (const item of parsed.notices) {
    const notice = normalizeTakedownNotice(item);
    if (!notice || seen.has(notice.entryId)) continue;
    seen.add(notice.entryId);
    notices.push(notice);
  }
  return { schemaVersion: TAKEDOWN_SCHEMA_VERSION, notices };
}
function mergeTakedownRegistry(registry, incoming) {
  const base = parseTakedownRegistry(registry);
  const extras = parseTakedownRegistry(incoming);
  const byEntry = new Map(base.notices.map((n) => [n.entryId, n]));
  for (const notice of extras.notices) byEntry.set(notice.entryId, notice);
  return { schemaVersion: TAKEDOWN_SCHEMA_VERSION, notices: [...byEntry.values()] };
}
function findActiveTakedown(registry, entryId, now = Date.now()) {
  const parsed = parseTakedownRegistry(registry);
  const notice = parsed.notices.find((n) => n.entryId === entryId);
  if (!notice) return null;
  return notice.effectiveFrom <= now ? notice : null;
}
function canServeAfterTakedown(registry, entryId, { now = Date.now() } = {}) {
  const notice = findActiveTakedown(registry, entryId, now);
  if (notice) return { allowed: false, reason: `takedown-${notice.reason}`, notice };
  return { allowed: true, reason: null, notice: null };
}
function takedownAudit(installed, registry, { now = Date.now() } = {}) {
  const affected = [];
  const records = Array.isArray(installed) ? installed : [];
  for (const record of records) {
    const entryId = record?.entryId;
    if (!entryId) continue;
    const notice = findActiveTakedown(registry, entryId, now);
    if (notice) affected.push({ entryId, state: record.state || "unknown", notice });
  }
  return affected;
}

// src/catalogPublish.mjs
var CATALOG_PUBLISH_SCHEMA_VERSION = 1;
var CATEGORIES = ["filters", "music", "sound-effects", "titles", "fonts", "effects", "transitions", "other"];
function isHttpUrl(url) {
  return typeof url === "string" && url.startsWith("https://");
}
function validateCatalogEntry(entry) {
  const errors = [];
  const id = typeof entry?.id === "string" ? entry.id.trim() : "";
  if (!id) errors.push("id is required");
  else if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) errors.push(`id "${id}" must be alphanumeric with . _ -`);
  if (!entry?.title) errors.push(`${id || "entry"}: title is required`);
  if (entry?.category && !CATEGORIES.includes(entry.category)) {
    errors.push(`${id}: unknown category "${entry.category}"`);
  }
  const license = entry?.license;
  if (!license || license.status === "unknown") {
    errors.push(`${id}: license status must be set (approved or review)`);
  } else if (license.status === "approved" && !license.reviewer) {
    errors.push(`${id}: approved license needs a reviewer stamp`);
  }
  const source = entry?.source;
  const isRemote = source?.type === "remote";
  const installableRemote = isRemote && license?.status !== "review" && license?.status !== "unknown";
  if (isRemote) {
    if (!isHttpUrl(source.url)) errors.push(`${id}: remote source must be an https:// URL`);
    if (installableRemote) {
      if (!entry?.sha256) errors.push(`${id}: approved remote entries require a sha256 for verification`);
      if (!(Number(entry?.sizeBytes) > 0)) errors.push(`${id}: approved remote entries require sizeBytes > 0`);
    }
  } else if (source?.type === "sample" && !source.sampleId) {
    errors.push(`${id}: sample source needs a sampleId`);
  } else if (source?.type === "embedded" && !source.payload) {
    errors.push(`${id}: embedded source needs a payload`);
  }
  if (Number(entry?.priceUsd) > 0 && !entry?.salesChannel) {
    errors.push(`${id}: paid entries must declare salesChannel (how grants are issued)`);
  }
  return errors;
}
function validateCatalogDocument(doc) {
  const errors = [];
  const entries = Array.isArray(doc?.entries) ? doc.entries : null;
  if (!entries) {
    return { ok: false, errors: ["document must have an entries array"], stats: { entries: 0, publishable: 0 } };
  }
  const seen = /* @__PURE__ */ new Set();
  let publishable = 0;
  for (const raw of entries) {
    const entryErrors = validateCatalogEntry(raw);
    const id = typeof raw?.id === "string" ? raw.id : "";
    if (id) {
      if (seen.has(id)) entryErrors.push(`duplicate id "${id}"`);
      seen.add(id);
    }
    if (entryErrors.length === 0) publishable += 1;
    errors.push(...entryErrors);
  }
  const takedowns = Array.isArray(doc?.takedowns) ? doc.takedowns : [];
  for (const t of takedowns) {
    const entryId = typeof t?.entryId === "string" ? t.entryId : "";
    if (!entryId) errors.push("takedown notice without entryId");
    else if (!seen.has(entryId)) errors.push(`takedown references unknown entry "${entryId}"`);
  }
  return { ok: errors.length === 0, errors, stats: { entries: entries.length, publishable } };
}
function stampLicenseReview(entry, { reviewer, reviewedAt, approve, note = "", proof = "" } = {}) {
  const reviewerId = typeof reviewer === "string" ? reviewer.trim() : "";
  if (!reviewerId) throw new Error("stampLicenseReview requires a reviewer id");
  const at = reviewedAt || (/* @__PURE__ */ new Date()).toISOString();
  const license = normalizeLicense(entry?.license);
  return createCatalogEntry({
    ...entry,
    license: {
      ...license,
      status: approve ? "approved" : "review",
      reviewer: reviewerId,
      reviewedAt: at,
      proof: proof || license.proof,
      review: {
        decision: approve ? "approved" : "rejected",
        by: reviewerId,
        at,
        note: typeof note === "string" ? note.slice(0, 512) : ""
      }
    }
  });
}

// src/generationAdapter.mjs
var SUPPORTED_IMAGE_FORMATS = ["png", "webp", "jpg", "jpeg"];
var SUPPORTED_VIDEO_FORMATS = ["mp4", "webm", "mov"];
function createCapabilityManifest(input = {}) {
  return {
    schemaVersion: 1,
    providerId: String(input.providerId || "").toLowerCase(),
    displayName: String(input.displayName || ""),
    // 'image' | 'video' | 'both'
    modalities: Array.isArray(input.modalities) ? input.modalities.filter((m) => ["image", "video"].includes(m)) : [],
    // Extra non-modality capabilities (e.g. 'image-to-video', 'upscale').
    extraCapabilities: Array.isArray(input.extraCapabilities) ? input.extraCapabilities.map(String) : [],
    // MIME types the adapter can produce
    outputFormats: {
      image: Array.isArray(input.outputFormats?.image) ? input.outputFormats.image.filter((f) => SUPPORTED_IMAGE_FORMATS.includes(f)) : ["png"],
      video: Array.isArray(input.outputFormats?.video) ? input.outputFormats.video.filter((f) => SUPPORTED_VIDEO_FORMATS.includes(f)) : ["mp4"]
    },
    // Max resolution per modality (pixels, e.g. 1920x1080)
    maxResolution: {
      image: input.maxResolution?.image || { width: 2048, height: 2048 },
      video: input.maxResolution?.video || { width: 1920, height: 1080 }
    },
    // Max duration for video (seconds)
    maxDurationSec: Number(input.maxDurationSec) || 10,
    // Whether the provider supports async job polling
    supportsAsync: Boolean(input.supportsAsync),
    // Whether the provider supports cancellation
    supportsCancel: Boolean(input.supportsCancel),
    // Whether the provider supports progress callbacks
    supportsProgress: Boolean(input.supportsProgress),
    // Cost model: 'per-second' | 'per-image' | 'per-credit' | 'subscription'
    costModel: ["per-second", "per-image", "per-credit", "subscription"].includes(input.costModel) ? input.costModel : "per-credit",
    // Estimated cost per unit (USD) — used for budget preview
    estimatedCostPerUnit: Number(input.estimatedCostPerUnit) || 0,
    // Cost unit: 'second' | 'image' | 'credit'
    costUnit: ["second", "image", "credit"].includes(input.costUnit) ? input.costUnit : "credit",
    // Rights info for generated output
    rights: {
      // 'commercial' | 'personal' | 'restricted'
      commercialUse: Boolean(input.rights?.commercialUse),
      // Attribution required?
      attributionRequired: Boolean(input.rights?.attributionRequired),
      // License URL or name
      license: String(input.rights?.license || ""),
      // Whether output can be redistributed
      redistributable: Boolean(input.rights?.redistributable)
    },
    // Privacy: does the provider train on user data?
    privacy: {
      trainsOnUserData: Boolean(input.privacy?.trainsOnUserData),
      dataRetentionDays: Number(input.privacy?.dataRetentionDays) || 0,
      // 'none' | 'metadata' | 'full'
      loggingLevel: ["none", "metadata", "full"].includes(input.privacy?.loggingLevel) ? input.privacy.loggingLevel : "metadata"
    },
    // Rate limits (requests per minute)
    rateLimitRpm: Number(input.rateLimitRpm) || 60,
    // Whether this adapter is verified against an official supported API
    verified: Boolean(input.verified)
  };
}
function validateCapabilityManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") return { valid: false, errors: ["manifest must be an object"] };
  if (!manifest.providerId) errors.push("providerId required");
  if (!manifest.displayName) errors.push("displayName required");
  if (!Array.isArray(manifest.modalities) || manifest.modalities.length === 0) {
    errors.push("modalities must be a non-empty array");
  }
  if (typeof manifest.verified !== "boolean") errors.push("verified must be boolean");
  if (manifest.verified === false && manifest.providerId) {
    errors.push(`provider "${manifest.providerId}" is not verified against an official API`);
  }
  const blockingErrors = errors.filter((e) => !e.includes("not verified"));
  return { valid: blockingErrors.length === 0, errors };
}
var GENERATION_JOB_STATUS = {
  pending: "pending",
  // submitted, not yet processing
  processing: "processing",
  // actively generating
  completed: "completed",
  // result ready for download
  failed: "failed",
  // generation failed
  cancelled: "cancelled"
  // user cancelled
};
function createGenerationJobInput(input = {}) {
  return {
    // 'text-to-image' | 'image-to-image' | 'text-to-video' | 'image-to-video'
    taskType: String(input.taskType || "text-to-image"),
    // Prompt text (required for text-to-*)
    prompt: String(input.prompt || ""),
    // Optional input image/video reference (mediaRef from Asset Center)
    inputMediaRef: input.inputMediaRef || null,
    // Provider-specific parameters (resolution, fps, seed, model variant, etc.)
    params: input.params && typeof input.params === "object" ? input.params : {},
    // Optional: negative prompt, style, etc.
    negativePrompt: String(input.negativePrompt || ""),
    // Optional: seed for reproducibility
    seed: input.seed !== void 0 ? Number(input.seed) : null
  };
}
function createJobStatusResponse(input = {}) {
  return {
    jobId: String(input.jobId || ""),
    status: GENERATION_JOB_STATUS[input.status] ? input.status : "failed",
    progress: Number(input.progress) || 0,
    // 0..100
    // When completed: array of result objects
    results: Array.isArray(input.results) ? input.results : [],
    // When failed: error message
    error: input.error ? String(input.error) : null,
    // Estimated time remaining (seconds)
    etaSec: Number(input.etaSec) || null,
    // Cost incurred so far (USD)
    costSoFar: Number(input.costSoFar) || 0
  };
}
function createGenerationResult(input = {}) {
  return {
    // Provider-specific result identifier
    resultId: String(input.resultId || ""),
    // 'image' | 'video'
    type: ["image", "video"].includes(input.type) ? input.type : "image",
    // Download URL (signed, time-limited)
    downloadUrl: String(input.downloadUrl || ""),
    // MIME type
    mimeType: String(input.mimeType || ""),
    // Dimensions
    width: Number(input.width) || 0,
    height: Number(input.height) || 0,
    // Duration for video (seconds)
    durationSec: Number(input.durationSec) || 0,
    // Estimated cost for this specific result
    cost: Number(input.cost) || 0,
    // Provider metadata (model version, seed used, etc.)
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {}
  };
}
function createCostEstimate(input = {}) {
  return {
    estimatedCostUsd: Number(input.estimatedCostUsd) || 0,
    costBreakdown: input.costBreakdown || {},
    // Whether this would exceed a typical budget threshold
    budgetWarning: Boolean(input.budgetWarning)
  };
}
var adapterRegistry = /* @__PURE__ */ new Map();
function registerGenerationAdapter(providerId, adapter) {
  if (!providerId || typeof providerId !== "string") throw new Error("providerId required");
  if (!adapter || typeof adapter !== "object") throw new Error("adapter must be an object");
  const required = ["manifest", "submitJob", "pollJob", "downloadResult", "estimateCost"];
  for (const method of required) {
    if (typeof adapter[method] !== "function") {
      throw new Error(`adapter missing required method: ${method}`);
    }
  }
  const manifest = adapter.manifest();
  const check = validateCapabilityManifest(manifest);
  if (!check.valid && manifest.verified) {
    throw new Error(`verified adapter has invalid manifest: ${check.errors.join("; ")}`);
  }
  adapterRegistry.set(providerId.toLowerCase(), adapter);
}
function getGenerationAdapter(providerId) {
  return adapterRegistry.get(String(providerId).toLowerCase()) || null;
}
function listGenerationAdapters() {
  return [...adapterRegistry.entries()].map(([id, adapter]) => ({
    providerId: id,
    manifest: adapter.manifest()
  }));
}
function isProviderVerified(providerId) {
  const adapter = getGenerationAdapter(providerId);
  return adapter ? adapter.manifest().verified === true : false;
}

// src/providerAdapter.mjs
var PROVIDER_ADAPTER_SCHEMA_VERSION = 1;
var providerRegistry = /* @__PURE__ */ new Map();
function registerProviderAdapter(providerId, adapter) {
  const manifest = adapter.manifest();
  if (manifest.providerId !== providerId) {
    throw new Error(`Provider ID mismatch: registry key "${providerId}" vs manifest "${manifest.providerId}"`);
  }
  if (manifest.schemaVersion !== PROVIDER_ADAPTER_SCHEMA_VERSION) {
    throw new Error(`Provider ${providerId} schema version ${manifest.schemaVersion} != ${PROVIDER_ADAPTER_SCHEMA_VERSION}`);
  }
  providerRegistry.set(providerId, adapter);
}
function getProviderAdapter(providerId) {
  return providerRegistry.get(providerId);
}
function listProviderAdapters() {
  return Array.from(providerRegistry.values()).map((a) => a.manifest());
}
function isProviderRegistered(providerId) {
  return providerRegistry.has(providerId);
}
function getProviderCapabilities(providerId) {
  const adapter = providerRegistry.get(providerId);
  return adapter?.manifest();
}

// src/usageTracker.mjs
var DEFAULT_LIMITS = {
  // Monthly AI token budget (approximate, provider-agnostic)
  aiTokensMonthly: 1e6,
  // Monthly generation cost budget (USD)
  generationCostMonthlyUsd: 10,
  // Asset Center download quota (GB/month)
  assetDownloadGbMonthly: 5,
  // Max project size (GB)
  maxProjectSizeGb: 2
};
function monthKey(date = Date.now()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function getStorage() {
  try {
    const key = "localStorage";
    if (typeof globalThis !== "undefined" && globalThis[key]) {
      return globalThis[key];
    }
  } catch {
  }
  return null;
}
function readStore() {
  try {
    const storage = getStorage();
    const raw = storage ? storage.getItem("tmcut.usage.v1") : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeStore(store) {
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem("tmcut.usage.v1", JSON.stringify(store));
    }
  } catch {
  }
}
function recordAiUsage(tokens, { provider = "unknown" } = {}) {
  const store = readStore();
  const mk = monthKey();
  if (!store[mk]) store[mk] = { aiTokens: 0, generationCostUsd: 0, assetDownloadBytes: 0, exports: 0, byProvider: {} };
  store[mk].aiTokens += Math.max(0, Math.round(tokens));
  const bp = store[mk].byProvider;
  if (!bp[provider]) bp[provider] = { tokens: 0, costUsd: 0, calls: 0 };
  bp[provider].tokens += Math.max(0, Math.round(tokens));
  bp[provider].calls += 1;
  writeStore(store);
}
function recordGenerationCost(costUsd, { provider = "unknown" } = {}) {
  const store = readStore();
  const mk = monthKey();
  if (!store[mk]) store[mk] = { aiTokens: 0, generationCostUsd: 0, assetDownloadBytes: 0, exports: 0, byProvider: {} };
  store[mk].generationCostUsd += Math.max(0, Number(costUsd) || 0);
  const bp = store[mk].byProvider;
  if (!bp[provider]) bp[provider] = { tokens: 0, costUsd: 0, calls: 0 };
  bp[provider].costUsd += Math.max(0, Number(costUsd) || 0);
  writeStore(store);
}
function recordAssetDownload(bytes) {
  const store = readStore();
  const mk = monthKey();
  if (!store[mk]) store[mk] = { aiTokens: 0, generationCostUsd: 0, assetDownloadBytes: 0, exports: 0, byProvider: {} };
  store[mk].assetDownloadBytes += Math.max(0, Math.round(bytes));
  writeStore(store);
}
function recordExport() {
  const store = readStore();
  const mk = monthKey();
  if (!store[mk]) store[mk] = { aiTokens: 0, generationCostUsd: 0, assetDownloadBytes: 0, exports: 0, byProvider: {} };
  store[mk].exports += 1;
  writeStore(store);
}
function getUsageSummary(limits = {}) {
  const store = readStore();
  const mk = monthKey();
  const current = store[mk] || { aiTokens: 0, generationCostUsd: 0, assetDownloadBytes: 0, exports: 0, byProvider: {} };
  const l = { ...DEFAULT_LIMITS, ...limits };
  return {
    month: mk,
    aiTokens: current.aiTokens,
    aiTokensLimit: l.aiTokensMonthly,
    aiTokensPct: l.aiTokensMonthly > 0 ? Math.round(current.aiTokens / l.aiTokensMonthly * 100) : 0,
    generationCostUsd: Number(current.generationCostUsd.toFixed(4)),
    generationCostLimitUsd: l.generationCostMonthlyUsd,
    generationCostPct: l.generationCostMonthlyUsd > 0 ? Math.round(current.generationCostUsd / l.generationCostMonthlyUsd * 100) : 0,
    assetDownloadGb: Number((current.assetDownloadBytes / 1e9).toFixed(3)),
    assetDownloadLimitGb: l.assetDownloadGbMonthly,
    assetDownloadPct: l.assetDownloadGbMonthly > 0 ? Math.round(current.assetDownloadBytes / 1e9 / l.assetDownloadGbMonthly * 100) : 0,
    exports: current.exports,
    byProvider: current.byProvider
  };
}
function checkLimit(action, limits = {}) {
  const summary = getUsageSummary(limits);
  const l = { ...DEFAULT_LIMITS, ...limits };
  switch (action) {
    case "ai-tokens": {
      const near = summary.aiTokensPct >= 90;
      return { allowed: !near, reason: near ? "ai-tokens-near-limit" : null, current: summary.aiTokens, limit: l.aiTokensMonthly };
    }
    case "generation-cost": {
      return { allowed: summary.generationCostPct < 100, reason: summary.generationCostPct >= 100 ? "generation-cost-limit" : null, current: summary.generationCostUsd, limit: l.generationCostMonthlyUsd };
    }
    case "asset-download": {
      return { allowed: summary.assetDownloadPct < 100, reason: summary.assetDownloadPct >= 100 ? "asset-download-limit" : null, current: summary.assetDownloadGb, limit: l.assetDownloadGbMonthly };
    }
    default:
      return { allowed: true, reason: null, current: 0, limit: 0 };
  }
}
function resetUsageStore() {
  writeStore({});
}
function exportUsageData() {
  return readStore();
}

// src/telemetry.mjs
var TELEMETRY_SCHEMA_VERSION = 1;
var STORAGE_KEY = "tmcut.telemetry.v1";
var MAX_EVENTS = 5e3;
function getStorage2() {
  try {
    const key = "localStorage";
    if (typeof globalThis !== "undefined" && globalThis[key]) {
      return globalThis[key];
    }
  } catch {
  }
  return null;
}
function readEvents() {
  try {
    const storage = getStorage2();
    const raw = storage ? storage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function writeEvents(events) {
  try {
    const storage = getStorage2();
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(events));
    }
  } catch {
    if (events.length > 100) writeEvents(events.slice(-100));
  }
}
function isTelemetryEnabled() {
  try {
    const storage = getStorage2();
    return storage ? storage.getItem("tmcut.telemetry.enabled") === "true" : false;
  } catch {
    return false;
  }
}
function setTelemetryEnabled(enabled) {
  try {
    const storage = getStorage2();
    if (storage) {
      storage.setItem("tmcut.telemetry.enabled", String(Boolean(enabled)));
    }
  } catch {
  }
}
function recordTelemetryEvent(category, action, metadata = {}) {
  if (!isTelemetryEnabled()) return;
  const events = readEvents();
  events.push({
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    timestamp: Date.now(),
    category: String(category),
    action: String(action),
    // Only allowlisted metadata keys — no free-form strings
    metadata: sanitizeMetadata(metadata)
  });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  writeEvents(events);
}
function sanitizeMetadata(input) {
  if (!input || typeof input !== "object") return {};
  const allowed = [
    "durationMs",
    "success",
    "errorCode",
    "projectType",
    "canvasWidth",
    "canvasHeight",
    "fps",
    "trackCount",
    "clipCount",
    "effectCount",
    "transitionCount",
    "assetKind",
    "assetCount",
    "templateCategory",
    "profileName",
    "providerId",
    "modelName",
    "tokensUsed",
    "costUsd",
    "exportFormat",
    "exportDurationSec",
    "analysisStage",
    "assetSource"
  ];
  const out = {};
  for (const key of allowed) {
    if (input[key] !== void 0) {
      const val = input[key];
      out[key] = typeof val === "number" ? Number(val.toFixed ? val.toFixed(3) : val) : String(val);
    }
  }
  return out;
}
function getTelemetryEvents() {
  return readEvents();
}
function clearTelemetryEvents() {
  writeEvents([]);
}
function generateTelemetryReport(appVersion = "unknown") {
  const events = readEvents();
  const summary = {};
  for (const e of events) {
    const key = `${e.category}:${e.action}`;
    summary[key] = (summary[key] || 0) + 1;
  }
  return {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    generatedAt: Date.now(),
    appVersion,
    eventCount: events.length,
    events,
    summary
  };
}
var TELEMETRY_CATEGORIES = {
  editor: "editor",
  // timeline edits, playback, zoom
  export: "export",
  // render, encode, upload
  ai: "ai",
  // plan generation, triage, transcription
  autocut: "autocut",
  // scene detection, silence detection, draft
  assetCenter: "assetCenter",
  // browse, download, install, verify
  templates: "templates",
  // create, import, export, apply
  audio: "audio",
  // music bed, SFX, orchestration
  project: "project",
  // create, open, save, recover
  settings: "settings",
  // preference changes
  error: "error"
  // error boundaries (codes only)
};
var TELEMETRY_ACTIONS = {
  editor: ["clip-add", "clip-move", "clip-trim", "clip-split", "clip-delete", "track-add", "track-toggle", "undo", "redo", "play", "seek", "zoom"],
  export: ["render-start", "render-complete", "render-fail", "upload-start", "upload-complete"],
  ai: ["plan-request", "plan-apply", "plan-repair", "triage-request", "transcribe-request"],
  autocut: ["analyze-start", "analyze-complete", "draft-accept", "draft-reject", "rerun"],
  assetCenter: ["browse", "download-start", "download-complete", "install", "verify", "uninstall"],
  templates: ["create", "import", "export", "apply", "ai-generate"],
  audio: ["music-bed-apply", "sfx-apply", "orchestrate"],
  project: ["create", "open", "save", "recover", "snapshot", "duplicate"],
  settings: ["change", "reset"],
  error: ["caught", "boundary", "recovery"]
};

// src/crashRecovery.mjs
var RECOVERY_KEY = "tmcut.recovery.v1";
var CRASH_LOG_KEY = "tmcut.crashlog.v1";
var MAX_CRASH_ENTRIES = 20;
function getStorage3() {
  try {
    const key = "localStorage";
    if (typeof globalThis !== "undefined" && globalThis[key]) {
      return globalThis[key];
    }
  } catch {
  }
  return null;
}
function readRecovery() {
  try {
    const storage = getStorage3();
    const raw = storage ? storage.getItem(RECOVERY_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeRecovery(data) {
  try {
    const storage = getStorage3();
    if (storage) {
      storage.setItem(RECOVERY_KEY, JSON.stringify(data));
    }
  } catch {
  }
}
function checkpointRecovery(state) {
  if (!state || typeof state !== "object") return;
  const checkpoint = {
    timestamp: Date.now(),
    version: state.version || "unknown",
    // Only safe, serializable state
    projectId: state.projectId || null,
    projectName: state.projectName || null,
    canvas: state.canvas ? { width: state.canvas.width, height: state.canvas.height, fps: state.canvas.fps } : null,
    timelineDurationMs: state.timelineDurationMs || 0,
    trackCount: state.trackCount || 0,
    clipCount: state.clipCount || 0,
    unsavedChanges: Boolean(state.unsavedChanges),
    lastAction: state.lastAction || null,
    // UI state for recovery
    activeTab: state.activeTab || "timeline",
    playheadPosition: state.playheadPosition || 0
  };
  writeRecovery(checkpoint);
}
function getLastCheckpoint() {
  return readRecovery();
}
function clearRecoveryCheckpoint() {
  try {
    const storage = getStorage3();
    if (storage) {
      storage.removeItem(RECOVERY_KEY);
    }
  } catch {
  }
}
function recordCrash(error, context = {}) {
  try {
    const storage = getStorage3();
    const raw = storage ? storage.getItem(CRASH_LOG_KEY) : null;
    const crashes = raw ? JSON.parse(raw) : [];
    crashes.push({
      timestamp: Date.now(),
      version: context.version || "unknown",
      message: error?.message ? String(error.message).slice(0, 500) : "Unknown error",
      stack: error?.stack ? String(error.stack).slice(0, 2e3) : null,
      context: sanitizeContext(context)
    });
    if (crashes.length > MAX_CRASH_ENTRIES) crashes.splice(0, crashes.length - MAX_CRASH_ENTRIES);
    if (storage) {
      storage.setItem(CRASH_LOG_KEY, JSON.stringify(crashes));
    }
  } catch {
  }
}
function getCrashLog() {
  try {
    const storage = getStorage3();
    const raw = storage ? storage.getItem(CRASH_LOG_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function clearCrashLog() {
  try {
    const storage = getStorage3();
    if (storage) {
      storage.removeItem(CRASH_LOG_KEY);
    }
  } catch {
  }
}
function sanitizeContext(input) {
  if (!input || typeof input !== "object") return {};
  const allowed = [
    "projectId",
    "projectType",
    "canvasWidth",
    "canvasHeight",
    "trackCount",
    "clipCount",
    "activeTool",
    "recentActions",
    "electronVersion",
    "platform",
    "arch",
    "memoryUsageMb"
  ];
  const out = {};
  for (const key of allowed) {
    if (input[key] !== void 0) out[key] = input[key];
  }
  return out;
}
async function describeDiskAccess(fsModule) {
  if (!fsModule || typeof fsModule.stat !== "function") {
    return { status: "warn", detail: "No filesystem in this context (browser or renderer)" };
  }
  try {
    await fsModule.stat(".");
    return { status: "ok", detail: "Working directory writable" };
  } catch (e) {
    return { status: "fail", detail: String(e.message || e) };
  }
}
function nodeBuiltin(name) {
  const get = globalThis.process?.getBuiltinModule;
  return typeof get === "function" ? get.call(globalThis.process, name) : null;
}
async function runHealthChecks() {
  const checks = [];
  const disk = await describeDiskAccess(nodeBuiltin("fs/promises"));
  checks.push({ name: "disk-access", ...disk });
  try {
    const hasEncoder = typeof globalThis["VideoEncoder"] === "function";
    checks.push({
      name: "webcodecs",
      status: hasEncoder ? "ok" : "warn",
      detail: hasEncoder ? "VideoEncoder available" : "VideoEncoder not in this context (renderer-only)"
    });
  } catch {
    checks.push({ name: "webcodecs", status: "fail", detail: "WebCodecs check failed" });
  }
  try {
    const doc = typeof globalThis !== "undefined" ? globalThis["document"] : null;
    const canvas = doc && typeof doc.createElement === "function" ? doc.createElement("canvas") : null;
    const gl = canvas ? canvas.getContext("webgl2") || canvas.getContext("webgl") : null;
    checks.push({
      name: "webgl",
      status: gl ? "ok" : "warn",
      detail: gl ? "WebGL available" : "WebGL not available (software fallback)"
    });
  } catch {
    checks.push({ name: "webgl", status: "fail", detail: "WebGL check failed" });
  }
  try {
    const storage = getStorage3();
    if (storage) {
      const testKey = "__tmcut_quota_test__";
      storage.setItem(testKey, "x".repeat(1e4));
      storage.removeItem(testKey);
      checks.push({ name: "storage", status: "ok", detail: "Quota available" });
    } else {
      checks.push({ name: "storage", status: "warn", detail: "Storage not available in this environment" });
    }
  } catch {
    checks.push({ name: "storage", status: "fail", detail: "Quota exceeded or blocked" });
  }
  checks.push({ name: "indexedDB", status: "unknown", detail: "Not checked" });
  const ok = checks.filter((c) => c.status === "ok").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  return {
    checks,
    summary: { ok, warn, fail, overall: fail > 0 ? "fail" : warn > 0 ? "warn" : "ok" }
  };
}
function generateSupportBundle(appVersion = "unknown") {
  const checkpoint = getLastCheckpoint();
  const crashes = getCrashLog();
  const telemetry = getTelemetryEvents();
  const usage = getUsageSummary();
  return {
    schemaVersion: 1,
    generatedAt: Date.now(),
    appVersion,
    platform: typeof navigator !== "undefined" ? navigator.platform : "unknown",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    checkpoint,
    recentCrashes: crashes.slice(-5),
    telemetryEventCount: telemetry.length,
    usageSummary: usage,
    // Config snapshot (safe keys only)
    config: {
      telemetryEnabled: isTelemetryEnabled(),
      language: getStorage3()?.getItem("i18n:locale") || "vi"
    }
  };
}
function getRecoveryManifest() {
  const cp = getLastCheckpoint();
  if (!cp) return { hasCheckpoint: false, canRecover: false };
  const ageMs = Date.now() - cp.timestamp;
  return {
    hasCheckpoint: true,
    projectName: cp.projectName,
    projectId: cp.projectId,
    canvas: cp.canvas,
    timelineDurationMs: cp.timelineDurationMs,
    clipCount: cp.clipCount,
    unsavedChanges: cp.unsavedChanges,
    lastAction: cp.lastAction,
    ageMinutes: Math.round(ageMs / 6e4),
    canRecover: cp.unsavedChanges && ageMs < 24 * 60 * 60 * 1e3
    // within 24h
  };
}
export {
  AI_EDIT_PLAN_SCHEMA_VERSION,
  ASSET_CENTER_SCHEMA_VERSION,
  ASSET_KINDS,
  AUDIO_MIN_HAND_PACKETS,
  AUDIO_PACKET_FRAMES,
  BLEND_MODES,
  BUILTIN_TEMPLATES,
  CATALOG_PUBLISH_SCHEMA_VERSION,
  CROP_RATIO_PRESETS,
  DEFAULT_ENCODE_IN_FLIGHT,
  DEFAULT_FILLER_WORDS,
  DEFAULT_FRAME_COMPARE,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TEXT_FONT_SIZE,
  DOWNLOAD_STATES,
  EDIT_OPERATION_TYPES,
  EFFECT_REGISTRY,
  ELEMENT_RATE_MAX,
  ELEMENT_RATE_MIN,
  ENCODER_EVEN_DIMENSION_REASON,
  ENCODE_AUDIO_REQUEST,
  ENCODE_PROGRESS_UNTIL_CLOSED,
  ENCODE_REFUSAL_REASONS,
  ENTITLEMENT_SCHEMA_VERSION,
  EXPORT_BAKED_EFFECTS,
  EXPORT_MIX_REFUSALS,
  FOLDER_TAG_COLORS,
  GENERATION_JOB_STATUS,
  HTML_VIDEO_LIMITS,
  HTML_VIDEO_PRESETS,
  HTML_VIDEO_SPEC_VERSION,
  INDUSTRY_CATALOG,
  INSTALL_STATES,
  KEYFRAME_EASINGS,
  KNOWN_FRAME_RATES,
  KNOWN_TRANSITIONS,
  LICENSE_STATUS,
  MEDIA_WARNING_SEVERITY,
  PLATFORM_CAPABILITIES,
  PLATFORM_NAMES,
  PROVIDER_ADAPTER_SCHEMA_VERSION,
  SAFE_AREA_PRESETS,
  SPEED_RAMP_PRESETS,
  STARTER_FONT_CATALOG,
  STARTER_MARKETPLACE_CATALOG,
  STARTER_MUSIC_CATALOG,
  STARTER_SFX_CATALOG,
  STICKER_GROUPS,
  TAKEDOWN_SCHEMA_VERSION,
  TELEMETRY_ACTIONS,
  TELEMETRY_CATEGORIES,
  TEMPLATE_MIN_SUPPORTED_VERSION,
  TEMPLATE_PLAN_SCHEMA_VERSION,
  TEMPLATE_SCHEMA_VERSION,
  TICKS_PER_SECOND,
  TMCUT_BYTE_CACHE_MAX_BYTES,
  TMCUT_BYTE_CACHE_QUOTA_SHARE,
  TMCUT_FRAME_CACHE_MAX_ENTRIES,
  TMCUT_FRAME_MAX_CONCURRENT,
  TMCUT_FRAME_MAX_TIME_SEC,
  TMCUT_PLAYBACK_DRIFT_TOLERANCE_SEC,
  TMCUT_PLAYBACK_JUMP_SEC,
  TMCUT_PLAYBACK_PRESENTING_READY_STATE,
  TMCUT_PLAYBACK_SEEK_COOLDOWN_MS,
  TMCUT_PLAYBACK_STALL_LIMIT_MS,
  TMCUT_SCENE_GRID_CELLS,
  TMCUT_SCENE_SAMPLE_HZ,
  TMCUT_SCENE_THRESHOLD,
  TMCUT_SILENCE_FLOOR_DBFS,
  TMCUT_SILENCE_MIN_DURATION_SEC,
  TMCUT_SILENCE_NOISE_DB,
  TMCUT_SILENCE_WINDOW_SEC,
  TMCUT_WAVEFORM_ALGORITHM,
  TMCUT_WAVEFORM_CACHE_KIND,
  TMCUT_WAVEFORM_CACHE_VERSION,
  TMCUT_WAVEFORM_PEAK_PRECISION,
  TMUTCANVAS_PRESETS,
  TMUTCUT_FIT_MODES,
  TMUTCUT_MASK_SHAPES,
  TMUTCUT_SOCIAL_PRESETS,
  USABLE_LICENSE_STATUSES,
  XFADE_COMB_PERIOD,
  XFADE_POSITION_LAWS,
  XFADE_PREVIEW,
  addClip,
  addMarker,
  addTrack,
  allStickers,
  analyzeTranscriptSegment,
  applyCropRatio,
  applyEditPlan,
  applyTransition,
  aspectValue,
  assetIdForPath,
  attachMetadata,
  audioMixAt,
  blendModeOf,
  blendSceneInterest,
  buildCapabilityMatrix,
  buildCompatibility,
  buildFrameRate,
  buildMediaCapabilities,
  buildMediaInfo,
  buildRampPreset,
  buildTemplateFromPlan,
  buildWaveformPayload,
  byteCacheBudgetBytes,
  byteCacheFingerprint,
  byteCacheFits,
  cacheKeyForPath,
  cachePathFor,
  canApplyTransition,
  canInstall,
  canServe,
  canServeAfterTakedown,
  checkLimit,
  checkRequiredAssets,
  checkpointRecovery,
  clampCropRect,
  clampEffectParam,
  clampFrameTime,
  clampWaveformPoints,
  clampedElementRate,
  classifyAssetKind,
  classifyImportStatus,
  clearCrashLog,
  clearRecoveryCheckpoint,
  clearTelemetryEvents,
  clearTransition,
  clipDurationTicks,
  clipEndTicks,
  clipSourceRange,
  clipSpan,
  closeGaps,
  coalesce,
  collectHtmlTokens,
  compareFrames,
  compositePlan,
  computeFitObjectStyle,
  copyClips,
  createCapabilityManifest,
  createCatalogEntry,
  createClock,
  createCostEstimate,
  createDownloadQueue,
  createFolder,
  createFramePace,
  createFrameScheduler,
  createFrameSlotLedger,
  createGenerationJobInput,
  createGenerationResult,
  createHistory,
  createInstalledAsset,
  createJobStatusResponse,
  createPlatformInfo,
  createProject,
  createSelection,
  createTemplateFromTimeline,
  cuesToCaptionClips,
  cutsToShots,
  dbfsOf,
  decideRecovery,
  defaultCanvas,
  defaultTimeline,
  derivedByteCacheKey,
  describeDiskAccess,
  detectFillerWords,
  duplicateClips,
  editPlanFromEdl,
  elementRate,
  encodeAudioHandCount,
  encodeAudioPacketCount,
  encodeAudioSampleCount,
  encodeCanvasFill,
  ensureTrack,
  evalKeyframe,
  evaluateClip,
  evaluateTimeline,
  expandRelated,
  exportBakesEffect,
  exportBakesEffectInstance,
  exportUsageData,
  extensionOf,
  extractJsonObject,
  fadeDuration,
  filmstripTimes,
  filterAssetsByFolder,
  filterTemplates,
  findActiveTakedown,
  findAssetByPath,
  findCanvasPreset,
  findCanvasPresetByDimensions,
  findClip,
  findTrack,
  floatPeakBuckets,
  fnv1aHex,
  formatDurationSec,
  formatFileSize,
  formatTimecode,
  fpsToRational,
  frameCountFor,
  frameRequestKey,
  frameRequestMillis,
  frameRequestWidth,
  frameTimeSec,
  frameTimeWithinMedia,
  frameTimes,
  frameTimesForSegments,
  fxCapabilities,
  gainAt,
  generateSupportBundle,
  generateTelemetryReport,
  generationOutputToCatalogEntry,
  getAssemblyReadyAssets,
  getAsset,
  getAssetFolder,
  getBuiltinTemplates,
  getCrashLog,
  getFolder,
  getFolderCounts,
  getGenerationAdapter,
  getLastCheckpoint,
  getMarketplaceByCategory,
  getMarketplaceEntryById,
  getMarketplaceFonts,
  getMarketplaceMusic,
  getMarketplaceSfx,
  getProviderAdapter,
  getProviderCapabilities,
  getRecoveryManifest,
  getTelemetryEvents,
  getTemplateById,
  getUsageSummary,
  groupClips,
  hasLiveEntitlement,
  htmlVideoEscape,
  htmlVideoPreset,
  htmlVideoSeekContract,
  insertClipRipple,
  instantiateTemplate,
  int16ToPeaks,
  isAllowedRenderUrl,
  isBlockedRenderHost,
  isByteCacheKey,
  isDerivedByteCacheKey,
  isFrameCacheKey,
  isProviderHealthy,
  isProviderRegistered,
  isProviderVerified,
  isRamped,
  isRetimed,
  isStoredByteCacheKey,
  isTelemetryEnabled,
  isTrackMuted,
  isVectorStillImage,
  keyframeAt,
  keyframeTimes,
  lintHtmlVideo,
  listAssets,
  listGenerationAdapters,
  listProviderAdapters,
  loudestPeakSeries,
  lumaCells,
  lumaOf,
  lutGrade,
  markersInRange,
  maskCssMaskImage,
  mediaFileKey,
  mediaFileName,
  mediaInfoToMetadata,
  mergeAudioProvenance,
  mergeTakedownRegistry,
  migrateTemplate,
  migrateV1ToV3,
  moveClip,
  moveClips,
  moveMarker,
  nextTrackName,
  normalizeCanvas,
  normalizeEffects,
  normalizeGenerationOutput,
  normalizeLicense,
  normalizeMask,
  normalizeMediaPath,
  normalizeTakedownNotice,
  orientationOf,
  overlapDuration,
  paintStackAt,
  parseDerivedByteCacheKey,
  parseEditPlanReply,
  parseEntitlements,
  parseSrt,
  parseTakedownRegistry,
  parseTemplatePlanReply,
  pasteClips,
  pcmHeadTrim,
  peakLevelSeries,
  pickDuration,
  planBlobUrlLifecycle,
  planByteCacheEviction,
  planEncodeAudioPadding,
  planEncodeAudioSample,
  planEncodeChunk,
  planEncodeConfig,
  planEncodeContent,
  planEncodeFinish,
  planEncodePacketMeta,
  planEncodePlate,
  planEncodePresets,
  planEncodeProgress,
  planEncodeQueue,
  planEncodeSample,
  planExportMixPacket,
  planFrameCacheEviction,
  planMusicBed,
  planPlaybackByteSource,
  planPlaybackFollow,
  planPlaybackSourceCommit,
  planSfxCues,
  platformSupports,
  previewScale,
  previewTransitionRamp,
  projectTracks,
  propsWithKeyframes,
  pushBatch,
  rampElapsedForConsumed,
  rampIntegral,
  rampTimelineToSource,
  rankAudioCandidates,
  ratioIdOf,
  ratioLabel,
  rationalToFloat,
  readWaveformPayload,
  recordAiUsage,
  recordAssetDownload,
  recordCrash,
  recordExport,
  recordGenerationCost,
  recordTelemetryEvent,
  recoverInstallStates,
  reframeTransform,
  refusedEffectName,
  registerAsset,
  registerGenerationAdapter,
  registerProviderAdapter,
  relinkAsset,
  removeAsset,
  removeClip,
  removeFolder,
  removeKeyframe,
  removeMarker,
  removeTrack,
  renameFolder,
  renderAt,
  replaceHtmlTokens,
  replacePlaceholder,
  resetUsageStore,
  resolveClipLayout,
  resolveClips,
  rippleDelete,
  routeScene,
  routeStoryboard,
  runHealthChecks,
  safeAreaRects,
  sceneCuts,
  sceneSampleTimes,
  sceneScore,
  scoreSegments,
  secToTicks,
  segmentsToClips,
  selectAllClips,
  selectFileRows,
  selectPaintRows,
  selectSegments,
  selectTrackClips,
  serializeSrt,
  setAssetFolder,
  setKeyframe,
  setTelemetryEnabled,
  silenceSpans,
  snapTime,
  snapTimeDetailed,
  snapToFrame,
  sourceToTimeline,
  speedAt,
  splitClip,
  splitLongCue,
  splitRamp,
  splitSpeedPoints,
  stampLicenseReview,
  stickerMatches,
  storageReport,
  summarizeEditPlan,
  summarizeTemplatePlan,
  syncTicksResult,
  syncV3Result,
  takedownAudit,
  textAnimationAt,
  textBoxPadding,
  textShadowOffset,
  textStrokeWidth,
  ticksClipToV3,
  ticksMatchesV3,
  ticksPerFrame,
  ticksToFrames,
  ticksToSec,
  ticksTracksToV3,
  timelineToSource,
  toggleSelected,
  totalDurationTicks,
  transitionInstall,
  transitionWindows,
  trimClip,
  trimRamp,
  ungroupClips,
  unresolvedHtmlTokens,
  updateFolderColor,
  v1ClipToV3,
  v1MatchesV3,
  v1TracksToV3,
  v3ClipToTicks,
  v3ClipToV1,
  validateCapabilityManifest,
  validateCatalogDocument,
  validateCatalogEntry,
  validateEditPlan,
  validateEdl,
  validateEffect,
  validateHtmlVideoSpec,
  validateSpeed,
  validateTemplate,
  validateTemplatePlan,
  validateTimeline,
  waveformCacheKey,
  withSpeed
};
//# sourceMappingURL=index.js.map