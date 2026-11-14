/**
 * Détail d'un ministère : courbes duales de ses indicateurs (référence en pointillés, partie en trait plein),
 * brouillard statistique après la dernière publication, pastilles d'attribution causale cliquables.
 */
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CATALOGUE, calendrier as cal } from "../../../../../engine/src/index";
import { date as fdate, valeur } from "../../../../../mobile-core/src/narrative/format";
import { partsAttribution } from "../../../../../mobile-core/src/session/snapshot";
import { Badge, Bouton, Carte, Ecran, Texte, Titre } from "../../../components/base";
import { CourbeDuale, type PastilleCourbe, type PointCourbe } from "../../../components/svg/CourbeDuale";
import { zoneBrouillard } from "../../../components/svg/echelles";
import { useJeu, useSession } from "../../../core/jeu";
import { badgeSource } from "../../../core/regles";
import { P } from "../../../theme/palette";
import { ecartTexte, formatAxe, nomMinistere } from "../../../core/libelles";

function Indicateur({ id, largeur }: { id: string; largeur: number }) {
  const jeu = useJeu();
  const s = useSession();
  const c = CATALOGUE.find((x) => x.id === id)!;
  const [points, setPoints] = useState<PointCourbe[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  useEffect(() => {
    let vivant = true;
    void jeu.storage?.courbe(s.sessionId, id).then((r) => { if (vivant) setPoints(r); });
    return () => { vivant = false; };
  }, [jeu.version, jeu.storage, s, id]);

  const { pastilles, textes } = useMemo(() => {
    const parts = partsAttribution(s.sim, id).filter((p) => p.origine === "decision" && Math.abs(p.contribution) > 0);
    const imp = new Map(s.sim.macro.impulsions.map((x) => [x.id, x]));
    const textes: Record<string, string> = {};
    const pastilles: PastilleCourbe[] = parts.slice(0, 6).flatMap((p) => {
      const i = imp.get(p.impulsion);
      if (!i) return [];
      const favorable = c.sens === 0 ? true : c.sens * p.contribution > 0;
      const quand = fdate(cal.addDays(s.sim.debut, i.t0));
      textes[p.impulsion] = `${ecartTexte(p.contribution, c.unite)} ${favorable ? "grâce à" : "à cause de"} votre décision « ${p.libelle} » du ${quand} (jour ${i.t0}).`;
      return [{ cle: p.impulsion, day: i.t0, favorable }];
    });
    return { pastilles, textes };
  }, [jeu.version, s, id, c]);

  const pub = s.sim.publiees[id];
  const brouillard = c.origine === "pilotage" ? null : zoneBrouillard(points.map((p) => p.day), pub ? pub.jour : null, c.origine === "modele");
  const badge = badgeSource({ famille: c.famille, indicateurs: [id] }, s.sim.graine);
  return (
    <Carte style={{ marginBottom: 10 }}>
      <View style={styles.ligne}>
        <Text style={styles.lib}>{c.libelle}</Text>
        <Badge libelle={badge.libelle} certifie={badge.certifie} />
      </View>
      <Text style={styles.valeur}>{valeur(s.sim.valeur(id), c.unite)} <Text style={styles.ref}>· référence {valeur(s.sim.valeurReference(id), c.unite)}</Text></Text>
      {points.length > 1 ? (
        <CourbeDuale points={points} largeur={largeur} brouillard={brouillard} pastilles={pastilles} onPastille={(k) => setDetail(textes[k] ?? null)}
          formatY={(v, amplitude) => formatAxe(v, c.unite, amplitude)} />
      ) : <Texte discret>L'historique se construit au fil des jours.</Texte>}
      <View style={styles.legende}>
        <Text style={styles.leg}>– – référence</Text><Text style={[styles.leg, { color: P.cobalt }]}>—— votre mandat</Text>
        {brouillard ? <Text style={styles.leg}>▨ brouillard {c.origine === "modele" ? "(indicateur modélisé, jamais publié)" : `(dernière publication : jour ${pub?.jour ?? 0})`}</Text> : null}
      </View>
      {detail ? <Text style={styles.detail}>● {detail}</Text> : pastilles.length ? <Texte discret style={{ fontSize: 12 }}>Touchez une pastille pour voir l'effet de la décision.</Texte> : null}
    </Carte>
  );
}

export default function Ministere() {
  const { ministere } = useLocalSearchParams<{ ministere: string }>();
  const s = useSession();
  const { width } = useWindowDimensions();
  const ids = CATALOGUE.filter((c) => c.ministere === ministere).map((c) => c.id);
  const ministre = s.sim.acteurs.ministres.find((m) => m.ministere === ministere);
  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
        <Bouton petit variante="papier" libelle="◂ Cockpit" onPress={() => router.back()} />
        <Titre clair style={{ marginTop: 10 }}>{nomMinistere(ministere ?? "")}</Titre>
        <Texte clair style={{ opacity: 0.8, marginBottom: 10 }}>{ministre ? `${ministre.nom} · tension du secteur ${Math.round(ministre.tension)} sur 100` : ""}</Texte>
        {ids.map((id) => <Indicateur key={id} id={id} largeur={width - 54} />)}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: { gap: 6 },
  lib: { fontWeight: "800", color: P.nuit, fontSize: 14 },
  valeur: { fontSize: 20, fontWeight: "800", color: P.nuit, marginTop: 4, marginBottom: 4 },
  ref: { fontSize: 13, fontWeight: "400", color: P.ardoise },
  legende: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 2 },
  leg: { fontSize: 11, color: P.ardoise },
  detail: { marginTop: 6, fontSize: 13, color: P.nuit, fontWeight: "600" },
});
