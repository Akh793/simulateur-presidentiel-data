/** Primitives d'interface : écran, carte papier, titres, jauge, bouton, badge. Ligne claire : filet d'encre, aplats. */
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { melange, P, POLICE, T } from "../theme/palette";

export function Ecran({ children, fond }: { children: ReactNode; fond?: ReactNode }) {
  return (
    <View style={styles.fond}>
      {fond ? <View style={StyleSheet.absoluteFill} pointerEvents="none">{fond}</View> : null}
      <SafeAreaView style={styles.zone} edges={["top", "left", "right"]}>{children}</SafeAreaView>
    </View>
  );
}

export function Carte({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.carte, style]}>{children}</View>;
}

export function Titre({ children, clair, style }: { children: ReactNode; clair?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.titre, clair && { color: P.papier }, style]}>{children}</Text>;
}

export function Texte({ children, discret, clair, style, lignes }: { children: ReactNode; discret?: boolean; clair?: boolean; style?: StyleProp<TextStyle>; lignes?: number }) {
  return <Text numberOfLines={lignes} style={[styles.texte, discret && { color: P.ardoise }, clair && { color: P.papier }, style]}>{children}</Text>;
}

export function Bouton({ libelle, onPress, variante = "or", desactive, petit }: { libelle: string; onPress: () => void; variante?: "or" | "rouge" | "cobalt" | "papier"; desactive?: boolean; petit?: boolean }) {
  const fond = { or: P.or, rouge: P.rouge, cobalt: P.cobalt, papier: P.papier }[variante];
  const texte = variante === "papier" || variante === "or" ? P.nuit : P.papier;
  return (
    <Pressable accessibilityRole="button" disabled={desactive} onPress={onPress}
      style={({ pressed }) => [styles.bouton, petit && styles.boutonPetit, { backgroundColor: fond, opacity: desactive ? 0.45 : pressed ? 0.8 : 1 }]}>
      <Text style={[styles.boutonTexte, petit && { fontSize: 13 }, { color: texte }]}>{libelle}</Text>
    </Pressable>
  );
}

/** Jauge horizontale ; `plafond` dessine le plafond courant (capital politique réduit après une démission de Matignon). */
export function Jauge({ valeur, max, plafond, couleur = P.or, hauteur = 8, fond = melange(P.nuit, P.papier, 0.2) }: { valeur: number; max: number; plafond?: number; couleur?: string; hauteur?: number; fond?: string }) {
  const pct = Math.max(0, Math.min(1, valeur / (max || 1)));
  return (
    <View style={{ height: hauteur, borderRadius: hauteur / 2, backgroundColor: fond, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: couleur }} />
      {plafond !== undefined && plafond < max ? <View style={{ position: "absolute", left: `${(plafond / max) * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: P.rouge }} /> : null}
    </View>
  );
}

export function Badge({ libelle, certifie, clair }: { libelle: string; certifie?: boolean; clair?: boolean }) {
  return (
    <View style={[styles.badge, { borderColor: certifie ? P.cobalt : P.ardoise, backgroundColor: clair ? P.papier : "transparent" }]}>
      <Text style={[styles.badgeTexte, { color: certifie ? P.cobalt : P.ardoise }]}>{certifie ? "✓ " : ""}{libelle}</Text>
    </View>
  );
}

export function Segment<T extends string>({ valeurs, valeur, onChange }: { valeurs: { cle: T; libelle: string }[]; valeur: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {valeurs.map((v) => (
        <Pressable key={v.cle} onPress={() => onChange(v.cle)} style={[styles.segmentItem, v.cle === valeur && { backgroundColor: P.or }]}>
          <Text style={[styles.segmentTexte, v.cle !== valeur && { color: P.ardoise }]}>{v.libelle}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: T.fond },
  zone: { flex: 1 },
  carte: { backgroundColor: P.papier, borderRadius: 6, borderWidth: 1.5, borderColor: P.nuit, padding: 12 },
  titre: { fontFamily: POLICE.titre, fontSize: 19, fontWeight: "700", color: P.nuit },
  texte: { fontSize: 14, lineHeight: 20, color: P.nuit },
  bouton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1.5, borderColor: P.nuit, alignItems: "center" },
  boutonPetit: { paddingVertical: 7, paddingHorizontal: 10 },
  boutonTexte: { fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  badge: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTexte: { fontSize: 11, fontWeight: "600" },
  segment: { flexDirection: "row", borderWidth: 1.5, borderColor: P.nuit, borderRadius: 6, overflow: "hidden", backgroundColor: P.papier },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: "center" },
  segmentTexte: { fontSize: 13, fontWeight: "700", color: P.nuit },
});
