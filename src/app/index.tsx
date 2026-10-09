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
    <Text style={styles.body}>A short check-in. A gentle voice. A few minutes with the world around you.</Text>
    <View style={[styles.card, styles.section]}><Text style={styles.label}>Your surroundings are the starting point.</Text><Text style={styles.body}>A tree, a patch of sky, a breeze. You don’t need a perfect place to pause.</Text></View>
    {(error || storageError) ? <Text style={[styles.error, styles.section]}>{error || storageError}</Text> : null}
    <View style={styles.footer}>
      <Button title="Take an outside break" disabled={!loaded} onPress={() => router.push('/check-in')} />
      <Button title="Listen to a 3-minute sample" secondary onPress={() => { void sample(); }} />
      <Text style={[styles.small, { textAlign: 'center' }]}>{connection ? 'Personalized breaks are connected.' : 'The sample works without an account. Connect in App setup for personalized breaks.'}</Text>
      <Text style={[styles.small, { textAlign: 'center' }]}>For everyday wellbeing. Not therapy or emergency support.</Text>
    </View>
  </Screen>;
}
