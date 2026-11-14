/**
 * Pacing adaptatif : défilement animé des jours de la semaine (feuille d'éphéméride qui tourne),
 * arrêt automatique sur interruption critique (crise, mur de trésorerie, jalon parlementaire).
 */
import { useEffect, useRef } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import type { Interruption } from "../../../engine/src/index";
import { date as fdate } from "../../../mobile-core/src/narrative/format";
import { themePourInterruption } from "../core/regles";
import { melange, P, POLICE } from "../theme/palette";
import { Bouton } from "./base";
import { PanoramaCrise } from "./svg/PanoramaCrise";

const MOTIFS: Record<string, string> = {
  urgence: "Dossier urgent", mur_tresorerie: "Mur de trésorerie", echeance_parlementaire: "Échéance parlementaire", promesse: "Promesse",
  crise_corps: "Crise sociale", institution: "Calendrier institutionnel", revelation: "Publication officielle", fin_mandat: "Fin du mandat",
};

export function AvanceSemaine({ visible, dateIso, jours, arret, onFermer }: {
  visible: boolean; dateIso: string | null; jours: number; arret: Interruption | null; onFermer: () => void;
}) {
  const page = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!dateIso) return;
    page.setValue(0);
    Animated.timing(page, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [dateIso, page]);
  const [jour, ...reste] = dateIso ? fdate(dateIso).split(" ") : ["", ""];
  const termine = arret !== null || jours >= 7;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFermer}>
      <View style={styles.voile}>
        <Animated.View style={[styles.ephemeride, {
          opacity: page.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
          transform: [{ perspective: 600 }, { rotateX: page.interpolate({ inputRange: [0, 1], outputRange: ["-75deg", "0deg"] }) }],
        }]}>
          <View style={styles.reliure} />
          <Text style={styles.jour}>{jour}</Text>
          <Text style={styles.mois}>{reste.join(" ")}</Text>
          <Text style={styles.compteur}>Jour {jours} sur 7</Text>
        </Animated.View>
        {termine ? (
          <View style={styles.bilan}>
            {arret && themePourInterruption(arret) ? <View style={{ marginBottom: 10 }}><PanoramaCrise theme={themePourInterruption(arret)!} hauteur={100} /></View> : null}
            <Text style={styles.bilanTitre}>{arret ? `Arrêt : ${MOTIFS[arret.type] ?? arret.type}` : "Semaine terminée"}</Text>
            {arret ? <Text style={styles.bilanTexte}>{arret.detail}</Text> : null}
            <Bouton libelle="Retour au bureau" onPress={onFermer} />
          </View>
        ) : <Text style={styles.encours}>Les jours passent…</Text>}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  voile: { flex: 1, backgroundColor: melange(P.nuit, "#000000", 0.2) + "E6", alignItems: "center", justifyContent: "center", padding: 24 },
  ephemeride: { width: 190, backgroundColor: P.papier, borderWidth: 2, borderColor: P.nuit, borderRadius: 6, alignItems: "center", paddingVertical: 18 },
  reliure: { position: "absolute", top: 0, left: 0, right: 0, height: 22, backgroundColor: P.rouge, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  jour: { fontFamily: POLICE.titre, fontSize: 64, fontWeight: "800", color: P.nuit, marginTop: 14 },
  mois: { fontSize: 16, color: P.nuit, fontWeight: "600" },
  compteur: { fontSize: 12, color: P.ardoise, marginTop: 8 },
  encours: { color: P.papier, marginTop: 18, fontSize: 14 },
  bilan: { marginTop: 20, backgroundColor: P.papier, borderRadius: 6, borderWidth: 1.5, borderColor: P.or, padding: 14, gap: 10, alignSelf: "stretch" },
  bilanTitre: { fontFamily: POLICE.titre, fontSize: 18, fontWeight: "700", color: P.rouge },
  bilanTexte: { fontSize: 14, color: P.nuit, lineHeight: 20 },
});
