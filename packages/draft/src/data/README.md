# Datos del método de draft

Todo lo que cambia con cada temporada está aquí, separado del motor (`../rules.ts`, `../engine.ts`):

- `profiles.ts`: clases (`control`, `tank`, `assassin`, `antitank`, `antiassassin`, `support`, `sniper`, `thrower`) y etiquetas por brawler. Un brawler puede tener varias clases.
- `maps.ts`: etiquetas de cada mapa (`muros`, `arbustos`, `agua`, `abierto`, `lineas-largas`) y cuánto favorece cada una a una clase o etiqueta.
- `templates.ts`: niveles por modo, sinergias y counters individuales.

## Cambiar los datos sin tocar el motor

```ts
import { setDraftData, validateDraftData, getDraftData } from '@brawlstats/draft';

const errors = validateDraftData(nuevosDatos); // [] si es válido
setDraftData(nuevosDatos); // lanza si no es válido; sin argumento vuelve a los de fábrica
```

`DraftData` es JSON plano, pensado para que una IA o un panel lo genere y se valide antes de usarlo.
