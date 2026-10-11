import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { breathingCue, EXHALE_MS, INHALE_MS } from '../lib/breathing';
import { colors, styles } from './ui';

export function BreathingGuide({ active }: { active: boolean }) {
  const [scale] = useState(() => new Animated.Value(0.72));
  const [reducedMotion, setReducedMotion] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReducedMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (!active) return;
    const began = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - began), 100);
    scale.setValue(0.72);
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1, duration: INHALE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.72, duration: EXHALE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    if (!reducedMotion) motion.start();
    return () => { clearInterval(timer); motion.stop(); };
  }, [active, reducedMotion, scale]);
  const cue = breathingCue(elapsed);
  const label = active ? cue.inhale ? 'Breathe in' : 'Breathe out' : 'Your own rhythm';
  return <View style={local.guide}>
    <View style={local.orbit}>
      <View style={local.outerRing} accessible={false} />
      <View style={local.innerRing} accessible={false} />
      <Animated.View accessible={false} style={[local.breath, { transform: [{ scale: active && !reducedMotion ? scale : 0.85 }] }]}><View style={local.glow} /></Animated.View>
      <View style={local.cue} accessible accessibilityLabel={active ? `${label}, ${cue.seconds} seconds. Follow only if comfortable.` : 'Breathing guide starts after the narration.'}>
        <Text style={local.label}>{label}</Text>
        <Text style={local.count}>{active ? cue.seconds : '✦'}</Text>
        <Text style={local.caption}>{active ? 'gently, without holding' : 'no need to force it'}</Text>
      </View>
    </View>
    <Text style={[styles.small, { textAlign: 'center' }]}>{active ? '4 seconds in · 6 seconds out · your pace comes first' : 'The circle starts after your guide finishes speaking.'}</Text>
    <Text style={[styles.small, { textAlign: 'center', marginTop: 4 }]}>Follow for a few breaths, or look away and breathe naturally.</Text>
  </View>;
}

const local = StyleSheet.create({
  guide: { alignItems: 'center', marginTop: 8, marginBottom: 24 },
  orbit: { width: 270, height: 270, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  outerRing: { position: 'absolute', width: 266, height: 266, borderRadius: 133, borderWidth: 1, borderColor: colors.border },
  innerRing: { position: 'absolute', width: 230, height: 230, borderRadius: 115, borderWidth: 1, borderColor: '#CDDCDA' },
  breath: { position: 'absolute', width: 218, height: 218, borderRadius: 109, backgroundColor: colors.soft, borderWidth: 1, borderColor: '#A7BDA8', alignItems: 'center', justifyContent: 'center' },
  glow: { width: 182, height: 182, borderRadius: 91, backgroundColor: '#DDE9DE' },
  cue: { alignItems: 'center' },
  label: { color: colors.ink, fontSize: 23, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  count: { color: colors.moss, fontSize: 48, lineHeight: 60, fontWeight: '300', fontVariant: ['tabular-nums'] },
  caption: { color: colors.muted, fontSize: 11 },
});
