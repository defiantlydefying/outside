import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Button, Chip, Screen, styles } from '../components/ui';
import { useOutside } from '../lib/outside';
import { transcribeRecording } from '../lib/api';

export default function CheckInScreen() {
  const { checkIn, setCheckIn, connection, createSession } = useOutside();
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder);
  const stopping = useRef(false);
  const mounted = useRef(true);
  const active = useRef(false);
  const audioMode = { playsInSilentMode: true, interruptionMode: 'doNotMix' as const, shouldPlayInBackground: true, allowsRecording: false };

  async function discardRecording() {
    if (!active.current || stopping.current) return;
    stopping.current = true;
    try {
      await recorder.stop(); active.current = false;
      if (recorder.uri) await FileSystem.deleteAsync(recorder.uri, { idempotent: true });
      await setAudioModeAsync(audioMode);
      if (mounted.current) setError('Recording stopped when you left this screen. Tap to record again.');
    } finally { stopping.current = false; }
  }
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') void discardRecording().catch(() => {}); });
    return () => { mounted.current = false; subscription.remove(); void discardRecording().catch(() => {}); };
    // The recorder instance is stable for this screen's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (recording.isRecording && recording.durationMillis >= 60_000) void stopAndTranscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording.isRecording, recording.durationMillis]);

  async function startRecording() {
    if (!connection) { setError('Connect in App setup to use voice, or type what you notice.'); return; }
    setError('');
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Microphone access is off. You can type your check-in instead.');
      await setAudioModeAsync({ ...audioMode, allowsRecording: true, shouldPlayInBackground: false });
      await recorder.prepareToRecordAsync();
      recorder.record(); active.current = true;
    } catch (err) { setError(err instanceof Error ? err.message : 'Recording could not start. Please type instead.'); await setAudioModeAsync(audioMode); }
  }
  async function stopAndTranscribe() {
    if (!connection || stopping.current || !active.current) return;
    stopping.current = true; setTranscribing(true); setError('');
    let uri: string | null = null;
    try {
      await recorder.stop(); active.current = false; uri = recorder.uri;
      await setAudioModeAsync(audioMode);
      if (!uri) throw new Error('No recording was captured. Please try again.');
      const text = await transcribeRecording(connection, uri);
      if (mounted.current) setCheckIn(previous => ({ ...previous, surroundings: text }));
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : 'Could not transcribe. Please type instead.'); }
    finally {
      if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      stopping.current = false; if (mounted.current) setTranscribing(false);
    }
  }
  function voice() {
    if (recording.isRecording) { void stopAndTranscribe(); return; }
    Alert.alert('Speak your check-in', 'When you finish, your recording is sent to ElevenLabs for transcription. You can review the text before creating your break. The local recording is then deleted.', [
      { text: 'Type instead', style: 'cancel' },
      { text: 'Record', onPress: () => { void startRecording(); } },
    ]);
  }
  async function prepare() {
    setWorking(true); setError('');
    try { await createSession(); router.replace('/session'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not prepare your break. Please try again.'); }
    finally { setWorking(false); }
  }
  const locked = working || transcribing || recording.isRecording;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen>
    <View style={styles.top}><Pressable accessibilityRole="button" disabled={locked} onPress={() => router.back()}><Text style={styles.link}>‹ Back</Text></Pressable><Text style={styles.brand}>outside</Text></View>
    <Text style={styles.eyebrow}>Before you put your phone away</Text>
    <Text style={styles.title}>How are you arriving?</Text>
    <Text style={styles.body}>Find a comfortable outdoor spot. If you’re walking, stop somewhere appropriate to check in.</Text>
    <View pointerEvents={locked ? 'none' : 'auto'}>
      <View style={styles.section}><Text style={styles.label}>I’m feeling…</Text><View style={styles.row}>{(['Overwhelmed', 'Restless', 'Tired', 'Just pausing'] as const).map(feeling => <Chip key={feeling} label={feeling} selected={checkIn.feeling === feeling} onPress={() => setCheckIn(previous => ({ ...previous, feeling }))} />)}</View></View>
      <View style={styles.section}><Text style={styles.label}>I have…</Text><View style={styles.row}>{([3, 5, 10] as const).map(minutes => <Chip key={minutes} label={`${minutes} minutes`} selected={checkIn.minutes === minutes} onPress={() => setCheckIn(previous => ({ ...previous, minutes }))} />)}</View></View>
      <View style={styles.section}><Text style={styles.label}>I’ll be…</Text><View style={styles.row}>{(['Sitting', 'Walking'] as const).map(position => <Chip key={position} label={position} selected={checkIn.position === position} onPress={() => setCheckIn(previous => ({ ...previous, position }))} />)}</View></View>
    </View>
    <View style={styles.section}><Text style={styles.label}>What do you notice around you?</Text><TextInput accessibilityLabel="What you notice around you" style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]} multiline maxLength={500} editable={!locked} placeholder="A breeze, leaves moving, a patch of sky…" placeholderTextColor="#708987" value={checkIn.surroundings} onChangeText={surroundings => setCheckIn(previous => ({ ...previous, surroundings }))} />
      <View style={{ marginTop: 10 }}><Button secondary title={recording.isRecording ? `Finish recording · ${Math.floor(recording.durationMillis / 1000)}s` : transcribing ? 'Listening to your check-in…' : 'Speak instead'} busy={transcribing} disabled={working} onPress={voice} /></View>
      <Text style={[styles.small, { marginTop: 8 }]}>Speaking is optional. Your text goes to the configured Gemma service; narration goes to ElevenLabs.</Text>
    </View>
    <View pointerEvents={locked ? 'none' : 'auto'} style={styles.section}><Text style={styles.label}>How much guidance?</Text><View style={styles.row}>{(['Less', 'More'] as const).map(guidance => <Chip key={guidance} label={guidance === 'Less' ? 'More quiet space' : 'More spoken guidance'} selected={checkIn.guidance === guidance} onPress={() => setCheckIn(previous => ({ ...previous, guidance }))} />)}</View></View>
    {!connection && <View style={[styles.card, styles.section]}><Text style={styles.body}>Personalized breaks need a connection first.</Text><Pressable accessibilityRole="button" onPress={() => router.push('/settings')}><Text style={styles.link}>Open App setup →</Text></Pressable></View>}
    {error ? <Text accessibilityRole="alert" style={[styles.error, styles.section]}>{error}</Text> : null}
    <View style={styles.footer}><Button title={working ? 'Preparing your quiet space…' : 'Prepare my break'} busy={working} disabled={!connection || transcribing || recording.isRecording} onPress={() => { void prepare(); }} />{working && <Text style={styles.small}>Creating and downloading your narration. This can take a few minutes.</Text>}</View>
  </Screen></KeyboardAvoidingView>;
}
