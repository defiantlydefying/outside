import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import Constants from 'expo-constants';
import { Button, Landscape, Screen, styles } from '../components/ui';
import { useOutside } from '../lib/outside';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export default function SessionScreen() {
  const { session, status, started, completed, togglePlayback, pauseSession } = useOutside();
  const [error, setError] = useState('');
  if (!session) return <Redirect href="/" />;
  const total = status.duration || session.seconds;
  const remaining = Math.max(0, total - status.currentTime);
  function finish() { pauseSession(); router.replace('/finish'); }
  async function toggle() {
    try { await togglePlayback(); } catch { setError('Audio could not start. Check your volume and try again.'); }
  }
  return <Screen>
    <View style={styles.top}><Text style={styles.brand}>outside</Text><Text style={styles.small}>{session.sample ? 'Sample break' : 'Your nature break'}</Text></View>
    <View style={{ marginTop: 30 }}><Text style={styles.eyebrow}>{completed ? 'You made some space' : started ? 'Nothing else to do here' : 'Your break is ready'}</Text><Text style={styles.title}>{completed ? 'Take your time returning.' : session.title}</Text></View>
    <Landscape progress={completed ? 1 : Math.min(1, status.currentTime / total)} size={285} />
    <Text style={[styles.title, { textAlign: 'center', fontSize: 34 }]}>{completed ? 'Complete' : clock(remaining)}</Text>
    <Text style={[styles.body, { textAlign: 'center' }]}>{completed ? 'There’s no right way to feel afterward.' : 'Keep your eyes open. Listen to the guidance, and let the quiet spaces be quiet.'}</Text>
    <View style={[styles.card, styles.section]}><Text style={styles.label}>Your screen can rest, too.</Text><Text style={styles.body}>Start the audio, then lock your screen and pocket your phone. You can pause from the lock screen.</Text>
      {Constants.executionEnvironment === 'storeClient' && <Text style={styles.small}>You’re trying Outside in Expo Go. Screen-off playback needs testing in a dedicated app build.</Text>}
      {session.sample && <Text style={styles.small}>This fixed 3-minute sample uses a device-generated voice. It does not use your check-in or ElevenLabs.</Text>}
    </View>
    {error ? <Text accessibilityRole="alert" style={[styles.error, styles.section]}>{error}</Text> : null}
    <View style={styles.footer}>
      {completed ? <Button title="Finish my break" onPress={finish} /> : <Button title={!status.isLoaded ? 'Loading audio…' : status.playing ? 'Pause' : started ? 'Continue my break' : 'Start my break'} disabled={!status.isLoaded} onPress={() => { void toggle(); }} />}
      {!completed && <Pressable accessibilityRole="button" onPress={() => Alert.alert('Finish here?', 'You can stop whenever you need to.', [{ text: 'Keep going', style: 'cancel' }, { text: 'Finish break', onPress: finish }])}><Text style={[styles.link, { textAlign: 'center' }]}>Finish early</Text></Pressable>}
    </View>
  </Screen>;
}
