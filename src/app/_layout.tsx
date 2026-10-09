import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OutsideProvider } from '../lib/outside';
import { colors } from '../components/ui';

export default function RootLayout() {
  return <SafeAreaProvider><OutsideProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.sky }, animation: 'fade' }} /></OutsideProvider></SafeAreaProvider>;
}
