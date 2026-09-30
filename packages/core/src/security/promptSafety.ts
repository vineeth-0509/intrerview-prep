

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |any )?(previous|prior|above|earlier) instructions?/gi,
  /disregard (all |any )?(previous|prior|above|earlier) instructions?/gi,
  /forget (all |any )?(previous|prior|above|earlier) instructions?/gi,
  /you are now (a|an)\s/gi,
  /pretend (that )?you are\s/gi,
  /new system prompt/gi,
  /\bsystem\s*:\s*override/gi,
];

export function flagSuspiciousInstructions(text: string): string {
  return INJECTION_PATTERNS.reduce(
    (acc, pattern) => acc.replace(pattern, (match) => `[flagged-text: "${match.trim()}"]`),
    text,
  );
}

export function wrapUntrustedContent(label: string, content: string): string {
  const flagged = flagSuspiciousInstructions(content);
  return `<untrusted_content source="${label}">\n${flagged}\n</untrusted_content>`;
}
