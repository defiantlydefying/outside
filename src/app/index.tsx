import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Landscape, Screen, styles } from '../components/ui';
import { useOutside } from '../lib/outside';

export default function Home() {
  const { loaded, storageError, connection, loadSample } = useOutside();
  const [error, setError] = useState('');
  async function sample() {
    setError('');
    try { await loadSample(); router.push('/session'); } catch { setError('The sample could not be loaded. Please try again.'); }
  }
  return <Screen>
    <View style={styles.top}><Text style={styles.brand}>outside</Text><Pressable accessibilityRole="button" onPress={() => router.push('/settings')}><Text style={styles.link}>App setup</Text></Pressable></View>
    <Landscape />
    <Text style={styles.eyebrow}>A little space, outside</Text>
    <Text style={styles.title}>Put your phone away.{ '\n' }Come back to here.</Text>
    <Text style={styles.body}>A gentle voice. Room to breathe. A short outdoor meditation that meets you where you are.</Text>
    <View style={[styles.card, styles.section]}><Text style={styles.label}>Let yourself settle.</Text><Text style={styles.body}>Breathe gently, soften your shoulders, and let the world carry on for a moment. You don’t need a perfect place to pause.</Text></View>
    {(error || storageError) ? <Text style={[styles.error, styles.section]}>{error || storageError}</Text> : null}
    <View style={styles.footer}>
      <Button title="Meditate with Outside · 3 minutes" disabled={!loaded} onPress={() => router.push('/conversation')} />
      <Button title="Listen to a 3-minute sample" secondary onPress={() => { void sample(); }} />
      <Pressable accessibilityRole="button" disabled={!loaded} onPress={() => router.push('/check-in')}><Text style={[styles.link, { textAlign: 'center' }]}>Prepare a guided audio break →</Text></Pressable>
      <Text style={[styles.small, { textAlign: 'center' }]}>{connection ? 'Personalized breaks are connected.' : 'The sample works without an account. Connect in App setup for personalized breaks.'}</Text>
      <Text style={[styles.small, { textAlign: 'center' }]}>For everyday wellbeing. Not therapy or emergency support.</Text>
    </View>
  </Screen>;
}
