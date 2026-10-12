import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Screen, styles } from '../components/ui';
import { useOutside } from '../lib/outside';

export default function ListenScreen() {
  const { loaded, connection, loadSample } = useOutside();
  const [error, setError] = useState('');
  async function sample() {
    setError('');
    try { await loadSample(); router.push('/session'); } catch { setError('The sample could not be loaded. Please try again.'); }
  }
  return <Screen>
    <View style={styles.top}><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.link}>‹ Back</Text></Pressable><Text style={styles.brand}>outside</Text></View>
    <Text style={styles.eyebrow}>Recorded tracks</Text>
    <Text style={styles.title}>Press play, then{'\n'}pocket your phone.</Text>
    <Text style={styles.body}>These are fixed tracks, with real silence rendered into the audio rather than held open on your phone. Nothing needs to stay on screen, so you can lock it and listen.</Text>
    <View style={[styles.card, styles.section]}>
      <Text style={styles.label}>A 3-minute sample</Text>
      <Text style={styles.body}>Gentle narration over an original ambient bed. Works with no setup and no connection.</Text>
      <Text style={styles.small}>Narration by elevenlabs.io.</Text>
      <View style={{ marginTop: 6 }}><Button title="Listen to the sample" secondary disabled={!loaded} onPress={() => { void sample(); }} /></View>
    </View>
    <View style={[styles.card, styles.section]}>
      <Text style={styles.label}>A break made for you</Text>
      <Text style={styles.body}>Check in first, and your guide writes a 3, 5, or 10-minute track around what you tell it.</Text>
      <Text style={styles.small}>{connection ? 'Takes a moment to prepare.' : 'Needs a connection in App setup.'}</Text>
      <View style={{ marginTop: 6 }}><Button title="Prepare a guided break" secondary disabled={!loaded || !connection} onPress={() => router.push('/check-in')} /></View>
    </View>
    {error ? <Text accessibilityRole="alert" style={[styles.error, styles.section]}>{error}</Text> : null}
    {!connection && <View style={styles.footer}><Pressable accessibilityRole="button" onPress={() => router.push('/settings')}><Text style={[styles.link, { textAlign: 'center' }]}>Connect in App setup →</Text></Pressable></View>}
  </Screen>;
}
