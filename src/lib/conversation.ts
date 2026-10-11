import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { conversationTurn, endConversation, transcribeRecording, type Connection, type ConversationTurn, type Practice } from './api';
import { newListeningState, replyFinished, updateListening } from './listening';

type Phase = 'ready' | 'thinking' | 'loading' | 'speaking' | 'listening' | 'quiet' | 'paused' | 'finished';
const playbackMode = { playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: false, interruptionMode: 'doNotMix' as const };
export function useConversation(connection: Connection | null) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [heard, setHeard] = useState('');
  const [remaining, setRemaining] = useState(180);
  const [pending, setPending] = useState(false);
  const [practice, setPractice] = useState<Practice>('none');
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, isMeteringEnabled: true });
  const recording = useAudioRecorderState(recorder, 100);
  const live = useRef(true);
  const phaseRef = useRef<Phase>('ready');
  const turn = useRef<ConversationTurn | undefined>(undefined);
  const epoch = useRef(0);
  const busy = useRef(false);
  const recordingActive = useRef(false);
  const listening = useRef(newListeningState());
  const quietUntil = useRef(0);
  const deadline = useRef(0);
  const needsPlayback = useRef(false);
  const files = useRef(new Set<string>());
  const muted = useRef(false);
  const [micOff, setMicOff] = useState(false);
  // Effects and native listeners call the current actions without stale closures.
  const actions = useRef({ afterSpeech: async () => {}, finishReply: async () => {}, pause: async () => {}, finish: async () => {} });
  function change(next: Phase) { phaseRef.current = next; if (live.current) setPhase(next); }
  async function discard() {
    if (!recordingActive.current) return;
    recordingActive.current = false;
    try { await recorder.stop(); } catch {}
    try { if (recorder.uri) await FileSystem.deleteAsync(recorder.uri, { idempotent: true }); } catch {}
    await setAudioModeAsync(playbackMode).catch(() => {});
  }
  async function finish() {
    epoch.current++; try { player.pause(); } catch {} change('finished');
    await discard().catch(() => {});
    if (live.current) { setText(''); setHeard(''); }
    const id = turn.current?.id; turn.current = undefined;
    if (connection && id) await endConversation(connection, id).catch(() => {});
    for (const file of files.current) await FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {});
    files.current.clear();
  }
  async function pause() {
    if (['ready', 'finished'].includes(phaseRef.current)) return;
    if (['thinking', 'loading', 'speaking'].includes(phaseRef.current)) needsPlayback.current = true;
    epoch.current++; player.pause(); change('paused'); await discard();
  }
  async function listen(quiet = false) {
    if (!connection || !live.current || phaseRef.current === 'finished') return;
    const run = epoch.current;
    listening.current = newListeningState();
    if (quiet) quietUntil.current = Date.now() + (turn.current?.quietSeconds || 20) * 1000;
    if (muted.current) { change(quiet ? 'quiet' : 'paused'); return; }
    try {
      await setAudioModeAsync({ ...playbackMode, allowsRecording: true });
      if (run !== epoch.current) return;
      await recorder.prepareToRecordAsync();
      if (run !== epoch.current) { await recorder.stop().catch(() => {}); return; }
      recorder.record(); recordingActive.current = true;
      change(quiet ? 'quiet' : 'listening');
    } catch { if (run === epoch.current && live.current) { change('paused'); setError('The microphone could not start. You can type a reply below.'); } }
  }
  async function afterSpeech() {
    const current = turn.current;
    if (!current) return;
    if (current.mode === 'finish') { await finish(); return; }
    await listen(current.mode === 'quiet');
  }
  async function ask(message?: string, startPractice: Practice = 'none') {
    if (!connection || busy.current) return;
    busy.current = true;
    setPending(true);
    const run = ++epoch.current;
    player.pause(); change('thinking'); setError('');
    if (message) setHeard(message);
    await discard();
    try {
      const next = await conversationTurn(connection, turn.current, message, startPractice);
      files.current.add(next.uri);
      if (!live.current || phaseRef.current === 'finished') {
        await endConversation(connection, next.id).catch(() => {});
        await FileSystem.deleteAsync(next.uri, { idempotent: true }).catch(() => {});
        return;
      }
      turn.current = next;
      needsPlayback.current = true;
      if (!deadline.current) deadline.current = Date.now() + next.remainingSeconds * 1000;
      deadline.current = Math.min(deadline.current, Date.now() + next.remainingSeconds * 1000);
      setText(next.text); setPractice(next.practice); if (message) setHeard(message);
      if (run !== epoch.current) return;
      await setAudioModeAsync(playbackMode);
      if (run !== epoch.current) return;
      player.replace({ uri: next.uri }); change('loading');
    } catch (err) {
      if (run === epoch.current && live.current) { change('paused'); setError(err instanceof Error ? err.message : 'The reply could not be prepared. Please try again.'); }
    } finally { busy.current = false; if (live.current) setPending(false); }
  }
  async function finishReply() {
    if (!connection || !recordingActive.current || busy.current) return;
    busy.current = true;
    setPending(true);
    const run = ++epoch.current;
    change('thinking'); setError('');
    let uri: string | null = null;
    try {
      recordingActive.current = false;
      await recorder.stop(); uri = recorder.uri;
      await setAudioModeAsync(playbackMode);
      if (run !== epoch.current || !live.current) return;
      if (!uri) throw new Error('No recording was captured. Please try again or type a reply.');
      const message = await transcribeRecording(connection, uri);
      if (run !== epoch.current || !live.current) return;
      busy.current = false; await ask(message);
    } catch (err) { if (run === epoch.current && live.current) { change('paused'); setError(err instanceof Error ? err.message : 'Could not hear your reply. Please try again.'); } }
    finally { busy.current = false; if (live.current) setPending(false); if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); }
  }
  async function start(useVoice = true, startPractice: Practice = 'breathing') {
    if (!connection) { setError('Connect Outside in App setup first.'); return; }
    if (busy.current) return;
    const permission = useVoice ? await AudioModule.requestRecordingPermissionsAsync() : { granted: false };
    if (!live.current) return;
    muted.current = !permission.granted; setMicOff(muted.current);
    if (!permission.granted) setError('Microphone access is off. You can type your replies.');
    await ask(undefined, startPractice);
  }
  async function interrupt() {
    if (busy.current || !turn.current) return;
    needsPlayback.current = false;
    epoch.current++; player.pause(); await discard(); await listen();
  }
  async function resume() {
    if (busy.current) return;
    setError('');
    if (!turn.current) { await start(); return; }
    if (deadline.current <= Date.now()) { await finish(); return; }
    if (needsPlayback.current) {
      await setAudioModeAsync(playbackMode);
      player.replace({ uri: turn.current.uri }); change('loading'); return;
    }
    await listen(turn.current.mode === 'quiet');
  }
  async function toggleMic() {
    if (muted.current) {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) { setError('Microphone access is off. You can keep typing your replies.'); return; }
    }
    muted.current = !muted.current; setMicOff(muted.current);
    if (muted.current) { await discard(); if (phaseRef.current === 'listening') change('paused'); }
    else if (['paused', 'quiet'].includes(phaseRef.current)) await listen(phaseRef.current === 'quiet');
  }
  useEffect(() => { actions.current = { afterSpeech, finishReply, pause, finish }; });

  useEffect(() => {
    live.current = true;
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') void actions.current.pause(); });
    const completed = player.addListener('playbackStatusUpdate', event => { if (event.didJustFinish && phaseRef.current === 'speaking') void actions.current.afterSpeech(); });
    return () => {
      live.current = false; subscription.remove(); completed.remove();
      void actions.current.finish().catch(() => {});
    };
    // Native instances are stable; callbacks above are kept current through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (phase === 'loading' && status.isLoaded) { needsPlayback.current = false; player.play(); change('speaking'); }
  }, [phase, status.isLoaded, player]);
  useEffect(() => {
    if (phase !== 'loading') return;
    const timer = setTimeout(() => {
      if (phaseRef.current === 'loading') { change('paused'); setError('The spoken reply could not load. Try resuming, or type a reply.'); }
    }, 15_000);
    return () => clearTimeout(timer);
  }, [phase]);
  useEffect(() => {
    if (!recording.isRecording || !recordingActive.current || !['listening', 'quiet'].includes(phaseRef.current)) return;
    listening.current = updateListening(listening.current, recording.metering, recording.durationMillis);
    if (replyFinished(listening.current, recording.durationMillis) || (listening.current.speechAt !== null && recording.durationMillis >= 60_000)) void actions.current.finishReply();
    else if (phaseRef.current === 'listening' && recording.durationMillis >= 10_000 && listening.current.speechAt === null) void actions.current.pause();
  }, [recording.isRecording, recording.metering, recording.durationMillis]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!deadline.current || ['ready', 'finished'].includes(phaseRef.current)) return;
      const seconds = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) { void actions.current.finish(); return; }
      if (phaseRef.current === 'quiet' && Date.now() >= quietUntil.current && !busy.current && listening.current.speechAt === null) void ask();
    }, 250);
    return () => clearInterval(timer);
    // ask uses refs for the active turn, phase and operation lock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection]);
  return { phase, error, text, heard, remaining, pending, practice, micOff, start, pause, finish, interrupt, resume, toggleMic, finishReply, send: ask };
}
