# Data-New Dashboard

Dashboard conversacional: en lugar de un reporte estático de Power BI, entras a la web, ves tus KPIs actualizados y **le preguntas en voz o texto** a los datos (Gemini Live) para que el dashboard se redibuje dinámicamente y te dé conclusiones de negocio.

## Stack

- **Next.js 16 (App Router)** + Tailwind CSS + Shadcn UI
- **Supabase (PostgreSQL)** como fuente de datos, con RLS
- **Recharts** para gráficos dinámicos
- **Gemini Live API** (`gemini-3.1-flash-live-preview`) para voz/texto y Function Calling

## Estructura

```
src/
  app/          # pages y layout
  components/   # UI + componentes del dashboard
  lib/          # utils, clientes supabase/gemini
```

## Arquitectura de la IA (lecciones de ProOnboarding)

- Key de Gemini **nunca en el cliente**: backend mintea token efímero (`POST .../v1beta/auth_tokens`) y el WS se conecta con `?access_token=`.
- En dev, fallback con `?key=` desde `.env.local`.
- `responseModalities:["AUDIO"]` dentro de `setup.generationConfig`.
- Entrada: `realtimeInput.audio.data` (base64 PCM 16 kHz). Salida: PCM 24 kHz vía `AudioBufferSourceNode`.
- Function Calling → comandos de layout (`mostrar_grafico`, `resaltar_kpi`) que el frontend intercepta.

Ver `../GEMINI-LIVE-PLAYBOOK.md` para la bitácora completa de errores y fixes.

## Variables de entorno (`.env.local`)

| Variable | Propósito |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (público, usada en cliente con RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** (nunca en cliente) |
| `GEMINI_API_KEY` | Server-only (dev) o para mint de tokens |

## Comandos

```bash
npm run dev    # desarrollo
npm run build  # build de producción
npm run lint   # eslint
```