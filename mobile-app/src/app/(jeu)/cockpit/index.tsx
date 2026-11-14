/** Cockpit : grille des 12 ministères (ministre fictif, indicateur le plus écarté du Réel) et thermomètre France / zone euro. */
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CATALOGUE } from "../../../../../engine/src/index";
import { MINISTERES } from "../../../../../engine/src/types";
import { Carte, Ecran, Texte, Titre } from "../../../components/base";
import { Thermometre } from "../../../components/svg/Instruments";
import { ModularPortrait } from "../../../components/svg/ModularPortrait";
import { etatMinistre } from "../../../components/svg/portrait-traits";
import { useJeu, useSession } from "../../../core/jeu";
import { nomMinistere } from "../../../core/libelles";
import { melange, P } from "../../../theme/palette";

export default function Cockpit() {
  const jeu = useJeu();
  const s = useSession();
  const { width } = useWindowDimensions();
  const tuiles = useMemo(() => MINISTERES.map((m) => {
    const ids = CATALOGUE.filter((c) => c.ministere === m && c.sens !== 0);
    const pire = ids.map((c) => ({ c, e: c.sens * s.sim.ecartUnites(c.id) })).sort((a, b) => a.e - b.e)[0];
    return { m, ministre: s.sim.acteurs.ministres.find((x) => x.ministere === m)!, pire };
  }), [jeu.version, s]);
  const larg = (width - 14 * 2 - 10) / 2;
  return (
    <Ecran>
      <ScrollView contentContainerStyle={styles.page}>
        <Titre clair>Cockpit des 12 ministères</Titre>
        <Texte clair style={{ opacity: 0.8 }}>Écart à la trajectoire de référence (le Réel prolongé sans vos décisions).</Texte>
        <Carte style={{ backgroundColor: P.nuit, borderColor: P.or, marginTop: 12 }}>
          <Text style={styles.thermoTitre}>Taux à long terme : France face à la zone euro</Text>
          <Thermometre france={s.sim.valeur("FIN1")} zoneEuro={s.sim.valeur("FIN4")} largeur={width - 60} />
          <Texte clair style={{ fontSize: 11, opacity: 0.75 }}>Zone euro : agrégat Eurostat « EA » (la série EA20 est vide dans la source).</Texte>
        </Carte>
        <View style={styles.grille}>
          {tuiles.map(({ m, ministre, pire }) => {
            const e = pire?.e ?? 0;
            const couleur = e <= -1.5 ? P.rouge : e <= -0.5 ? P.or : P.cobalt;
            const etat = etatMinistre(ministre);
            return (
              <Pressable key={m} onPress={() => router.push({ pathname: "/cockpit/[ministere]", params: { ministere: m } })} style={[styles.tuile, { width: larg, borderColor: couleur }]}>
                <ModularPortrait graine={ministre.nom} expression={etat.expression} fatigue={etat.fatigue} taille={54} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.min} numberOfLines={2}>{nomMinistere(m)}</Text>
                  <Text style={styles.nom} numberOfLines={1}>{ministre.nom}</Text>
                  {pire ? <Text style={[styles.alerte, { color: couleur }]} numberOfLines={2}>{pire.c.libelle}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  page: { padding: 14, paddingBottom: 30 },
  thermoTitre: { color: P.papier, fontWeight: "700", marginBottom: 6 },
  grille: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  tuile: { flexDirection: "row", gap: 8, backgroundColor: P.papier, borderWidth: 2, borderRadius: 6, padding: 8, alignItems: "center" },
  min: { fontWeight: "800", fontSize: 12.5, color: P.nuit },
  nom: { fontSize: 11.5, color: melange(P.nuit, P.ardoise, 0.5) },
  alerte: { fontSize: 11, fontWeight: "700", marginTop: 2 },
});
