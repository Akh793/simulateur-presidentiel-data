import { Stack } from "expo-router";
import { P } from "../../../theme/palette";

export default function CockpitLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: P.nuit } }} />;
}
