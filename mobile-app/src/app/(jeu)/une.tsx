/**
 * Bilan du soir : Une du journal (3 maquettes éditoriales), bandeau d'information continue,
 * et onglet Acteurs : 12 ministres-fusibles (usure, remaniement) et 8 corps intermédiaires (radicalisation).
 */
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { Ministere } from "../../../../engine/src/index";
import { SEUIL_BLOCAGE } from "../../../../engine/src/index";
import type { LigneEditoriale } from "../../../../mobile-core/src/narrative/types";
import { Bouton, Ecran, Jauge, Segment, Texte, Titre } from "../../components/base";
import { DecorConseil, DecorPerron } from "../../components/svg/Decors";
import { Bandeau, UneJournal } from "../../components/Presse";
import { ModularPortrait } from "../../components/svg/ModularPortrait";
import { etatCorps, etatMinistre } from "../../components/svg/portrait-traits";
import { useJeu, useSession } from "../../core/jeu";
import { nomMinistere } from "../../core/libelles";
import { melange, P } from "../../theme/palette";

function BarreRadicalisation({ valeur }: { valeur: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const critique = valeur >= SEUIL_BLOCAGE;
  useEffect(() => {
    if (!critique) { pulse.setValue(1); return; }
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.35, duration: 520, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [critique, pulse]);
  const couleur = critique ? P.rouge : valeur >= 55 ? P.or : P.cobalt;
  return (
    <Animated.View style={{ opacity: pulse }}>
      <Jauge valeur={valeur} max={100} couleur={couleur} hauteur={10} />
      <View style={{ position: "absolute", left: `${SEUIL_BLOCAGE}%`, top: -2, bottom: -2, width: 2, backgroundColor: P.nuit }} />
    </Animated.View>
  );
}

function Acteurs() {
  const jeu = useJeu();
  const s = useSession();
  const { width } = useWindowDimensions();
  const [message, setMessage] = useState<string | null>(null);
  const larg = (width - 28 - 10) / 2;
  return (
    <View>
      <Titre clair style={{ marginBottom: 6 }}>Ministres-fusibles</Titre>
      <View style={styles.grille}>
        {s.sim.acteurs.ministres.map((m) => {
          const e = etatMinistre(m);
          return (
            <View key={m.ministere} style={[styles.fiche, { width: larg }]}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <ModularPortrait graine={m.nom} expression={e.expression} fatigue={e.fatigue} taille={52} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nom} numberOfLines={1}>{m.nom}</Text>
                  <Text style={styles.min} numberOfLines={2}>{nomMinistere(m.ministere)}</Text>
                </View>
              </View>
              <Text style={styles.petit}>Usure {Math.round(m.tension)} · compétence {Math.round(m.competence)} · loyauté {Math.round(m.loyaute)}</Text>
              <Jauge valeur={m.tension} max={100} couleur={m.tension >= 70 ? P.rouge : m.tension >= 40 ? P.or : P.cobalt} />
              <View style={{ marginTop: 6 }}>
                <Bouton petit variante="papier" libelle="Remaniement (10)" desactive={jeu.occupe || s.sim.capitalPolitique < 10}
                  onPress={() => void jeu.arbitrer((g) => g.remanier(m.ministere as Ministere)).then((r) => r && setMessage(r.message))} />
              </View>
            </View>
          );
        })}
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Titre clair style={{ marginTop: 16, marginBottom: 6 }}>Corps intermédiaires</Titre>
      {s.sim.acteurs.corps.map((c) => {
        const e = etatCorps(c);
        const bloque = c.bloqueJusqua !== null && c.bloqueJusqua >= s.sim.jour;
        return (
          <View key={c.id} style={[styles.corps, bloque && { borderColor: P.rouge }]}>
            <ModularPortrait graine={`corps:${c.id}`} expression={e.expression} fatigue={e.fatigue} taille={44} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.nom}>{c.libelle}</Text>
              <BarreRadicalisation valeur={c.radicalisation} />
              <Text style={styles.petit}>Radicalisation {Math.round(c.radicalisation)} (blocage au-delà de {SEUIL_BLOCAGE}) · approbation {Math.round(c.approbation)}{bloque ? ` · ${c.blocage.libelle}` : ""}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function Une() {
  const jeu = useJeu();
  const s = useSession();
  const n = jeu.narration!;
  const [vue, setVue] = useState<"une" | "acteurs">("une");
  const [edition, setEdition] = useState<LigneEditoriale>("generaliste");
  useFocusEffect(useCallback(() => { jeu.marquer("une"); }, [jeu.marquer]));
  const ligne = n.une.titres.find((t) => t.ligne === edition) ?? n.une.titres[0]!;
  return (
    <Ecran fond={vue === "une" ? <DecorPerron /> : <DecorConseil />}>
      <View style={{ padding: 14, paddingBottom: 6 }}>
        <Segment valeurs={[{ cle: "une", libelle: "Une du 20h" }, { cle: "acteurs", libelle: "Acteurs" }]} valeur={vue} onChange={setVue} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 6, paddingBottom: 24 }}>
        {vue === "une" ? (
          <View>
            <Segment valeurs={[{ cle: "economique", libelle: "Éco" }, { cle: "generaliste", libelle: "Générale" }, { cle: "populaire", libelle: "Populaire" }]} valeur={edition} onChange={setEdition} />
            <View style={{ height: 12 }} />
            <UneJournal ligne={ligne} dateIso={s.sim.date} />
            <Texte clair style={{ opacity: 0.8 }}>Score provisoire {Math.round(s.sim.score().total)} · opinion moyenne sur 90 jours {Math.round(s.sim.opinion90())} · crédibilité {Math.round(s.sim.credibilite)}</Texte>
          </View>
        ) : <Acteurs />}
      </ScrollView>
      <Bandeau breves={n.breves} />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  grille: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fiche: { backgroundColor: P.papier, borderWidth: 1.5, borderColor: P.nuit, borderRadius: 6, padding: 8, gap: 4 },
  nom: { fontWeight: "800", color: P.nuit, fontSize: 13 },
  min: { fontSize: 11.5, color: melange(P.nuit, P.ardoise, 0.5) },
  petit: { fontSize: 11, color: P.ardoise },
  message: { color: P.or, fontWeight: "700", marginTop: 8 },
  corps: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: P.papier, borderWidth: 1.5, borderColor: P.nuit, borderRadius: 6, padding: 8, marginBottom: 8 },
});
