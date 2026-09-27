/**
 * The name a learner types for a new file, checked: kebab-case TypeScript, as the Angular style
 * guide names files, and not one the lesson already has.
 */
const KEBAB_TS = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.spec)?\.ts$/;

export type FileNameResult = { readonly name: string } | { readonly error: string };

export function checkFileName(typed: string, existing: readonly string[]): FileNameResult {
  const trimmed = typed.trim();
  if (!trimmed) return { error: 'Type a name, such as new-habit.ts.' };
  const name = trimmed.endsWith('.ts') ? trimmed : `${trimmed}.ts`;
  if (!KEBAB_TS.test(name)) {
    return { error: 'Use lower case letters, digits and hyphens, as in new-habit.ts.' };
  }
  if (existing.includes(name)) return { error: `There is already a file called ${name}.` };
  return { name };
}
