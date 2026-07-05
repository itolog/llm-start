// Matches a configured model name against an Ollama tag, accounting for the
// implicit ":latest" tag Ollama applies when a model is pulled without one.
export function modelMatches(configured: string, tag: string): boolean {
  return (
    tag === configured ||
    tag === `${configured}:latest` ||
    `${tag}:latest` === configured
  );
}
