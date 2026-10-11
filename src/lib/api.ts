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

export type ConversationTurn = { id: string; turn: number; text: string; mode: 'listen' | 'quiet' | 'finish'; quietSeconds: number; remainingSeconds: number; audioPath: string; uri: string };
export async function conversationTurn(connection: Connection, current?: ConversationTurn, message?: string): Promise<ConversationTurn> {
  const data = await request(connection, current ? `/api/conversations/${current.id}/turns` : '/api/conversations', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(current ? { turn: current.turn, action: message ? 'reply' : 'continue', ...(message ? { message } : {}) } : {}),
  });
  if (!/^[a-f0-9-]{36}$/.test(data.id) || !Number.isInteger(data.turn) || typeof data.text !== 'string' || !['listen', 'quiet', 'finish'].includes(data.mode) || !Number.isFinite(data.remainingSeconds) || !Number.isFinite(data.quietSeconds) || !new RegExp(`^/api/conversations/${data.id}/audio/[a-f0-9-]{36}$`).test(data.audioPath)) throw new Error('The server returned an invalid spoken reply. Please start a new break.');
  const uri = `${FileSystem.cacheDirectory}outside-conversation-${data.id}-${data.turn}.mp3`;
  try {
    const download = await FileSystem.downloadAsync(`${connection.url}${data.audioPath}`, uri, { headers: { Authorization: `Bearer ${connection.token}` } });
    if (download.status !== 200) throw new Error('The spoken reply could not be downloaded. Please try again.');
    return { ...data, uri };
  } catch (error) { await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); throw error; }
}
export async function endConversation(connection: Connection, id: string) {
  await request(connection, `/api/conversations/${id}`, { method: 'DELETE' });
}

export async function checkConnection(connection: Connection) {
  await request(connection, '/api/ready');
}
export async function transcribeRecording(connection: Connection, uri: string): Promise<string> {
  const body = new FormData();
  // React Native's FormData accepts native file objects.
  body.append('audio', { uri, name: 'check-in.m4a', type: 'audio/mp4' } as unknown as Blob);
  const response = await request(connection, '/api/transcribe', { method: 'POST', body });
  if (typeof response.text !== 'string') throw new Error('Could not read your check-in. Please type it instead.');
  return response.text;
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
