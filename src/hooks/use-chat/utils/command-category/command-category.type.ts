/**
 * How a parsed command behaves with respect to an in-flight translation:
 * - `pure` — touches only UI/transcript state, safe to run at any time;
 * - `chain-affecting` — rebuilds the LLM chain, so it takes effect on the
 *   *next* request while the running stream finishes on the old settings;
 * - `translate` — starts a new request, so it is subject to interrupt-first.
 */
export type CommandCategory = "pure" | "chain-affecting" | "translate";
