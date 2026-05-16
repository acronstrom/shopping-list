// Split a free-form instructions string into individual cooking steps.
//
// Stored format is typically "1. Hacka löken.\n2. Stek tomaterna." but the
// user may have edited it freely. We accept:
//   - Numbered lines ("1. ...", "2) ...", "1 - ...")
//   - Plain newline-separated paragraphs
//   - A single paragraph with no separators (returned as one step)

export function splitInstructions(text: string | null | undefined): string[] {
  if (!text) return []
  const trimmed = text.trim()
  if (!trimmed) return []

  // First, split on blank lines (Markdown-style paragraph breaks).
  const paragraphs = trimmed.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean)
  const lines = paragraphs.length > 1
    ? paragraphs
    : trimmed.split(/\n/).map(p => p.trim()).filter(Boolean)

  return lines.map(line =>
    // Strip a leading "1." / "1)" / "1 -" / "1:" so the step number from
    // the UI doesn't double up.
    line.replace(/^\s*\d+\s*[.)\-:]\s*/, '').trim()
  ).filter(Boolean)
}
