import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { type CheckIn, type Connection, type Session, prepareSession, validateConnection } from './api';

export const defaultCheckIn: CheckIn = { minutes: 5, feeling: 'Overwhelmed', surroundings: '', position: 'Sitting', guidance: 'Less' };
function useOutsideState() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [storageError, setStorageError] = useState('');
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  useEffect(() => {
    SecureStore.getItemAsync('outside.connection').then(raw => {
      if (raw) { try { setConnection(validateConnection(JSON.parse(raw))); } catch { setStorageError('Your saved connection needs updating in App setup.'); } }
    }).catch(() => setStorageError('App setup could not be loaded. You can still try the sample.')).finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', event => {
      if (event.didJustFinish && started) setCompleted(true);
    });
    return () => subscription.remove();
  }, [player, started]);

  function pauseSession() {
    player.pause();
    if (Constants.executionEnvironment !== 'storeClient') player.setActiveForLockScreen(false);
  }
  async function clearSession() {
    pauseSession();
    player.replace(null);
    if (session?.uri) await FileSystem.deleteAsync(session.uri, { idempotent: true });
    setSession(null); setStarted(false); setCompleted(false);
  }
  async function loadSample() {
    await clearSession();
    setSession({ title: 'A little room to breathe', seconds: 180, sample: true });
    player.replace(require('../../assets/audio/sample.mp3'));
  }
  async function createSession() {
    if (!connection) throw new Error('Open App setup to connect Outside, or try the sample first.');
    await clearSession();
    const result = await prepareSession(connection, checkIn);
    setSession(result);
    player.replace({ uri: result.uri! });
  }
  async function togglePlayback() {
    if (!session || !status.isLoaded) return;
    if (status.playing) { player.pause(); return; }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
    if (completed) { await player.seekTo(0); setCompleted(false); }
    if (Constants.executionEnvironment !== 'storeClient') player.setActiveForLockScreen(true, { title: session.title, artist: 'Outside', albumTitle: session.sample ? 'Sample break' : 'Your nature break' });
    player.play(); setStarted(true);
  }
  async function saveConnection(value: Connection | null) {
    if (value) {
      const validated = validateConnection(value);
      await SecureStore.setItemAsync('outside.connection', JSON.stringify(validated));
      setConnection(validated);
    } else {
      await SecureStore.deleteItemAsync('outside.connection'); setConnection(null);
    }
    setStorageError('');
  }
  return { connection, loaded, storageError, session, checkIn, setCheckIn, status, started, completed, pauseSession, clearSession, loadSample, createSession, togglePlayback, saveConnection };
}
type OutsideState = ReturnType<typeof useOutsideState>;
const OutsideContext = createContext<OutsideState | null>(null);
export function OutsideProvider({ children }: { children: ReactNode }) {
  const value = useOutsideState();
  return <OutsideContext.Provider value={value}>{children}</OutsideContext.Provider>;
}
export function useOutside() {
  const value = useContext(OutsideContext);
  if (!value) throw new Error('OutsideProvider is missing.');
  return value;
}
