import React, { type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, G, Line } from 'react-native-svg';

export const colors = { sky: '#E8F1F3', ink: '#243D3A', moss: '#526B4F', soft: '#D4E1D2', white: '#FAFCFB', muted: '#5D7473', border: '#BACDCB', sun: '#D9B66D' };
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky },
  content: { paddingHorizontal: 26, paddingBottom: 28, flexGrow: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  brand: { color: colors.ink, fontSize: 22, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  eyebrow: { fontSize: 11, color: colors.moss, letterSpacing: 2.1, fontWeight: '600', textTransform: 'uppercase', marginBottom: 13 },
  title: { color: colors.ink, fontSize: 39, lineHeight: 45, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: 14 },
  body: { color: colors.muted, fontSize: 16, lineHeight: 25 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  section: { marginTop: 25 },
  row: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 20, gap: 8 },
  input: { borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 15, backgroundColor: colors.white, color: colors.ink, fontSize: 16, lineHeight: 23 },
  footer: { marginTop: 'auto', paddingTop: 25, gap: 12 },
  link: { color: colors.ink, fontSize: 14, fontWeight: '500', paddingVertical: 12 },
  error: { color: '#833F36', backgroundColor: '#F8E9E5', padding: 14, borderRadius: 14, lineHeight: 21, fontSize: 14 },
});
export function Screen({ children }: { children: ReactNode }) {
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
}
export function Button({ title, onPress, secondary = false, disabled = false, busy = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; busy?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => ({ minHeight: 57, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, backgroundColor: secondary ? colors.soft : colors.ink, opacity: disabled || busy ? 0.5 : pressed ? 0.8 : 1 })}>
    {busy && <ActivityIndicator color={secondary ? colors.ink : colors.white} />}<Text style={{ color: secondary ? colors.ink : colors.white, fontSize: 16, fontWeight: '600' }}>{title}</Text>
  </Pressable>;
}
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => ({ minHeight: 46, paddingVertical: 12, paddingHorizontal: 17, borderRadius: 23, borderWidth: 1, borderColor: selected ? colors.moss : colors.border, backgroundColor: selected ? colors.moss : 'transparent', opacity: pressed ? 0.75 : 1 })}><Text style={{ color: selected ? colors.white : colors.ink, fontSize: 14 }}>{label}</Text></Pressable>;
}
export function Landscape({ progress = 0, size = 260 }: { progress?: number; size?: number }) {
  const circumference = 2 * Math.PI * 117;
  return <View accessible={false} style={{ alignItems: 'center', marginVertical: 20 }}><Svg width={size} height={size} viewBox="0 0 260 260">
    <Circle cx="130" cy="130" r="117" stroke={colors.border} strokeWidth="2" fill="none" />
    {progress > 0 && <Circle cx="130" cy="130" r="117" stroke={colors.moss} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={`${circumference * progress} ${circumference}`} transform="rotate(-90 130 130)" />}
    <Circle cx="171" cy="78" r="17" fill={colors.sun} />
    <Path d="M43 168 Q95 117 161 164 Q195 185 217 162 L209 190 Q130 239 53 190 Z" fill={colors.soft} />
    <Path d="M52 181 Q106 160 167 184 Q190 193 208 183" fill="none" stroke="#94B396" strokeWidth="2" />
    <G stroke={colors.moss} strokeWidth="2.5" strokeLinecap="round" fill="none">
      <Path d="M108 178 L108 90 M108 112 L90 99 M108 134 L128 115 M108 153 L89 139" />
      <Path d="M151 183 L151 120 M151 143 L167 130 M151 158 L138 148" />
    </G>
    <Path d="M108 87 C70 70 64 110 79 131 C53 149 82 173 107 162 C137 172 157 144 135 128 C151 107 135 77 108 87 Z" fill={colors.moss} opacity="0.18" />
    <Path d="M151 114 C129 105 119 133 133 142 C120 157 139 172 151 167 C175 172 181 151 170 141 C181 124 166 106 151 114 Z" fill={colors.moss} opacity="0.32" />
    <Line x1="107" y1="90" x2="107" y2="177" stroke={colors.moss} strokeWidth="2.5" />
  </Svg></View>;
}
