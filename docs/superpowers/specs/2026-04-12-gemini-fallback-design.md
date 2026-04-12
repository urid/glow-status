# Gemini Fallback for AI Classification

**Date:** 2026-04-12
**Status:** Approved

## Summary

Add Google Gemini as a fallback AI provider for Slack message classification. The app currently uses Anthropic Claude exclusively. After this change, it will use Anthropic if `ANTHROPIC_API_KEY` is set, Gemini if `GEMINI_API_KEY` is set, or skip classification if neither is set.

## Architecture

No new modules. Changes are confined to `backend/src/services/ai.service.ts` and `backend/src/index.ts`.

### Provider selection logic

```
if ANTHROPIC_API_KEY → classify with Anthropic (claude-opus-4-6)
else if GEMINI_API_KEY → classify with Gemini (gemini-2.0-flash)
else → return []
```

Only one provider is ever used per refresh. Anthropic takes priority.

## Component changes

### `ai.service.ts`

- Function signature changes from `classifySlackMessages(apiKey, channels)` to `classifySlackMessages({ anthropicKey, geminiKey }, channels)`
- System prompt and JSON response parsing are shared between providers
- Gemini call uses `@google/generative-ai` SDK, `generateContent()` with the same system prompt injected as a system instruction
- Both providers return the same `SlackItem[]` shape

### `index.ts`

- Reads `process.env.ANTHROPIC_API_KEY` and `process.env.GEMINI_API_KEY` (both optional)
- Passes `{ anthropicKey, geminiKey }` to `classifySlackMessages`
- Startup log: warns "no AI key set — Slack classification will be skipped" if both absent; otherwise logs which provider is active

### `.env` / `.env.example`

- Add `GEMINI_API_KEY=` line

### `backend/package.json`

- Add `@google/generative-ai` dependency

## Error handling

- If the active provider throws, the error propagates up to the `/api/refresh` handler as before (returns 500)
- No automatic cross-provider retry on failure — if Anthropic is set but fails, we do not fall back to Gemini

## Out of scope

- Streaming responses
- Per-request provider selection
- Storing which provider was used in the DB snapshot
