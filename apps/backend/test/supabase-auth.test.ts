import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { SupabaseTokenVerifier } from '../src/common/supabase-auth.js';

// Supabase projects with the new signing keys publish them at /auth/v1/.well-known/jwks.json.
let server: Server;
let url: string;
let sign: (claims: Record<string, unknown>, iss?: string) => Promise<string>;

before(async () => {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' };
  server = createServer((req, res) => {
    if (req.url !== '/auth/v1/.well-known/jwks.json') return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((r) => server.listen(0, r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  sign = (claims, iss = `${url}/auth/v1`) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setSubject('7b0c2b5e-1f0a-4c1e-9d6a-3a1f2e4b5c6d')
      .setAudience('authenticated')
      .setIssuer(iss)
      .setExpirationTime('1h')
      .sign(privateKey);
});
after(() => server.close());

test('acepta un token firmado con las llaves del proyecto', async () => {
  const claims = await new SupabaseTokenVerifier({ supabaseUrl: url }).verify(await sign({ role: 'authenticated', email: 'a@b.co' }));
  assert.equal(claims.email, 'a@b.co');
});

test('rechaza la llave anónima y tokens de otro proyecto', async () => {
  const v = new SupabaseTokenVerifier({ supabaseUrl: url });
  await assert.rejects(v.verify(await sign({ role: 'anon' })));
  await assert.rejects(v.verify(await sign({ role: 'authenticated' }, 'https://otro.supabase.co/auth/v1')));
});

test('sin secreto configurado no acepta HS256', async () => {
  const forged = await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('x')
    .setAudience('authenticated')
    .setIssuer(`${url}/auth/v1`)
    .sign(new TextEncoder().encode('cualquier-secreto-de-32-caracteres-o-mas'));
  await assert.rejects(new SupabaseTokenVerifier({ supabaseUrl: url }).verify(forged));
});
