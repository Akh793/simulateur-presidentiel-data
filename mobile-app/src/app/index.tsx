/** Accueil : état de la synchronisation, nouvelle partie sur la graine du jour, Archives de Crise, parties sauvegardées. */
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SCENARIOS } from "../../../mobile-core/src/archives/scenarios";
import { date as fdate } from "../../../mobile-core/src/narrative/format";
import { Bouton, Carte, Ecran, Texte, Titre } from "../components/base";
import { BureauDore } from "../components/svg/Decors";
import { useJeu } from "../core/jeu";
import { AGE_MAX_HEURES } from "../core/sync";
import { melange, P, POLICE } from "../theme/palette";

export default function Accueil() {
  const jeu = useJeu();
  const [details, setDetails] = useState(false);
  const lancer = async (f: () => Promise<void>) => { await f(); router.replace("/bureau"); };

  if (jeu.erreur && !jeu.pret) return <Ecran><View style={styles.centre}><Texte clair>Erreur d'initialisation : {jeu.erreur}</Texte></View></Ecran>;
  if (!jeu.pret || !jeu.sync) {
    return (
      <Ecran fond={<BureauDore eclairage="matin" />}>
        <View style={styles.centre}>
          <ActivityIndicator color={P.or} size="large" />
          <Texte clair style={{ marginTop: 12 }}>Synchronisation de la graine du jour…</Texte>
        </View>
      </Ecran>
    );
  }
  const s = jeu.sync;
  const enLigne = s.statut !== "hors_ligne";
  return (
    <Ecran fond={<BureauDore eclairage="matin" />}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.marque}>SIMULATEUR PRÉSIDENTIEL</Text>
        <Text style={styles.sous}>La France réelle, un mandat de 1 825 jours</Text>

        <Carte style={{ marginTop: 18 }}>
          <View style={styles.ligne}>
            <View style={[styles.voyant, { backgroundColor: enLigne ? P.cobalt : P.or }]} />
            <Text style={styles.statut}>
              {s.statut === "importee" ? "Graine du jour importée, empreinte SHA-256 vérifiée"
                : s.statut === "deja_presente" ? "Graine du jour déjà à jour"
                : "Hors ligne : archives embarquées"}
            </Text>
          </View>
          <Texte discret>Graine du {fdate(s.graine.dateJeu)} (révision {s.graine.revision})</Texte>
          {s.statut !== "hors_ligne" && s.ageHeures !== null && s.ageHeures > AGE_MAX_HEURES ? (
            <Texte style={{ color: P.rouge, marginTop: 4 }}>Graine publiée il y a {Math.round(s.ageHeures)} h : le relais n'a pas publié depuis. Elle reste jouable.</Texte>
          ) : null}
          {s.tentatives.length ? (
            <Pressable onPress={() => setDetails(!details)}><Texte discret style={{ marginTop: 4, textDecorationLine: "underline" }}>{details ? "Masquer" : "Voir"} le détail de la synchronisation</Texte></Pressable>
          ) : null}
          {details ? s.tentatives.map((t) => <Texte key={t} discret style={{ fontSize: 12 }}>• {t}</Texte>) : null}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1 }}><Bouton libelle="Nouveau mandat" desactive={jeu.occupe} onPress={() => lancer(() => jeu.nouvellePartie(s.graine.seedId))} /></View>
            <Bouton libelle="↻" variante="papier" desactive={jeu.occupe} onPress={() => void jeu.resynchroniser()} />
          </View>
        </Carte>

        {jeu.parties.length ? <Titre clair style={styles.section}>Reprendre</Titre> : null}
        {jeu.parties.map((p) => (
          <Carte key={p.sessionId} style={{ marginBottom: 8 }}>
            <Text style={styles.partie}>{p.label}</Text>
            <Texte discret>Jour {p.currentDay} · {fdate(p.gameDate)} · score {Math.round(p.progression.score)}{p.termine ? " · mandat achevé" : ""}</Texte>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}><Bouton petit libelle="Continuer" variante="cobalt" desactive={jeu.occupe} onPress={() => lancer(() => jeu.reprendre(p.sessionId))} /></View>
              <Bouton petit libelle="Supprimer" variante="papier" desactive={jeu.occupe} onPress={() => void jeu.supprimerPartie(p.sessionId)} />
            </View>
          </Carte>
        ))}

        <Titre clair style={styles.section}>Archives de Crise</Titre>
        <Texte clair style={{ marginBottom: 8, opacity: 0.85 }}>Un choc de même nature qu'une crise passée, rejoué sur la situation réelle de la graine embarquée.</Texte>
        {SCENARIOS.map((sc) => (
          <Carte key={sc.id} style={{ marginBottom: 10 }}>
            <Text style={styles.partie}>{sc.titre}</Text>
            <Texte discret style={{ marginBottom: 4 }}>{sc.periode}</Texte>
            <Texte>{sc.accroche}</Texte>
            {sc.sources.map((src) => (
              <Pressable key={src.url} onPress={() => void Linking.openURL(src.url)}>
                <Texte discret style={{ fontSize: 12, marginTop: 4, textDecorationLine: "underline" }}>Source{src.statut === "secondaire" ? " (secondaire)" : ""} : {src.titre}</Texte>
              </Pressable>
            ))}
            <View style={{ marginTop: 10 }}><Bouton petit libelle="Jouer ce scénario" variante="rouge" desactive={jeu.occupe} onPress={() => lancer(() => jeu.nouvellePartie(sc.seedBase, sc.id))} /></View>
          </Carte>
        ))}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  page: { padding: 16, paddingBottom: 40 },
  marque: { fontFamily: POLICE.titre, color: P.or, fontSize: 28, fontWeight: "900", letterSpacing: 2, marginTop: 24, textAlign: "center" },
  sous: { color: P.papier, textAlign: "center", marginTop: 6, fontSize: 14 },
  ligne: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  voyant: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: P.nuit },
  statut: { fontWeight: "700", color: P.nuit, flex: 1 },
  section: { marginTop: 22, marginBottom: 8 },
  partie: { fontFamily: POLICE.titre, fontWeight: "700", fontSize: 16, color: melange(P.nuit, P.rouge, 0.1) },
});
