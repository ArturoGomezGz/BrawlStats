import { describe, expect, it } from 'vitest';
import { AiError, createDraftAnalyzer, parseAdvice } from './ai.js';
import { newDraft, type Suggestion } from '@brawlstats/draft';

const candidates: Suggestion[] = [
  { brawler: 'POCO', score: 90, reasons: ['Muy fuerte'] },
  { brawler: 'AMBER', score: 80, reasons: [] },
];

describe('parseAdvice', () => {
  it('extrae el JSON aunque venga con texto alrededor y descarta brawlers inventados', () => {
    const text =
      'Claro:\n{"summary":"Resumen","ranking":[{"brawler":"POCO","reason":"x"},{"brawler":"INVENTADO","reason":"y"}]}';
    expect(parseAdvice(text, new Set(['POCO', 'AMBER']))).toEqual({
      summary: 'Resumen',
      ranking: [{ brawler: 'POCO', reason: 'x' }],
    });
  });

  it('falla con una respuesta que no es JSON', () => {
    expect(() => parseAdvice('nada', new Set())).toThrow(AiError);
  });
});

describe('createDraftAnalyzer', () => {
  it('manda el draft a Claude con la llave y devuelve el consejo', async () => {
    let seen: {
      headers: Record<string, string>;
      body: { model: string; messages: { content: string }[] };
    } | null = null;
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      seen = {
        headers: init.headers as Record<string, string>,
        body: JSON.parse(init.body as string),
      };
      return new Response(
        JSON.stringify({
          content: [
            { type: 'text', text: '{"summary":"ok","ranking":[{"brawler":"AMBER","reason":"z"}]}' },
          ],
        }),
      );
    }) as unknown as typeof fetch;

    const analyzer = createDraftAnalyzer({ apiKey: 'k', model: 'm', fetch: fakeFetch });
    const advice = await analyzer.analyze(
      newDraft('gemGrab', 'Mina Rocosa'),
      { type: 'pick', team: 'A' },
      candidates,
    );

    expect(advice.ranking[0]?.brawler).toBe('AMBER');
    expect(seen!.headers['x-api-key']).toBe('k');
    expect(seen!.body.model).toBe('m');
    expect(seen!.body.messages[0]!.content).toContain('Mina Rocosa');
  });

  it('incluye el mensaje de Claude en el error', async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ error: { message: 'credit balance is too low' } }), {
        status: 400,
      })) as unknown as typeof fetch;
    const err = await createDraftAnalyzer({ apiKey: 'k', fetch: fakeFetch })
      .analyze(newDraft('gemGrab'), { type: 'pick', team: 'A' }, candidates)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiError);
    expect((err as AiError).detail).toBe('credit balance is too low');
  });

  it('convierte un error HTTP en AiError', async () => {
    const fakeFetch = (async () => new Response('', { status: 529 })) as unknown as typeof fetch;
    await expect(
      createDraftAnalyzer({ apiKey: 'k', fetch: fakeFetch }).analyze(
        newDraft('gemGrab'),
        { type: 'pick', team: 'A' },
        candidates,
      ),
    ).rejects.toThrow(AiError);
  });
});
