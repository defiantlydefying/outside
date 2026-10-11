import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Landscape, Screen, styles } from '../components/ui';
import { useOutside } from '../lib/outside';
import { useConversation } from '../lib/conversation';

const labels = { ready: 'A little space, together', thinking: 'Making room for your reply', loading: 'Your guide is getting ready', speaking: 'Outside is speaking', listening: 'Listening to you', quiet: 'A moment with what’s around you', paused: 'Take your time', finished: 'Take your time returning' };
export default function ConversationScreen() {
  const { connection, pauseSession } = useOutside();
  const guide = useConversation(connection);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  // Stop any previously playing track once on entry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { pauseSession(); }, []);
  const working = guide.pending || guide.phase === 'thinking' || guide.phase === 'loading';
  const started = guide.phase !== 'ready';
  async function leave() { await guide.finish(); router.replace('/'); }
  async function send() {
    const message = draft.trim(); if (!message) return;
    setDraft(''); await guide.send(message);
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen>
    <View style={styles.top}><Text style={styles.brand}>outside</Text><Pressable accessibilityRole="button" onPress={() => { void leave(); }}><Text style={styles.link}>Finish</Text></Pressable></View>
    <Text style={[styles.eyebrow, { marginTop: 20 }]} accessibilityLiveRegion="polite">{labels[guide.phase]}</Text>
    <Text style={[styles.title, { fontSize: 34, lineHeight: 40 }]}>{!started ? 'What’s on your mind?' : guide.phase === 'finished' ? 'There’s no right way to feel.' : guide.phase === 'quiet' ? 'Let the quiet be quiet.' : 'We can start where you are.'}</Text>
    <Landscape size={200} progress={started ? (180 - guide.remaining) / 180 : 0} />
    {started && guide.phase !== 'finished' && <Text style={[styles.small, { textAlign: 'center', marginBottom: 20 }]}>{Math.floor(guide.remaining / 60)}:{String(guide.remaining % 60).padStart(2, '0')} remaining · 3-minute break</Text>}
    {guide.text && guide.phase !== 'finished' && <View style={styles.card}><Text style={styles.body}>{guide.text}</Text>{guide.heard ? <Text style={styles.small}>You said: {guide.heard}</Text> : null}</View>}
    {!started && <View style={styles.card}><Text style={styles.body}>Stop somewhere comfortable outdoors. Speak about what’s on your mind; Outside will respond and guide a short practice around what you notice.</Text><Text style={styles.small}>After each reply, the microphone listens for your answer. A brief pause sends your speech to ElevenLabs; your words go to Gemma to shape the next reply. Recordings are deleted after transcription. You can mute the microphone or type instead.</Text></View>}
    {guide.phase === 'listening' && <Text style={[styles.small, styles.section]}>Speak when you’re ready. A pause finishes your reply; you can also tap Finish reply. Silence is okay.</Text>}
    {guide.phase === 'quiet' && <Text style={[styles.small, styles.section]}>{guide.micOff ? 'The microphone is off.' : 'You can speak to change the guidance.'} Outside will gently continue after this quiet period.</Text>}
    {guide.error ? <Text accessibilityRole="alert" style={[styles.error, styles.section]}>{guide.error}</Text> : null}
    {!connection && <Pressable accessibilityRole="button" onPress={() => router.push('/settings')}><Text style={styles.link}>Connect in App setup →</Text></Pressable>}
    {started && guide.phase !== 'finished' && (typing || guide.micOff) && <View style={styles.section}><TextInput accessibilityLabel="Reply to Outside" style={styles.input} multiline maxLength={500} placeholder="What’s on your mind?" placeholderTextColor="#708987" value={draft} editable={!working} onFocus={() => { void guide.pause(); }} onChangeText={setDraft} /><View style={{ marginTop: 10 }}><Button title="Send reply" disabled={working || !draft.trim()} onPress={() => { void send(); }} /></View></View>}
    <View style={styles.footer}>
      {!started ? <Button title="Start talking with Outside" disabled={!connection} onPress={() => { void guide.start(); }} /> : guide.phase === 'finished' ? <Button title="Back to my day" onPress={() => { void leave(); }} /> : working ? <Button title="Preparing a reply…" busy onPress={() => {}} /> : guide.phase === 'listening' ? <Button title="Finish reply" onPress={() => { void guide.finishReply(); }} /> : guide.phase === 'paused' ? <Button title="Continue the conversation" onPress={() => { void guide.resume(); }} /> : <Button title="Interrupt and speak" onPress={() => { void guide.interrupt(); }} />}
      {!started && <Button title="Start by typing" secondary disabled={!connection} onPress={() => { setTyping(true); void guide.start(false); }} />}
      {started && guide.phase !== 'finished' && <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Pressable accessibilityRole="button" disabled={working} onPress={() => { void guide.toggleMic(); }}><Text style={styles.link}>{guide.micOff ? 'Turn microphone on' : 'Mute microphone'}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={working} onPress={() => { setTyping(!typing); if (!typing) void guide.pause(); }}><Text style={styles.link}>{typing ? 'Hide keyboard' : 'Type a reply'}</Text></Pressable>
      </View>}
      {started && !['paused', 'finished', 'ready'].includes(guide.phase) && <Pressable accessibilityRole="button" onPress={() => { void guide.pause(); }}><Text style={[styles.link, { textAlign: 'center' }]}>Pause the conversation</Text></Pressable>}
      <Text style={[styles.small, { textAlign: 'center' }]}>Voice by elevenlabs.io.</Text>
    </View>
  </Screen></KeyboardAvoidingView>;
}
