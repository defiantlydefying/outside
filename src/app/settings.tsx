import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Screen, styles } from '../components/ui';
import { useOutside } from '../lib/outside';
import { checkConnection, validateConnection } from '../lib/api';

export default function SettingsScreen() {
  const { connection, saveConnection } = useOutside();
  const [url, setUrl] = useState(connection?.url || '');
  const [token, setToken] = useState(connection?.token || '');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setWorking(true); setError('');
    try {
      const value = validateConnection({ url, token });
      await checkConnection(value); await saveConnection(value); router.back();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not connect. Check the address and access code.'); }
    finally { setWorking(false); }
  }
  async function disconnect() {
    try { await saveConnection(null); router.back(); } catch { setError('Could not remove the connection. Please try again.'); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen>
    <View style={styles.top}><Pressable accessibilityRole="button" disabled={working} onPress={() => router.back()}><Text style={styles.link}>‹ Back</Text></Pressable><Text style={styles.brand}>outside</Text></View>
    <Text style={styles.eyebrow}>Prototype setup</Text><Text style={styles.title}>Connect your Outside.</Text><Text style={styles.body}>The sample is ready to try. For personalized breaks, connect the private server that prepares your guidance.</Text>
    <View style={styles.section}><Text style={styles.label}>Server address</Text><TextInput accessibilityLabel="Server address" style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://your-outside-server.onrender.com" value={url} onChangeText={setUrl} editable={!working} /></View>
    <View style={styles.section}><Text style={styles.label}>Outside access code</Text><TextInput accessibilityLabel="Outside access code" style={styles.input} autoCapitalize="none" autoCorrect={false} secureTextEntry placeholder="Your private prototype access code" value={token} onChangeText={setToken} editable={!working} /></View>
    <Text style={[styles.small, styles.section]}>Your provider API keys stay on the server. This access code is stored in your phone’s secure storage.</Text>
    <View style={[styles.card, styles.section]}><Text style={styles.label}>Before you speak</Text><Text style={styles.body}>Voice check-ins are sent to ElevenLabs for transcription. Check-in text is sent to your configured Gemma service. Meditation text is sent to ElevenLabs for narration.</Text><Text style={styles.small}>Outside doesn’t save transcripts or reflections on the server. Generated audio expires there after one hour. Provider retention depends on your account settings.</Text></View>
    {error ? <Text accessibilityRole="alert" style={[styles.error, styles.section]}>{error}</Text> : null}
    <View style={styles.footer}><Button title="Check connection and save" busy={working} onPress={() => { void save(); }} />{connection && <Button title="Disconnect" secondary disabled={working} onPress={() => { void disconnect(); }} />}</View>
  </Screen></KeyboardAvoidingView>;
}
