/** En-tête du Bureau : horloge de la journée, date, capital politique, trésorerie et Situations Émergentes. */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { date as fdate, euros, pourcent } from "../../../mobile-core/src/narrative/format";
import { HEURES, type Emergente, type Phase } from "../core/regles";
import { melange, P } from "../theme/palette";
import { Jauge } from "./base";

function Horloge({ phase }: { phase: Phase }) {
  const [h, m] = HEURES[phase].split("h").map(Number) as [number, number];
  const ah = ((h % 12) + m / 60) * (Math.PI / 6), am = m * (Math.PI / 30);
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34">
      <Circle cx={17} cy={17} r={15} fill={P.papier} stroke={P.or} strokeWidth={2} />
      <Line x1={17} y1={17} x2={17 + 7 * Math.sin(ah)} y2={17 - 7 * Math.cos(ah)} stroke={P.nuit} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={17} y1={17} x2={17 + 11 * Math.sin(am)} y2={17 - 11 * Math.cos(am)} stroke={P.nuit} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={17} cy={17} r={1.6} fill={P.rouge} />
    </Svg>
  );
}

export function EnTete({ phase, dateIso, capital, plafondCP, soldeEtat, acoss, plafondAcoss, emergentes }: {
  phase: Phase; dateIso: string; capital: number; plafondCP: number; soldeEtat: number; acoss: number; plafondAcoss: number; emergentes: Emergente[];
}) {
  const usage = acoss < 0 && plafondAcoss > 0 ? (-acoss / plafondAcoss) * 100 : 0;
  return (
    <View style={styles.bloc}>
      <View style={styles.ligne}>
        <Horloge phase={phase} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.heure}>{HEURES[phase]}</Text>
          <Text style={styles.date}>{fdate(dateIso)}</Text>
        </View>
        <View style={{ width: 128 }}>
          <Text style={styles.etiquette}>Capital politique {Math.round(capital)}/{Math.round(plafondCP)}</Text>
          <Jauge valeur={capital} max={100} plafond={plafondCP} />
          <Text style={[styles.etiquette, { marginTop: 4 }]}>Acoss {pourcent(usage, 0)} du plafond</Text>
          <Jauge valeur={usage} max={100} couleur={usage >= 95 ? P.rouge : usage >= 85 ? P.or : P.cobalt} />
        </View>
      </View>
      <Text style={styles.tresor}>Solde de l'État depuis janvier : {euros(soldeEtat)}</Text>
      {emergentes.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 6 }}>
          {emergentes.map((e) => (
            <View key={e.cle} style={[styles.puce, { backgroundColor: e.niveau === 3 ? P.rouge : melange(P.or, P.nuit, 0.2) }]}>
              <Text style={styles.puceTexte} numberOfLines={1}>⚠ {e.libelle}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: melange(P.or, P.nuit, 0.5) },
  ligne: { flexDirection: "row", alignItems: "center" },
  heure: { color: P.or, fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  date: { color: P.papier, fontSize: 13 },
  etiquette: { color: P.papier, fontSize: 10.5, marginBottom: 2 },
  tresor: { color: melange(P.papier, P.ardoise, 0.3), fontSize: 12, marginTop: 6 },
  puce: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 300 },
  puceTexte: { color: P.papier, fontSize: 12, fontWeight: "700" },
});
