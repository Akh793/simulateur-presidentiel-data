/** Écran principal : le Bureau doré et le Parapheur présidentiel (3 dossiers au plus), « Semaine suivante ». */
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { Interruption } from "../../../../engine/src/index";
import { GABARITS } from "../../../../engine/src/index";
import { AvanceSemaine } from "../../components/AvanceSemaine";
import { Bouton, Ecran, Texte } from "../../components/base";
import { ChemiseDossier } from "../../components/ChemiseDossier";
import { EnTete } from "../../components/EnTete";
import { BureauDore } from "../../components/svg/Decors";
import { useJeu, useSession } from "../../core/jeu";
import { badgeSource, eclairage, situationsEmergentes, tamponsDisponibles, themePourDossier, type TypeTampon } from "../../core/regles";
import { P } from "../../theme/palette";

const attendre = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function Bureau() {
  const jeu = useJeu();
  const s = useSession();
  const n = jeu.narration!;
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [resultats, setResultats] = useState<Record<string, string>>({});
  const [ajournes, setAjournes] = useState<Set<string>>(new Set());
  const [dernier, setDernier] = useState<{ ok: boolean; texte: string } | null>(null);
  const [anim, setAnim] = useState<{ visible: boolean; date: string | null; jours: number; arret: Interruption | null }>({ visible: false, date: null, jours: 0, arret: null });

  const etat = useMemo(() => s.etat(), [jeu.version, s]);
  const murs7 = useMemo(() => s.sim.projectionTresorerie(7).flatMap((j) => j.murs.filter((m) => m.critique).map((m) => ({ date: j.date, libelle: m.libelle, critique: true }))), [jeu.version, s]);
  const emergentes = useMemo(() => situationsEmergentes(n, etat.corps, murs7), [n, etat, murs7]);
  const dossiers = n.dossiers.filter((d) => !ajournes.has(d.id));
  const moteur = (id: string) => s.sim.parapheurCourant.find((d) => d.id === id);
  const coutOption = (id: string) => {
    const g = GABARITS.find((x) => x.id === id)!;
    return g.instrument === "decret" ? s.sim.parlement.coutDecret(s.sim.date, g.coutCP).cout : g.coutCP;
  };

  const apposer = async (dossierId: string, type: TypeTampon): Promise<boolean> => {
    const d = moteur(dossierId);
    if (!d) return false;
    if (type === "ajourner") {
      setAjournes(new Set([...ajournes, dossierId]));
      return true;
    }
    const option = choix[dossierId] ?? n.dossiers.find((x) => x.id === dossierId)?.options[0]?.gabaritId;
    const r = type === "493" && d.reference
      ? await jeu.arbitrer((g) => g.engager493(d.reference!))
      : option ? await jeu.arbitrer((g) => g.decider(option, dossierId)) : null;
    if (r) {
      setResultats({ ...resultats, [dossierId]: r.message });
      setDernier({ ok: r.ok, texte: r.message });   // le dossier traité quitte le Parapheur : le résultat reste affiché ici
    }
    return r?.ok ?? false;
  };

  const semaine = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAnim({ visible: true, date: s.sim.date, jours: 0, arret: null });
    setAjournes(new Set());
    setResultats({});
    setDernier(null);
    let jours = 0;
    const r = await jeu.avancerSemaine(async (j) => {
      jours++;
      setAnim((a) => ({ ...a, date: j.date, jours }));
      void Haptics.selectionAsync();
      await attendre(260);
    });
    const arret = r?.interruptions.find((i) => i.critique) ?? null;
    if (arret) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setAnim((a) => ({ ...a, jours: Math.max(jours, arret ? jours : 7), arret }));
  };

  return (
    <Ecran fond={<BureauDore eclairage={eclairage(jeu.phase)} />}>
      <EnTete phase={jeu.phase} dateIso={s.sim.date} capital={s.sim.capitalPolitique} plafondCP={s.sim.parlement.plafondCP}
        soldeEtat={etat.tresorerie.soldeEtat} acoss={etat.tresorerie.acoss} plafondAcoss={etat.tresorerie.plafondAcoss} emergentes={emergentes} />
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.parapheur}>PARAPHEUR · JOUR {s.sim.jour}</Text>
        {dernier ? <Text style={[styles.dernier, { borderColor: dernier.ok ? P.or : P.rouge }]}>{dernier.ok ? "✓" : "✗"} {dernier.texte}</Text> : null}
        {dossiers.length === 0 ? <Texte clair style={{ marginTop: 12 }}>Aucun dossier ouvert : la journée est calme.</Texte> : null}
        {dossiers.map((d) => {
          const m = moteur(d.id);
          if (!m) return null;
          const opt = choix[d.id] ?? d.options[0]?.gabaritId ?? null;
          return (
            <ChemiseDossier key={d.id} dossier={d} badge={badgeSource(m, s.sim.graine)} optionChoisie={opt}
              panorama={d.niveau >= 2 ? themePourDossier(m.famille, m.indicateurs) : null}
              onChoisirOption={(id) => setChoix({ ...choix, [d.id]: id })}
              tampons={tamponsDisponibles(m, opt, (t) => { const tx = s.sim.parlement.texte(t); return tx ? s.sim.parlement.peut493(tx, s.sim.date) : { ok: false, raison: "texte introuvable" }; }, s.sim.capitalPolitique, coutOption)}
              onTampon={(t) => apposer(d.id, t)} resultat={resultats[d.id] ?? null} />
          );
        })}
        {s.sim.fin ? <Texte clair style={{ marginTop: 16 }}>Mandat achevé : score final {Math.round(s.sim.score().total)}.</Texte> : null}
      </ScrollView>
      <View style={styles.pied}>
        <View style={{ flex: 1 }}><Bouton libelle={s.sim.fin ? "Mandat achevé" : "Semaine suivante ▸"} desactive={jeu.occupe || s.sim.fin} onPress={() => void semaine()} /></View>
        <Bouton libelle="⌂" variante="papier" onPress={() => { jeu.quitter(); router.replace("/"); }} />
      </View>
      <AvanceSemaine visible={anim.visible} dateIso={anim.date} jours={anim.jours} arret={anim.arret}
        onFermer={() => setAnim({ visible: false, date: null, jours: 0, arret: null })} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  page: { padding: 14, paddingBottom: 30 },
  parapheur: { color: P.or, fontWeight: "900", letterSpacing: 2, fontSize: 12, marginBottom: 2 },
  dernier: { color: P.papier, borderWidth: 1, borderRadius: 4, padding: 8, marginTop: 6, fontSize: 13 },
  pied: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: P.or, backgroundColor: P.nuit },
});
