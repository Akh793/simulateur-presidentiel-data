/** Une du journal du soir (3 maquettes éditoriales) et bandeau d'information continue. */
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import type { TitreUne } from "../../../mobile-core/src/narrative/types";
import { date as fdate } from "../../../mobile-core/src/narrative/format";
import { melange, P, POLICE } from "../theme/palette";

const MAQUETTES: Record<TitreUne["ligne"], { fond: string; encre: string; filet: string; titreTaille: number; casse: "upper" | "normal" }> = {
  economique: { fond: melange(P.papier, P.or, 0.16), encre: P.nuit, filet: P.or, titreTaille: 22, casse: "normal" },
  generaliste: { fond: P.papier, encre: P.nuit, filet: P.nuit, titreTaille: 24, casse: "normal" },
  populaire: { fond: P.papier, encre: P.rouge, filet: P.rouge, titreTaille: 27, casse: "upper" },
};

export function UneJournal({ ligne, dateIso }: { ligne: TitreUne; dateIso: string }) {
  const m = MAQUETTES[ligne.ligne];
  return (
    <View style={[styles.une, { backgroundColor: m.fond, borderColor: m.filet }]}>
      <View style={[styles.bandeauTitre, { borderBottomColor: m.filet }]}>
        <Text style={[styles.edition, { color: m.encre }]}>{ligne.edition.toUpperCase()}</Text>
        <Text style={styles.dateUne}>{fdate(dateIso)} · journal du soir</Text>
      </View>
      <Text style={[styles.titre, { color: m.encre, fontSize: m.titreTaille, textTransform: m.casse === "upper" ? "uppercase" : "none" }]}>{ligne.titre}</Text>
      <View style={[styles.filet, { backgroundColor: m.filet }]} />
      <Text style={styles.chapeau}>{ligne.chapeau}</Text>
    </View>
  );
}

/** Bandeau défilant des brèves (boucle horizontale). */
export function Bandeau({ breves }: { breves: string[] }) {
  const x = useRef(new Animated.Value(0)).current;
  const [largeur, setLargeur] = useState(0);
  const texte = breves.join("   •   ");
  useEffect(() => {
    if (!largeur) return;
    x.setValue(0);
    const boucle = Animated.loop(Animated.timing(x, { toValue: -largeur, duration: largeur * 22, easing: Easing.linear, useNativeDriver: true }));
    boucle.start();
    return () => boucle.stop();
  }, [largeur, texte, x]);
  return (
    <View style={styles.bandeau}>
      <View style={styles.direct}><Text style={styles.directTexte}>EN CONTINU</Text></View>
      <View style={{ flex: 1, overflow: "hidden", height: "100%", justifyContent: "center" }}>
        {/* position absolue : la largeur suit le texte entier (pas de troncature), puis défile en boucle */}
        <Animated.View style={{ position: "absolute", left: 0, width: 40000, flexDirection: "row", transform: [{ translateX: x }] }}>
          <Text numberOfLines={1} onLayout={(e) => setLargeur(e.nativeEvent.layout.width)} style={styles.breve}>{texte}   •   </Text>
          <Text numberOfLines={1} style={styles.breve}>{texte}   •   </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  une: { borderWidth: 2, borderRadius: 2, padding: 14, marginBottom: 12 },
  bandeauTitre: { borderBottomWidth: 2, paddingBottom: 6, marginBottom: 10 },
  edition: { fontFamily: POLICE.titre, fontSize: 15, fontWeight: "900", letterSpacing: 2 },
  dateUne: { fontSize: 11, color: P.ardoise, marginTop: 2 },
  titre: { fontFamily: POLICE.titre, fontWeight: "800", lineHeight: 30 },
  filet: { height: 2, width: 60, marginVertical: 10 },
  chapeau: { fontSize: 14, lineHeight: 20, color: P.nuit },
  bandeau: { flexDirection: "row", alignItems: "center", backgroundColor: P.nuit, borderTopWidth: 2, borderTopColor: P.rouge, height: 34 },
  direct: { backgroundColor: P.rouge, height: "100%", justifyContent: "center", paddingHorizontal: 8 },
  directTexte: { color: P.papier, fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  breve: { color: P.papier, fontSize: 13, paddingLeft: 10 },
});
