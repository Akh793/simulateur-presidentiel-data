/**
 * Tampon physique animé : appui → le tampon descend, s'écrase en tournant, l'encre reste sur la chemise.
 * Retour haptique : impact lourd à l'écrasement, puis succès ou erreur selon la réponse du moteur.
 */
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { LIBELLES_TAMPONS, type Tampon as TamponT } from "../core/regles";
import { melange, P } from "../theme/palette";

const ENCRE: Record<TamponT["type"], string> = { decret: P.cobalt, loi: P.nuit, "493": P.rouge, ajourner: P.ardoise };

export function Tampon({ tampon, onApposer }: { tampon: TamponT; onApposer: () => Promise<boolean> }) {
  const echelle = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const encre = useRef(new Animated.Value(0)).current;
  const [occupe, setOccupe] = useState(false);
  const couleur = ENCRE[tampon.type];

  const appuyer = async () => {
    if (!tampon.actif || occupe) {
      if (!tampon.actif) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setOccupe(true);
    encre.setValue(0);
    await new Promise<void>((fin) => Animated.sequence([
      Animated.parallel([
        Animated.timing(echelle, { toValue: 1.35, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(rotation, { toValue: -1, duration: 120, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(echelle, { toValue: 0.92, duration: 90, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
        Animated.timing(rotation, { toValue: 0.6, duration: 90, useNativeDriver: true }),
      ]),
    ]).start(() => fin()));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.timing(encre, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    Animated.spring(echelle, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    const ok = await onApposer();
    void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    setOccupe(false);
  };

  const rot = rotation.interpolate({ inputRange: [-1, 1], outputRange: ["-14deg", "8deg"] });
  return (
    <Pressable onPress={appuyer} accessibilityRole="button" accessibilityLabel={`Tampon ${LIBELLES_TAMPONS[tampon.type]}`}
      accessibilityHint={tampon.raison} style={{ opacity: tampon.actif ? 1 : 0.4 }}>
      <Animated.View style={[styles.tampon, { borderColor: couleur, transform: [{ scale: echelle }, { rotate: rot }] }]}>
        <View style={[styles.manche, { backgroundColor: melange(couleur, P.nuit, 0.3) }]} />
        <Text style={[styles.texte, { color: couleur }]}>{LIBELLES_TAMPONS[tampon.type].toUpperCase()}</Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.encre, { borderColor: couleur, opacity: encre.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tampon: { minWidth: 76, paddingHorizontal: 8, paddingVertical: 8, borderWidth: 2.5, borderRadius: 6, alignItems: "center", backgroundColor: P.papier },
  manche: { position: "absolute", top: -9, width: 22, height: 9, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  texte: { fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  encre: { position: "absolute", left: -4, right: -4, top: -4, bottom: -4, borderWidth: 3, borderRadius: 8, transform: [{ rotate: "-6deg" }] },
});
