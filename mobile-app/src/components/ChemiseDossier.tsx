/**
 * Chemise cartonnée ministérielle : onglet de famille, badge de source, briefing, interrupteur
 * Note de Bercy / Note du Cabinet social, sélecteur d'option et rangée de tampons.
 */
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { FAMILLES } from "../../../mobile-core/src/narrative/templates";
import type { DossierNarre } from "../../../mobile-core/src/narrative/types";
import type { Badge as BadgeT, Tampon as TamponT, ThemeCrise, TypeTampon } from "../core/regles";
import { melange, P, POLICE, T } from "../theme/palette";
import { Badge } from "./base";
import { PanoramaCrise } from "./svg/PanoramaCrise";
import { Tampon } from "./Tampon";

const INSTRUMENTS: Record<string, string> = { decret: "Décret", executif: "Mesure exécutive", loi: "Projet de loi", plfr: "Loi de finances rectificative", plfssr: "LFSS rectificative" };
const COULEUR_NIVEAU = { 1: P.cobalt, 2: P.or, 3: P.rouge } as const;

function InterrupteurNotes({ valeur, onChange }: { valeur: "bercy" | "social"; onChange: (v: "bercy" | "social") => void }) {
  const x = useRef(new Animated.Value(valeur === "bercy" ? 0 : 1)).current;
  const [largeur, setLargeur] = useState(0);
  useEffect(() => { Animated.spring(x, { toValue: valeur === "bercy" ? 0 : 1, useNativeDriver: true, friction: 7 }).start(); }, [valeur, x]);
  return (
    <View style={styles.inter} onLayout={(e) => setLargeur(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.interCurseur, { width: largeur / 2 - 3, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, largeur / 2] }) }] }]} />
      {(["bercy", "social"] as const).map((v) => (
        <Pressable key={v} style={styles.interItem} onPress={() => { void Haptics.selectionAsync(); onChange(v); }}>
          <Text style={[styles.interTexte, valeur === v && { color: P.papier }]}>{v === "bercy" ? "Note de Bercy" : "Cabinet social"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ChemiseDossier({ dossier, badge, tampons, optionChoisie, onChoisirOption, onTampon, resultat, panorama }: {
  dossier: DossierNarre; badge: BadgeT; tampons: TamponT[]; optionChoisie: string | null; panorama?: ThemeCrise | null;
  onChoisirOption: (id: string) => void; onTampon: (t: TypeTampon) => Promise<boolean>; resultat: string | null;
}) {
  const [note, setNote] = useState<"bercy" | "social">("bercy");
  const n = dossier.notes[note];
  return (
    <View style={styles.chemise}>
      <View style={[styles.onglet, { backgroundColor: COULEUR_NIVEAU[dossier.niveau] }]}>
        <Text style={styles.ongletTexte}>{(FAMILLES[dossier.famille]?.libelle ?? dossier.famille).toUpperCase()}{dossier.joursInaction >= 3 ? ` · J+${dossier.joursInaction}` : ""}</Text>
      </View>
      {panorama ? <View style={styles.panorama}><PanoramaCrise theme={panorama} hauteur={96} /></View> : null}
      <View style={styles.entete}>
        <Badge libelle={badge.libelle} certifie={badge.certifie} />
        <Text style={styles.titre}>{dossier.titre}</Text>
      </View>
      <Text style={styles.briefing}>{dossier.briefing}</Text>

      <InterrupteurNotes valeur={note} onChange={setNote} />
      <View style={[styles.note, { borderLeftColor: note === "bercy" ? P.cobalt : P.rouge }]}>
        <Text style={styles.noteTitre}>{n.titre}</Text>
        <Text style={styles.noteTexte}>{n.texte}</Text>
      </View>

      {dossier.options.length ? <Text style={styles.section}>Options</Text> : null}
      {dossier.options.map((o) => {
        const actif = o.gabaritId === optionChoisie;
        return (
          <Pressable key={o.gabaritId} onPress={() => { void Haptics.selectionAsync(); onChoisirOption(o.gabaritId); }}
            style={[styles.option, actif && { borderColor: P.nuit, backgroundColor: melange(P.papier, P.or, 0.18) }]}>
            <View style={[styles.radio, actif && { backgroundColor: P.nuit }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTexte}>{o.libelle}</Text>
              <Text style={styles.optionMeta}>
                {INSTRUMENTS[o.instrument] ?? o.instrument} · {o.coutCP} de capital{o.impactBudget ? ` · ${o.impactBudget}` : ""}
                {o.recommandePar.length ? ` · recommandé par ${o.recommandePar.map((a) => (a === "bercy" ? "Bercy" : "le Cabinet social")).join(" et ")}` : ""}
              </Text>
            </View>
          </Pressable>
        );
      })}

      <View style={styles.tampons}>{tampons.map((t) => <Tampon key={t.type} tampon={t} onApposer={() => onTampon(t.type)} />)}</View>
      {tampons.filter((t) => !t.actif && t.raison).map((t) => <Text key={t.type} style={styles.raison}>{t.raison}</Text>)}
      {resultat ? <Text style={styles.resultat}>{resultat}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panorama: { marginBottom: 10, borderRadius: 3, overflow: "hidden" },
  chemise: { backgroundColor: T.chemise, borderWidth: 1.5, borderColor: T.chemiseBord, borderRadius: 4, padding: 12, paddingTop: 18, marginTop: 14 },
  onglet: { position: "absolute", top: -12, left: 14, paddingHorizontal: 10, paddingVertical: 3, borderTopLeftRadius: 5, borderTopRightRadius: 5, borderWidth: 1.5, borderColor: P.nuit },
  ongletTexte: { color: P.papier, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  entete: { gap: 6 },
  titre: { fontFamily: POLICE.titre, fontSize: 18, fontWeight: "700", color: P.nuit },
  briefing: { fontSize: 14, lineHeight: 20, color: P.nuit, marginTop: 8, marginBottom: 10 },
  inter: { flexDirection: "row", borderWidth: 1.5, borderColor: P.nuit, borderRadius: 18, backgroundColor: P.papier, padding: 1.5 },
  interCurseur: { position: "absolute", top: 1.5, bottom: 1.5, left: 1.5, borderRadius: 16, backgroundColor: P.nuit },
  interItem: { flex: 1, paddingVertical: 7, alignItems: "center" },
  interTexte: { fontSize: 13, fontWeight: "700", color: P.nuit },
  note: { backgroundColor: P.papier, borderLeftWidth: 4, padding: 10, marginTop: 8, borderRadius: 3 },
  noteTitre: { fontWeight: "700", color: P.nuit, marginBottom: 4 },
  noteTexte: { fontSize: 13.5, lineHeight: 19, color: P.nuit },
  section: { marginTop: 12, marginBottom: 4, fontSize: 12, fontWeight: "800", color: P.ardoise, letterSpacing: 0.6 },
  option: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderWidth: 1, borderColor: T.filet, borderRadius: 4, padding: 9, marginTop: 6, backgroundColor: P.papier },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: P.nuit, marginTop: 2 },
  optionTexte: { fontSize: 14, fontWeight: "600", color: P.nuit },
  optionMeta: { fontSize: 12, color: P.ardoise, marginTop: 2 },
  tampons: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 18, justifyContent: "center" },
  raison: { fontSize: 12, color: P.rouge, textAlign: "center", marginTop: 6 },
  resultat: { fontSize: 13, color: P.nuit, fontWeight: "700", textAlign: "center", marginTop: 10 },
});
