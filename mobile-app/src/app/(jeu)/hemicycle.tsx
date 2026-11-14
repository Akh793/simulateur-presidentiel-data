/**
 * Hémicycle interactif : 577 sièges par groupe ou par vote prévu, seuil de majorité et de censure, textes en cours
 * (49.3), tiroir des promesses contraignantes : glisser une carte de groupe pivot vers la droite pour promettre
 * d'adopter une mesure, vers la gauche pour promettre d'y renoncer.
 */
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { GABARITS, calendrier as cal } from "../../../../engine/src/index";
import { BOUSSOLE_NEUTRE } from "../../../../engine/src/types";
import { date as fdate, nombre } from "../../../../mobile-core/src/narrative/format";
import { LIBELLES_JALONS } from "../../../../mobile-core/src/narrative/templates";
import { Bouton, Carte, Ecran, Segment, Texte, Titre } from "../../components/base";
import { DecorHemicycle } from "../../components/svg/Decors";
import { BarreSeuil, Hemicycle, type Position } from "../../components/svg/Hemicycle";
import { useJeu, useSession } from "../../core/jeu";
import { couleurGroupe } from "../../theme/groupes";
import { melange, P } from "../../theme/palette";

const DUREE_PROMESSE = 60;

function CartePivot({ code, libelle, sieges, relation, onPromettre }: { code: string; libelle: string; sieges: number; relation: number; onPromettre: (t: "adopter" | "renoncer") => void }) {
  const x = useRef(new Animated.Value(0)).current;
  const geste = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
    onPanResponderMove: Animated.event([null, { dx: x }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > 110) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        onPromettre(g.dx > 0 ? "adopter" : "renoncer");
      }
      Animated.spring(x, { toValue: 0, useNativeDriver: false, friction: 6 }).start();
    },
  })).current;
  const fond = x.interpolate({ inputRange: [-140, 0, 140], outputRange: [P.rouge, P.papier, P.cobalt], extrapolate: "clamp" });
  return (
    <View style={styles.pivotRail}>
      <Text style={[styles.rail, { left: 10 }]}>◂ renoncer</Text>
      <Text style={[styles.rail, { right: 10 }]}>adopter ▸</Text>
      <Animated.View {...geste.panHandlers} style={[styles.pivot, { backgroundColor: fond, transform: [{ translateX: x }] }]}>
        <View style={[styles.pastille, { backgroundColor: couleurGroupe(code) }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.pivotCode}>{code} · {sieges} sièges</Text>
          <Text style={styles.pivotLib} numberOfLines={1}>{libelle}</Text>
        </View>
        <Text style={styles.relation}>{relation >= 0 ? "+" : ""}{nombre(relation, 2)}</Text>
      </Animated.View>
    </View>
  );
}

export default function HemicycleEcran() {
  const jeu = useJeu();
  const s = useSession();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<"groupes" | "vote">("groupes");
  const [selection, setSelection] = useState<string | null>(null);
  const [tiroir, setTiroir] = useState(false);
  const [mesure, setMesure] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { jeu.marquer("hemicycle"); }, [jeu.marquer]));

  const an = s.sim.parlement.an;
  const textes = s.sim.parlement.textes.filter((t) => t.statut === "en_cours");
  const texteVise = textes.find((t) => t.jalons.some((j) => !j.fait && j.nom === "vote_an")) ?? textes[0];
  const vote = useMemo(() => s.sim.parlement.voter(an, texteVise?.boussole ?? BOUSSOLE_NEUTRE, s.sim.acteurs.opinion(), s.sim.credibilite), [jeu.version, s, texteVise]);
  const positions = useMemo(() => Object.fromEntries(vote.details.map((d) => [d.code, d.position as Position])), [vote]);
  const pivots = an.groupes.filter((g) => Math.abs(g.relation) < 0.35 && (!g.verrouilleJusqua || g.verrouilleJusqua < s.sim.date));
  const candidates = useMemo(() => {
    const ids = new Set([...s.sim.parapheurCourant.flatMap((d) => d.options), ...textes.flatMap((t) => t.gabarits)]);
    return GABARITS.filter((g) => ids.has(g.id));
  }, [jeu.version, s]);
  const choisie = mesure ?? candidates[0]?.id ?? null;
  const groupeSel = an.groupes.find((g) => g.code === selection);

  const promettre = async (groupe: string, type: "adopter" | "renoncer") => {
    if (!choisie) { setMessage("Aucune mesure à promettre : ouvrez un dossier au Parapheur."); return; }
    const r = await jeu.arbitrer((g) => g.signerPromesse(groupe, choisie, type, DUREE_PROMESSE));
    setMessage(r ? `${groupe} : ${r.message}` : null);
  };

  return (
    <Ecran fond={<DecorHemicycle />}>
      <ScrollView contentContainerStyle={styles.page}>
        <Titre clair>Assemblée nationale</Titre>
        <Texte clair style={{ opacity: 0.8, marginBottom: 8 }}>{an.siegesPourvus} sièges pourvus sur {an.siegesTotal} · {texteVise ? `vote prévu : « ${texteVise.titre} »` : "aucun texte en navette"}</Texte>
        <Segment valeurs={[{ cle: "groupes", libelle: "Groupes" }, { cle: "vote", libelle: "Vote prévu" }]} valeur={mode} onChange={setMode} />
        <View style={{ alignItems: "center", marginTop: 10 }}>
          <Hemicycle groupes={an.groupes.map((g) => ({ code: g.code, sieges: g.sieges }))} total={an.siegesTotal} largeur={width - 28}
            positions={mode === "vote" ? positions : null} selection={selection} onSelection={(c) => { void Haptics.selectionAsync(); setSelection(c === selection ? null : c); }} />
        </View>
        <BarreSeuil pour={vote.pour} contre={vote.contre} total={an.siegesTotal} seuil={s.sim.parlement.seuilCensure()} />

        <View style={styles.legende}>
          {an.groupes.map((g) => (
            <Pressable key={g.code} onPress={() => setSelection(g.code === selection ? null : g.code)} style={styles.legendeItem}>
              <View style={[styles.pastille, { backgroundColor: mode === "vote" ? { pour: P.cobalt, contre: P.rouge, abstention: P.or }[positions[g.code] ?? "abstention"] : couleurGroupe(g.code) }]} />
              <Text style={styles.legendeTexte}>{g.code} {g.sieges}</Text>
            </Pressable>
          ))}
        </View>
        {groupeSel ? (
          <Carte style={{ marginTop: 8 }}>
            <Text style={styles.gras}>{groupeSel.libelle}</Text>
            <Texte>{groupeSel.sieges} sièges · cohésion {nombre(groupeSel.cohesion * 100, 0)} % · relation avec l'exécutif {nombre(groupeSel.relation, 2)}{groupeSel.verrouilleJusqua && groupeSel.verrouilleJusqua >= s.sim.date ? ` · alliance verrouillée jusqu'au ${fdate(groupeSel.verrouilleJusqua)}` : ""}</Texte>
          </Carte>
        ) : null}

        <Titre clair style={{ marginTop: 18, marginBottom: 6 }}>Textes en navette</Titre>
        {textes.length === 0 ? <Texte clair>Aucun texte en cours.</Texte> : null}
        {textes.map((t) => {
          const j = t.jalons.find((x) => !x.fait && x.date >= s.sim.date);
          const p = s.sim.parlement.peut493(t, s.sim.date);
          return (
            <Carte key={t.id} style={{ marginBottom: 8 }}>
              <Text style={styles.gras}>{t.titre}</Text>
              <Texte discret>{j ? `${LIBELLES_JALONS[j.nom] ?? j.nom} le ${fdate(j.date)}` : "étapes terminées"}{t.engage493 ? " · 49.3 engagé" : ""}</Texte>
              <View style={{ marginTop: 8 }}>
                <Bouton petit variante="rouge" libelle={p.ok ? "Engager le 49.3" : `49.3 impossible : ${p.raison}`} desactive={!p.ok || jeu.occupe}
                  onPress={() => void jeu.arbitrer((g) => g.engager493(t.id)).then((r) => r && setMessage(r.message))} />
              </View>
            </Carte>
          );
        })}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={[styles.tiroir, { maxHeight: tiroir ? 430 : 52 }]}>
        <Pressable onPress={() => setTiroir(!tiroir)} style={styles.poignee}>
          <View style={styles.barrette} />
          <Text style={styles.tiroirTitre}>Promesses contraignantes · {s.sim.parlement.promesses.filter((p) => p.statut === "active").length} actives</Text>
        </Pressable>
        {tiroir ? (
          <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
            <Texte discret>Mesure engagée ({DUREE_PROMESSE} jours, 5 de capital) :</Texte>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {candidates.map((g) => (
                <Pressable key={g.id} onPress={() => setMesure(g.id)} style={[styles.puce, g.id === choisie && { backgroundColor: P.nuit }]}>
                  <Text style={[styles.puceTexte, g.id === choisie && { color: P.papier }]} numberOfLines={1}>{g.libelle}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {pivots.length === 0 ? <Texte>Aucun groupe pivot disponible (relations tranchées ou alliances verrouillées).</Texte> : null}
            {pivots.map((g) => <CartePivot key={g.code} code={g.code} libelle={g.libelle} sieges={g.sieges} relation={g.relation} onPromettre={(t) => void promettre(g.code, t)} />)}
            {s.sim.parlement.promesses.filter((p) => p.statut === "active").map((p) => (
              <Texte key={p.id} style={{ fontSize: 12 }}>• {p.groupe} : {p.engagement.type === "adopter" ? "adopter" : "renoncer à"} « {GABARITS.find((g) => g.id === p.engagement.gabarit)?.libelle} » avant le {fdate(p.echeance)} (J−{Math.max(0, cal.diffDays(s.sim.date, p.echeance))})</Texte>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  page: { padding: 14 },
  legende: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  legendeItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendeTexte: { color: P.papier, fontSize: 12 },
  pastille: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: P.nuit },
  gras: { fontWeight: "700", color: P.nuit, marginBottom: 2 },
  message: { color: P.or, marginTop: 8, fontWeight: "700" },
  tiroir: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: P.papier, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderWidth: 1.5, borderColor: P.or, overflow: "hidden" },
  poignee: { alignItems: "center", paddingVertical: 8 },
  barrette: { width: 40, height: 4, borderRadius: 2, backgroundColor: P.ardoise, marginBottom: 4 },
  tiroirTitre: { fontWeight: "800", color: P.nuit },
  puce: { borderWidth: 1.2, borderColor: P.nuit, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 240 },
  puceTexte: { fontSize: 12, color: P.nuit, fontWeight: "600" },
  pivotRail: { height: 56, justifyContent: "center", backgroundColor: melange(P.ardoise, P.papier, 0.7), borderRadius: 8 },
  rail: { position: "absolute", fontSize: 11, fontWeight: "800", color: P.nuit },
  pivot: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, borderWidth: 1.5, borderColor: P.nuit, height: 56 },
  pivotCode: { fontWeight: "800", color: P.nuit },
  pivotLib: { fontSize: 12, color: P.ardoise },
  relation: { fontWeight: "800", color: P.nuit, fontVariant: ["tabular-nums"] },
});
