import { z } from 'zod';
import { TEMPLATES, picksOf, type DraftState, type Step, type Suggestion } from '@brawlstats/draft';

export const draftStateSchema = z.object({
  mode: z.string().min(1).max(40),
  map: z.string().max(80).default(''),
  firstTeam: z.enum(['A', 'B']),
  actions: z
    .array(
      z.object({
        type: z.enum(['ban', 'pick']),
        team: z.enum(['A', 'B']),
        brawler: z.string().min(1).max(40),
      }),
    )
    .max(12),
});

export const analyzeBodySchema = z.object({
  state: draftStateSchema,
  /** A qué equipo y qué tipo de jugada se le pide la sugerencia. */
  step: z.object({ type: z.enum(['ban', 'pick']), team: z.enum(['A', 'B']) }),
  pool: z.array(z.string().max(40)).max(200).optional(),
});

export interface AiAdvice {
  summary: string;
  ranking: { brawler: string; reason: string }[];
}

export class AiError extends Error {}

export interface DraftAnalyzer {
  analyze(state: DraftState, step: Step, candidates: Suggestion[]): Promise<AiAdvice>;
}

export interface AnalyzerOptions {
  apiKey: string;
  model?: string;
  fetch?: typeof fetch;
}

const SYSTEM = `Eres un coach competitivo de Brawl Stars. Recibes el estado de un draft (modo, mapa, bans y picks de cada equipo, en cualquier orden) y qué jugada se pide (campo "pide": ban o pick de un equipo) y una lista de candidatos ya puntuados con plantillas del modo. Reordena los candidatos según tu criterio (sinergias, counters, riesgo de contrapick, composición) y explica brevemente cada elección en español. Solo puedes recomendar brawlers de la lista de candidatos. Responde únicamente con JSON: {"summary": string, "ranking": [{"brawler": string, "reason": string}]} con a lo sumo 3 elementos en ranking, summary de 1 o 2 frases y cada reason de una frase.`;

export function createDraftAnalyzer(options: AnalyzerOptions): DraftAnalyzer {
  const doFetch = options.fetch ?? fetch;
  const model = options.model ?? 'claude-sonnet-5-5';

  return {
    async analyze(state, step, candidates) {
      const template = TEMPLATES[state.mode];
      const prompt = JSON.stringify({
        modo: template?.label ?? state.mode,
        mapa: state.map || null,
        pide: { tipo: step.type, equipo: step.team },
        bans: state.actions.filter((a) => a.type === 'ban').map((a) => a.brawler),
        picksA: picksOf(state, 'A'),
        picksB: picksOf(state, 'B'),
        candidatos: candidates.map((c) => ({
          brawler: c.brawler,
          puntaje: c.score,
          motivos: c.reasons,
        })),
      });

      let res: Response;
      try {
        res = await doFetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': options.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 800,
            system: SYSTEM,
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: AbortSignal.timeout(25_000),
        });
      } catch (err) {
        throw new AiError(`No se pudo contactar a Claude: ${String(err)}`);
      }
      if (!res.ok) throw new AiError(`Claude respondió ${res.status}`);

      const body = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = body.content?.find((c) => c.type === 'text')?.text ?? '';
      return parseAdvice(text, new Set(candidates.map((c) => c.brawler)));
    },
  };
}

const adviceSchema = z.object({
  summary: z.string(),
  ranking: z.array(z.object({ brawler: z.string(), reason: z.string() })),
});

/** Extrae el JSON de la respuesta y descarta brawlers que no eran candidatos. */
export function parseAdvice(text: string, allowed: Set<string>): AiAdvice {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new AiError('La respuesta de Claude no trae JSON');
  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AiError('La respuesta de Claude no es JSON válido');
  }
  const parsed = adviceSchema.safeParse(json);
  if (!parsed.success) throw new AiError('La respuesta de Claude no tiene el formato esperado');
  const ranking = parsed.data.ranking.filter((r) => allowed.has(r.brawler)).slice(0, 3);
  return { summary: parsed.data.summary, ranking };
}
