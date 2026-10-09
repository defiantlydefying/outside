import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Chip, Landscape, Screen, styles } from '../components/ui';
import { useOutside } from '../lib/outside';

export default function FinishScreen() {
  const { clearSession } = useOutside();
  const [feeling, setFeeling] = useState('');
  const [error, setError] = useState('');
  async function done() {
    try { await clearSession(); router.replace('/'); } catch { setError('Could not clear this session. Please try again.'); }
  }
  return <Screen><View style={styles.top}><Text style={styles.brand}>outside</Text></View><Landscape size={215} />
    <Text style={styles.eyebrow}>A moment for yourself</Text><Text style={styles.title}>You can leave the rest here.</Text><Text style={styles.body}>Maybe something shifted. Maybe it didn’t. You still took a little time to notice the world around you.</Text>
    <View style={styles.section}><Text style={styles.label}>How are you feeling now? · optional</Text><View style={styles.row}>{['A little calmer', 'About the same', 'More unsettled'].map(value => <Chip key={value} label={value} selected={feeling === value} onPress={() => setFeeling(value)} />)}</View></View>
    {feeling === 'More unsettled' && <View style={[styles.card, styles.section]}><Text style={styles.body}>You can stop practicing and return to an ordinary activity. If distress persists, consider reaching out to someone you trust or a qualified professional.</Text></View>}
    <Text style={[styles.small, styles.section]}>This reflection stays on this screen and isn’t saved or sent anywhere.</Text>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.footer}><Button title="Back to my day" onPress={() => { void done(); }} /></View>
  </Screen>;
}
