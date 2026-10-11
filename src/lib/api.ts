import * as FileSystem from 'expo-file-system/legacy';

export type Connection = { url: string; token: string };
export type CheckIn = { minutes: 3 | 5 | 10; feeling: 'Overwhelmed' | 'Restless' | 'Tired' | 'Just pausing'; surroundings: string; position: 'Sitting' | 'Walking'; guidance: 'Less' | 'More' };
export type Session = { title: string; seconds: number; uri?: string; sample: boolean };

export function validateConnection(connection: Connection) {
  let url: URL;
  try { url = new URL(connection.url); } catch { throw new Error('Enter a complete server address, starting with https://.'); }
  const octets = url.hostname.split('.').map(Number);
  const ipv4 = octets.length === 4 && octets.every(n => Number.isInteger(n) && n >= 0 && n <= 255);
  const local = url.hostname === 'localhost' || (ipv4 && (octets[0] === 127 || octets[0] === 10 || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)));
  if (url.protocol !== 'https:' && !(__DEV__ && local && url.protocol === 'http:')) throw new Error('Use an HTTPS server address.');
  if (url.username || url.password || url.search || url.hash) throw new Error('Use the server address without passwords or extra parameters.');
  if (connection.token.trim().length < 24) throw new Error('Enter the access code from your Outside server.');
  return { url: connection.url.trim().replace(/\/+$/, ''), token: connection.token.trim() };
}

async function request(connection: Connection, path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), path === '/api/sessions' ? 360_000 : 75_000);
  try {
    const response = await fetch(`${connection.url}${path}`, { ...options, headers: { ...options.headers, Authorization: `Bearer ${connection.token}` }, signal: controller.signal });
    const data = response.status === 204 ? undefined : await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not reach Outside. Please try again.');
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('This is taking too long. Please try again.');
    if (error instanceof TypeError) throw new Error('Could not reach the server. Check your connection and App setup.');
    throw error;
  } finally { clearTimeout(timeout); }
}

export type Practice = 'breathing' | 'body' | 'listening' | 'rest' | 'none';
export type ConversationTurn = { id: string; turn: number; text: string; mode: 'listen' | 'quiet' | 'finish'; practice: Practice; quietSeconds: number; remainingSeconds: number; audioPath: string; uri: string };
export async function conversationTurn(connection: Connection, current?: ConversationTurn, message?: string, startPractice: Practice = 'none'): Promise<ConversationTurn> {
  const data = await request(connection, current ? `/api/conversations/${current.id}/turns` : '/api/conversations', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(current ? { turn: current.turn, action: message ? 'reply' : 'continue', ...(message ? { message } : {}) } : { practice: startPractice }),
  });
  if (!/^[a-f0-9-]{36}$/.test(data.id) || !Number.isInteger(data.turn) || typeof data.text !== 'string' || !['listen', 'quiet', 'finish'].includes(data.mode) || !Number.isFinite(data.remainingSeconds) || !Number.isFinite(data.quietSeconds) || !new RegExp(`^/api/conversations/${data.id}/audio/[a-f0-9-]{36}$`).test(data.audioPath)) throw new Error('The server returned an invalid spoken reply. Please start a new break.');
  const uri = `${FileSystem.cacheDirectory}outside-conversation-${data.id}-${data.turn}.mp3`;
  try {
    const download = await FileSystem.downloadAsync(`${connection.url}${data.audioPath}`, uri, { headers: { Authorization: `Bearer ${connection.token}` } });
    if (download.status !== 200) throw new Error('The spoken reply could not be downloaded. Please try again.');
    return { ...data, practice: ['breathing', 'body', 'listening', 'rest'].includes(data.practice) ? data.practice : 'none', uri };
  } catch (error) { await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); throw error; }
}
export async function endConversation(connection: Connection, id: string) {
  await request(connection, `/api/conversations/${id}`, { method: 'DELETE' });
}

export async function checkConnection(connection: Connection) {
  await request(connection, '/api/ready');
}
export async function transcribeRecording(connection: Connection, uri: string): Promise<string> {
  // Expo's fetch FormData rejects React Native's legacy { uri, name, type } parts.
  // Upload the recording directly; the native uploader creates the multipart boundary.
  const upload = FileSystem.createUploadTask(`${connection.url}/api/transcribe`, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'audio',
    mimeType: 'audio/mp4',
    sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
    headers: { Authorization: `Bearer ${connection.token}` },
  });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    void upload.cancelAsync().catch(() => {});
  }, 75_000);
  try {
    let result: FileSystem.FileSystemUploadResult | undefined | null;
    try { result = await upload.uploadAsync(); } catch {
      throw new Error(timedOut ? 'This is taking too long. Please try again.' : 'Could not upload your recording. Check your connection and try again, or type your reply.');
    }
    if (timedOut) throw new Error('This is taking too long. Please try again.');
    if (!result) throw new Error('The recording upload was cancelled. Please try again.');
    let response: { text?: unknown; error?: unknown } | null;
    try { response = JSON.parse(result.body); } catch {
      throw new Error('Could not read the server response. Please try again, or type your reply.');
    }
    if (result.status < 200 || result.status >= 300) throw new Error(typeof response?.error === 'string' ? response.error : 'Could not transcribe your recording. Please try again, or type your reply.');
    if (typeof response?.text !== 'string' || !response.text.trim()) throw new Error('No speech was detected. Please try again, or type your reply.');
    return response.text.trim();
  } finally { clearTimeout(timeout); }
}
export async function prepareSession(connection: Connection, checkIn: CheckIn): Promise<Session> {
  const data = await request(connection, '/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(checkIn) });
  if (!/^[a-f0-9-]{36}$/.test(data.id) || typeof data.title !== 'string' || data.seconds !== checkIn.minutes * 60 || data.audioPath !== `/api/audio/${data.id}`) throw new Error('The server returned an invalid break. Please try again.');
  const uri = `${FileSystem.cacheDirectory}outside-${data.id}.mp3`;
  try {
    const download = await FileSystem.downloadAsync(`${connection.url}${data.audioPath}`, uri, { headers: { Authorization: `Bearer ${connection.token}` } });
    if (download.status !== 200) throw new Error('The audio could not be downloaded. Please try again.');
    return { title: data.title, seconds: data.seconds, uri: download.uri, sample: false };
  } catch (error) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    throw error;
  }
}
