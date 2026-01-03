import { Stack } from 'expo-router';
import { WordProvider } from '../context/WordContext';

export default function Layout() {
  console.log("Root Layout Mounted");
  return (
    <WordProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </WordProvider>
  );
}
