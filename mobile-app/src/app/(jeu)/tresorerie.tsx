/**
 * Calendrier des murs de trésorerie (stocks et flux) : projection sur 30 jours à politique inchangée,
 * jalons des jours 5 (CAF), 9 (retraites), 15 (prélèvement à la source et Urssaf) et 28 (paie de l'État).
 */
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { DEFINITIONS_FLUX } from "../../../../engine/src/index";
import { date as fdate, euros, pourcent } from "../../../../mobile-core/src/narrative/format";
import { Carte, Ecran, Texte, Titre } from "../../components/base";
import { JaugeLiquide, LEGENDE_JALONS } from "../../components/svg/Instruments";
import { useJeu, useSession } from "../../core/jeu";
import { JALONS, jalonDuJour } from "../../core/regles";
import { P } from "../../theme/palette";

const LIBELLES = new Map<string, string>(DEFINITIONS_FLUX.map((d) => [d.id, d.libelle]));
LIBELLES.set("emission_oat", "Émissions d'OAT").set("btf", "Bons du Trésor (BTF)").set("charge_dette", "Intérêts de la dette").set("amortissement", "Remboursements d'OAT").set("interets_acoss", "Intérêts de l'Acoss");

export default function Tresorerie() {
  const jeu = useJeu();
  const s = useSession();
  const { width } = useWindowDimensions();
  const jours = useMemo(() => s.sim.projectionTresorerie(30), [jeu.version, s]);
  // tension : mur critique, ou encours de l'Acoss au-delà de 95 % de son plafond d'emprunt
  const tensions = jours.filter((j) => j.murs.some((m) => m.critique) || -j.acoss >= 0.95 * j.plafondAcoss);
  const [sel, setSel] = useState<number | null>(tensions.length ? jours.indexOf(tensions[0]!) : null);
  const j = sel !== null ? jours[sel] : undefined;
  return (
    <Ecran>
      <ScrollView contentContainerStyle={styles.page}>
        <Titre clair>Murs de trésorerie · 30 jours</Titre>
        <Texte clair style={{ opacity: 0.8, marginBottom: 8 }}>Projection à politique inchangée depuis le {fdate(s.sim.date)}. Touchez un jour pour le détail.</Texte>
        <JaugeLiquide jours={jours} largeur={width - 28} selection={sel} onJour={setSel} />
        <View style={{ marginTop: 6, gap: 2 }}>
          {LEGENDE_JALONS.map((l) => <Text key={l} style={styles.leg}>{l}</Text>)}
          <Text style={styles.leg}>Courbe dorée : trésorerie de l'État avant refinancement par BTF (chaque lundi).</Text>
        </View>
        {tensions.length ? (
          <Carte style={{ marginTop: 12, borderColor: P.rouge }}>
            <Text style={styles.alerte}>⚠ {tensions.length} jour{tensions.length > 1 ? "s" : ""} sous tension</Text>
            {tensions.slice(0, 4).map((t) => (
              <Texte key={t.date}>• {fdate(t.date)} : {t.murs.some((m) => m.critique) ? t.murs.filter((m) => m.critique).map((m) => m.libelle).join(", ") : `Acoss à ${pourcent((-t.acoss / t.plafondAcoss) * 100, 0)} de son plafond`}</Texte>
            ))}
          </Carte>
        ) : null}
        {j ? (
          <Carte style={{ marginTop: 12 }}>
            <Text style={styles.jour}>{fdate(j.date)}</Text>
            {jalonDuJour(j.mouvements).map((jl) => <Text key={jl} style={styles.jalon}>Jalon du jour {JALONS[jl].jour} : {JALONS[jl].libelle}</Text>)}
            <Texte>Trésorerie de l'État : {euros(j.etat)}</Texte>
            <Texte>Acoss : {euros(-j.acoss)} empruntés sur {euros(j.plafondAcoss)} ({pourcent((Math.max(0, -j.acoss) / j.plafondAcoss) * 100, 0)})</Texte>
            {j.mouvements.sort((a, b) => Math.abs(b.montant) - Math.abs(a.montant)).slice(0, 8).map((m, k) => (
              <View key={`${m.id}${k}`} style={styles.flux}>
                <Text style={styles.fluxLib} numberOfLines={1}>{LIBELLES.get(m.id) ?? m.id}</Text>
                <Text style={[styles.fluxMontant, { color: m.montant < 0 ? P.rouge : P.cobalt }]}>{euros(m.montant, true)}</Text>
              </View>
            ))}
          </Carte>
        ) : null}
        <Texte clair style={{ fontSize: 11, opacity: 0.7, marginTop: 12 }}>
          La paie du 28 couvre les agents rémunérés par l'État (fonction publique d'État) ; les fonctions publiques territoriale et hospitalière sont payées par leurs employeurs.
        </Texte>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  page: { padding: 14, paddingBottom: 30 },
  leg: { color: P.papier, fontSize: 11, opacity: 0.85 },
  alerte: { color: P.rouge, fontWeight: "800", marginBottom: 4 },
  jour: { fontWeight: "800", fontSize: 16, color: P.nuit, marginBottom: 4 },
  jalon: { color: P.or, fontWeight: "800", marginBottom: 2 },
  flux: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: P.ardoise },
  fluxLib: { flex: 1, color: P.nuit, fontSize: 13 },
  fluxMontant: { fontWeight: "800", fontVariant: ["tabular-nums"], fontSize: 13 },
});
