import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Chip, Landscape, Screen, styles } from '../components/ui';
import { BreathingGuide } from '../components/BreathingGuide';
import { useOutside } from '../lib/outside';
import { useConversation } from '../lib/conversation';

const labels = { ready: 'A little space to settle', thinking: 'Making room for your reply', loading: 'Your guide is getting ready', speaking: 'Let your guide lead', listening: 'Listening to you', quiet: 'Nothing to answer. Just be here.', paused: 'Take your time', finished: 'Take your time returning' };
const practiceTitles = { breathing: 'Make room for a softer breath.', body: 'Let the ground hold you.', listening: 'Let the sounds come to you.', rest: 'You don’t have to solve anything.', none: 'We can start where you are.' };
export default function ConversationScreen() {
  const { connection, pauseSession } = useOutside();
  const guide = useConversation(connection);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [firstPractice, setFirstPractice] = useState<'breathing' | 'body'>('breathing');
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
    <Text style={[styles.title, { fontSize: 34, lineHeight: 40 }]}>{!started ? 'A few breaths. A little room.' : guide.phase === 'finished' ? 'There’s no right way to feel.' : practiceTitles[guide.practice]}</Text>
    {(!started ? firstPractice === 'breathing' : guide.practice === 'breathing' && guide.phase !== 'finished') ? <BreathingGuide active={guide.phase === 'quiet'} /> : <Landscape size={200} progress={started ? (180 - guide.remaining) / 180 : 0} />}
    {started && guide.phase !== 'finished' && <Text style={[styles.small, { textAlign: 'center', marginBottom: 20 }]}>{Math.floor(guide.remaining / 60)}:{String(guide.remaining % 60).padStart(2, '0')} remaining · 3-minute break</Text>}
    {guide.text && guide.phase !== 'finished' && <View style={styles.card}>{guide.phase === 'listening' ? <Text style={styles.small}>Your guide asked</Text> : <Pressable accessibilityRole="button" accessibilityState={{ expanded: showWords }} onPress={() => setShowWords(!showWords)}><Text style={[styles.link, { paddingVertical: 2 }]}>{showWords ? 'Hide spoken guidance ↑' : 'Read spoken guidance ↓'}</Text></Pressable>}{(showWords || guide.phase === 'listening') && <><Text style={styles.body}>{guide.text}</Text>{guide.heard ? <Text style={styles.small}>You said: {guide.heard}</Text> : null}</>}</View>}
    {!started && <><View style={[styles.row, { marginBottom: 16 }]}><Chip label="Gentle breathing" selected={firstPractice === 'breathing'} onPress={() => setFirstPractice('breathing')} /><Chip label="Relax the body" selected={firstPractice === 'body'} onPress={() => setFirstPractice('body')} /></View><View style={styles.card}><Text style={styles.body}>Stop somewhere comfortable outdoors. Let your guide lead a short meditation, with room to breathe, soften your body, and let thoughts pass. Speak whenever you want to change the practice.</Text><Text style={styles.small}>Between spoken guidance, the microphone can hear your reply. A pause sends your recording to ElevenLabs; your words go to Gemma to adapt the meditation. Recordings are deleted after transcription. You can mute or type instead.</Text></View></>}
    {guide.phase === 'listening' && <Text style={[styles.small, styles.section]}>Speak when you’re ready. A pause finishes your reply; you can also tap Finish reply. Silence is okay.</Text>}
    {guide.phase === 'quiet' && <Text style={[styles.small, { marginTop: 16 }]}>{guide.micOff ? 'The microphone is off.' : 'No reply needed. Speak only if you want to change something.'} Your guide will continue gently.</Text>}
    {started && guide.practice === 'breathing' && !['finished', 'ready'].includes(guide.phase) && <Pressable accessibilityRole="button" disabled={working} onPress={() => { void guide.send('Please skip breathing exercises for the rest of this meditation. Guide body relaxation instead.'); }}><Text style={styles.link}>Skip breathing · relax my body instead →</Text></Pressable>}
    {guide.error ? <Text accessibilityRole="alert" style={[styles.error, styles.section]}>{guide.error}</Text> : null}
    {!connection && <Pressable accessibilityRole="button" onPress={() => router.push('/settings')}><Text style={styles.link}>Connect in App setup →</Text></Pressable>}
    {started && guide.phase !== 'finished' && (typing || guide.micOff) && <View style={styles.section}><TextInput accessibilityLabel="Reply to Outside" style={styles.input} multiline maxLength={500} placeholder="What’s on your mind?" placeholderTextColor="#708987" value={draft} editable={!working} onFocus={() => { void guide.pause(); }} onChangeText={setDraft} /><View style={{ marginTop: 10 }}><Button title="Send reply" disabled={working || !draft.trim()} onPress={() => { void send(); }} /></View></View>}
    <View style={styles.footer}>
      {!started ? <Button title="Begin my meditation" disabled={!connection} onPress={() => { void guide.start(true, firstPractice); }} /> : guide.phase === 'finished' ? <Button title="Back to my day" onPress={() => { void leave(); }} /> : working ? <Button title="Preparing guidance…" busy onPress={() => {}} /> : guide.phase === 'listening' ? <Button title="Finish reply" onPress={() => { void guide.finishReply(); }} /> : guide.phase === 'paused' ? <Button title="Continue my meditation" onPress={() => { void guide.resume(); }} /> : <Button title="Change the guidance" onPress={() => { void guide.interrupt(); }} />}
      {!started && <><Button title="Check in first" secondary disabled={!connection} onPress={() => { void guide.start(true, 'none'); }} /><Pressable accessibilityRole="button" disabled={!connection} onPress={() => { setTyping(true); void guide.start(false, 'none'); }}><Text style={[styles.link, { textAlign: 'center' }]}>Check in by typing instead</Text></Pressable></>}
      {started && guide.phase !== 'finished' && <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <Pressable accessibilityRole="button" disabled={working} onPress={() => { void guide.toggleMic(); }}><Text style={styles.link}>{guide.micOff ? 'Turn microphone on' : 'Mute microphone'}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={working} onPress={() => { setTyping(!typing); if (!typing) void guide.pause(); }}><Text style={styles.link}>{typing ? 'Hide keyboard' : 'Type a reply'}</Text></Pressable>
      </View>}
      {started && !['paused', 'finished', 'ready'].includes(guide.phase) && <Pressable accessibilityRole="button" onPress={() => { void guide.pause(); }}><Text style={[styles.link, { textAlign: 'center' }]}>Pause my meditation</Text></Pressable>}
      <Text style={[styles.small, { textAlign: 'center' }]}>Voice by elevenlabs.io.</Text>
    </View>
  </Screen></KeyboardAvoidingView>;
}
