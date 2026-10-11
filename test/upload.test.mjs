import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const connection = { url: 'https://outside.example', token: 'test-only-access-code-24-characters' };

function fixture(uploadAsync, timers = {}) {
  let captured;
  let cancellations = 0;
  const exports = {};
  runInNewContext(source, {
    exports, URL, AbortController, setTimeout, clearTimeout, ...timers,
    // The old URI object is unsupported by Expo fetch. Neither API should be used.
    FormData: class { constructor() { throw new Error('Unsupported FormDataPart implementation'); } },
    fetch: () => { throw new Error('Recording must use the native uploader'); },
    require: (name) => {
      assert.equal(name, 'expo-file-system/legacy');
      return {
        FileSystemUploadType: { MULTIPART: 1 },
        FileSystemSessionType: { FOREGROUND: 0 },
        createUploadTask: (url, uri, options) => {
          captured = { url, uri, options };
          return { uploadAsync, cancelAsync: async () => { cancellations++; } };
        },
      };
    },
  });
  return { transcribe: () => exports.transcribeRecording(connection, 'file:///recording.m4a'), captured: () => captured, cancellations: () => cancellations };
}

test('recordings bypass unsupported fetch FormData and use the authenticated audio multipart field', async () => {
  const upload = fixture(async () => ({ status: 200, body: JSON.stringify({ text: '  I can hear leaves.  ' }) }));
  assert.equal(await upload.transcribe(), 'I can hear leaves.');
  const { url, uri, options } = upload.captured();
  assert.equal(url, `${connection.url}/api/transcribe`);
  assert.equal(uri, 'file:///recording.m4a');
  assert.equal(options.fieldName, 'audio');
  assert.equal(options.mimeType, 'audio/mp4');
  assert.equal(options.httpMethod, 'POST');
  assert.equal(options.uploadType, 1);
  assert.equal(options.sessionType, 0);
  assert.equal(options.headers.Authorization, `Bearer ${connection.token}`);
  assert.deepEqual(Object.keys(options.headers), ['Authorization']);
});

test('recording upload preserves server errors and rejects empty or malformed transcripts', async () => {
  for (const [result, message] of [
    [{ status: 401, body: JSON.stringify({ error: 'The access code is incorrect.' }) }, /access code is incorrect/],
    [{ status: 200, body: JSON.stringify({ text: '  ' }) }, /No speech was detected/],
    [{ status: 502, body: '<html>Bad Gateway</html>' }, /Could not read the server response/],
  ]) {
    await assert.rejects(fixture(async () => result).transcribe(), message);
  }
});

test('native upload failures give a useful message without exposing native details', async () => {
  await assert.rejects(fixture(async () => { throw new Error('internal native error'); }).transcribe(), /Could not upload your recording/);
});

test('a timed-out recording upload cancels the native task and clears its timer', async () => {
  let expire;
  let cleared = false;
  const upload = fixture(async () => { expire(); return null; }, {
    setTimeout: (callback, delay) => { assert.equal(delay, 75_000); expire = callback; return 123; },
    clearTimeout: (id) => { assert.equal(id, 123); cleared = true; },
  });
  await assert.rejects(upload.transcribe(), /taking too long/);
  assert.equal(upload.cancellations(), 1);
  assert.equal(cleared, true);
});
