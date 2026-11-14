import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GameProvider } from "../core/jeu";
import { P } from "../theme/palette";

export default function RacineLayout() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: P.nuit }, animation: "fade" }} />
      </GameProvider>
    </SafeAreaProvider>
  );
}
