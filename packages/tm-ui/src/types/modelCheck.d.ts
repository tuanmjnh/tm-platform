import type { ModelCheckResult, ModelSelectLabels } from './ModelSelect'

export type LabelLookup = (key: keyof ModelSelectLabels) => string

export interface CheckFailure {
  title: string
  desc: string
  raw: string
}

/** Supports `{name}` placeholders, leaving unknown names untouched. */
export declare function interpolate(text: string, values: Record<string, string | number>): string

/** Maps a structured failure reply to the title and hint shown to the user. */
export declare function classifyFailure(result: ModelCheckResult, label: LabelLookup): CheckFailure

/** Maps a thrown transport error (network, abort, HTTP) to the same shape. */
export declare function classifyThrown(err: unknown, label: LabelLookup): CheckFailure
