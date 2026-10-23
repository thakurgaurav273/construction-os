import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SecretBoxService, keyHint } from '../src/common/crypto/secret-box.service';
import { GeminiProvider } from '../src/modules/ai/providers/gemini.provider';
import { GroqProvider } from '../src/modules/ai/providers/openai-compatible.provider';
import { AiProviderError } from '../src/modules/ai/providers/ai-provider';
import { parseInsights } from '../src/modules/ai/ai-features.service';
import { conversationTitle } from '../src/modules/ai/ai-conversations.service';
import { sanitizeForAudit } from '../src/modules/audit/audit-metadata';

const configWith = (values: Record<string, string>): ConfigService => ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('secret box', () => {
  const box = new SecretBoxService(configWith({ AI_KEYS_ENCRYPTION_KEY: randomBytes(32).toString('base64') }));

  it('round-trips and never stores the plain key', () => {
    const sealed = box.encrypt('gsk_live_secret_1234');
    assert.ok(!sealed.includes('gsk_live_secret_1234'));
    assert.equal(box.decrypt(sealed), 'gsk_live_secret_1234');
    assert.notEqual(box.encrypt('same'), box.encrypt('same'), 'random IV per value');
  });

  it('detects tampering', () => {
    const [version, iv, tag, data] = box.encrypt('abc').split(':');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 1;
    assert.throws(() => box.decrypt([version, iv, tag, flipped.toString('base64')].join(':')));
  });

  it('refuses a malformed key and works without one only until a key is needed', () => {
    assert.throws(() => new SecretBoxService(configWith({ AI_KEYS_ENCRYPTION_KEY: 'too-short' })), /32 random bytes/);
    const unconfigured = new SecretBoxService(configWith({}));
    assert.equal(unconfigured.isConfigured, false);
    assert.throws(() => unconfigured.encrypt('x'));
  });

  it('shows only the last four characters', () => {
    assert.equal(keyHint('AIzaSyD-very-secret-WXYZ'), '…WXYZ');
  });
});

describe('provider adapters', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });

  function mockFetch(status: number, body: unknown): { calls: { url: string; init: RequestInit }[] } {
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    return { calls };
  }

  it('Groq: OpenAI-style request with bearer key and usage', async () => {
    const { calls } = mockFetch(200, { choices: [{ message: { content: ' Hello ' } }], usage: { prompt_tokens: 12, completion_tokens: 3 } });
    const groq = new GroqProvider('https://api.groq.test/openai/v1', 'llama-3.3-70b-versatile');
    const answer = await groq.complete('gsk_key', { model: 'llama-3.3-70b-versatile', maxTokens: 50, messages: [{ role: 'user', content: 'Hi' }] });
    assert.deepEqual(answer, { text: 'Hello', promptTokens: 12, completionTokens: 3 });
    assert.equal(calls[0].url, 'https://api.groq.test/openai/v1/chat/completions');
    assert.equal((calls[0].init.headers as Record<string, string>).authorization, 'Bearer gsk_key');
  });

  it('Gemini: key in a header (never the URL), system prompt separated, roles mapped', async () => {
    const { calls } = mockFetch(200, { candidates: [{ content: { parts: [{ text: 'Done' }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1 } });
    const gemini = new GeminiProvider('https://gemini.test', 'gemini-2.5-flash');
    await gemini.complete('AIza_key', {
      model: 'gemini-2.5-flash',
      maxTokens: 20,
      messages: [{ role: 'system', content: 'Be brief' }, { role: 'user', content: 'Q1' }, { role: 'assistant', content: 'A1' }, { role: 'user', content: 'Q2' }],
    });
    assert.ok(!calls[0].url.includes('AIza_key'));
    assert.equal((calls[0].init.headers as Record<string, string>)['x-goog-api-key'], 'AIza_key');
    const body = JSON.parse(String(calls[0].init.body));
    assert.equal(body.systemInstruction.parts[0].text, 'Be brief');
    assert.deepEqual(body.contents.map((content: { role: string }) => content.role), ['user', 'model', 'user']);
  });

  it('maps provider failures to actionable codes without leaking the key', async () => {
    mockFetch(401, { error: { message: 'Invalid API Key' } });
    await assert.rejects(new GroqProvider('https://x', 'm').complete('secret-key', { model: 'm', maxTokens: 5, messages: [] }), (error: unknown) => {
      assert.ok(error instanceof AiProviderError);
      assert.equal(error.code, 'INVALID_KEY');
      assert.ok(!error.message.includes('secret-key'));
      return true;
    });
    mockFetch(400, { error: { message: 'API key not valid. Please pass a valid API key.' } });
    await assert.rejects(new GeminiProvider('https://x', 'm').complete('k', { model: 'm', maxTokens: 5, messages: [] }), { code: 'INVALID_KEY' });
    mockFetch(429, { error: { message: 'quota' } });
    await assert.rejects(new GroqProvider('https://x', 'm').complete('k', { model: 'm', maxTokens: 5, messages: [] }), { code: 'RATE_LIMITED' });
    mockFetch(404, { error: { message: 'model not found' } });
    await assert.rejects(new GroqProvider('https://x', 'm').complete('k', { model: 'm', maxTokens: 5, messages: [] }), { code: 'MODEL_NOT_FOUND' });
  });
});

describe('insight parsing', () => {
  it('extracts the array from fenced or chatty output and drops bad items', () => {
    const text = 'Here you go:\n```json\n[{"title":"Budget overrun","detail":"Spent 112%.","severity":"critical","area":"budget","project":"Tower A"},{"title":""},{"title":"X","detail":"Y","severity":"panic"}]\n```';
    const insights = parseInsights(text);
    assert.equal(insights.length, 2);
    assert.equal(insights[0].severity, 'critical');
    assert.equal(insights[1].severity, 'info', 'unknown severity falls back to info');
  });

  it('returns nothing for non-JSON output', () => {
    assert.deepEqual(parseInsights('Sorry, I cannot help with that.'), []);
  });
});

describe('audit redaction of AI keys', () => {
  it('never stores provider keys', () => {
    assert.deepEqual(sanitizeForAudit({ apiKey: 'gsk_x', api_key: 'y', model: 'llama' }), { apiKey: '[redacted]', api_key: '[redacted]', model: 'llama' });
  });
});

describe('brand colour contrast', () => {
  it('accepts dark brand colours and rejects ones unreadable on white', async () => {
    const { contrastRatio, MIN_BRAND_CONTRAST } = await import('../src/common/branding/brand-color');
    assert.ok(contrastRatio('#1D4ED8', '#FFFFFF') >= MIN_BRAND_CONTRAST);
    assert.ok(contrastRatio('#FACC15', '#FFFFFF') < MIN_BRAND_CONTRAST, 'yellow is too light');
    assert.equal(Math.round(contrastRatio('#000000', '#FFFFFF')), 21);
  });
});

describe('conversation titles', () => {
  it('uses the first question on one line', () => {
    assert.equal(conversationTitle('  Which POs\n are   overdue? '), 'Which POs are overdue?');
  });

  it('shortens long questions to 80 characters', () => {
    const title = conversationTitle('a'.repeat(200));
    assert.equal(title.length, 80);
    assert.ok(title.endsWith('…'));
  });
});
