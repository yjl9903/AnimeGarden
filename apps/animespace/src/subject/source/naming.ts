import z from 'zod';
import { SubjectType, resolveSubjectType } from './schema.ts';

export type NamingTemplate = Partial<Record<SubjectType, string>>;

export interface SubjectNaming {
  readonly name: string;

  readonly template: NamingTemplate;

  readonly season?: number;

  readonly year?: number;

  readonly month?: number;
}

export const NamingTemplateMapSchema = z
  .record(z.string(), z.string())
  .transform<NamingTemplate>((raw, ctx) => {
    const output: NamingTemplate = {};
    for (const [key, value] of Object.entries(raw)) {
      const normalizedValue = value.trim();
      if (normalizedValue.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `template.${key} cannot be empty.`
        });
        return z.NEVER;
      }

      const normalizedKey = resolveSubjectType(key);
      if (!normalizedKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `template.${key} is not supported, expected TV/Movie (or 动画/电影).`
        });
        return z.NEVER;
      }

      output[normalizedKey] = normalizedValue;
    }
    return output;
  });

export const DefaultNamingTemplate: Record<SubjectType, string> = {
  [SubjectType.TV]: '{name} S{season}E{episode} {{fansub}}',
  [SubjectType.Movie]: '{name} {{fansub}}'
};

export function resolveTemplateByType(
  type: SubjectType,
  template: NamingTemplate | undefined
): string {
  return template?.[type] ?? DefaultNamingTemplate[type];
}

export function renderNamingTemplate(
  template: string,
  values: {
    name?: string;
    season?: number;
    episode?: number;
    fansub?: string;
    year?: number;
    month?: number;
  }
): string {
  const rendered = template
    .replaceAll('{name}', values.name ? String(values.name) : '')
    .replaceAll('{season}', values.season !== undefined ? padNumber(values.season) : '')
    .replaceAll('{episode}', values.episode !== undefined ? padNumber(values.episode) : '')
    .replaceAll('{fansub}', values.fansub ? String(values.fansub) : '')
    .replaceAll('{year}', values.year !== undefined ? String(values.year) : '')
    .replaceAll('{month}', values.month !== undefined ? String(values.month) : '');

  return rendered.trim();
}

function padNumber(value: number) {
  if (value < 0) return '' + value;
  if (value < 10) return '0' + value;
  return '' + value;
}
