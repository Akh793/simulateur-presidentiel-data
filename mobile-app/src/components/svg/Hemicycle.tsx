/** Hémicycle vectoriel : 577 sièges colorés par groupe (ou par position de vote prévue) et barre du seuil. */
import { memo, useMemo } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import { couleurGroupe } from "../../theme/groupes";
import { melange, P } from "../../theme/palette";
import { disposerHemicycle, type GroupeSieges } from "./hemicycle-layout";

export type Position = "pour" | "contre" | "abstention";
const COULEUR_VOTE: Record<Position, string> = { pour: P.cobalt, contre: P.rouge, abstention: P.or };

export const Hemicycle = memo(function Hemicycle({ groupes, total = 577, largeur, positions, selection, onSelection }: {
  groupes: GroupeSieges[]; total?: number; largeur: number; positions?: Record<string, Position> | null;
  selection?: string | null; onSelection?: (code: string) => void;
}) {
  const sieges = useMemo(() => disposerHemicycle(groupes, total, { largeur: 360 }), [groupes, total]);
  const parGroupe = useMemo(() => {
    const m = new Map<string | null, typeof sieges>();
    for (const s of sieges) m.set(s.groupe, [...(m.get(s.groupe) ?? []), s]);
    return [...m];
  }, [sieges]);
  const h = largeur * (190 / 360);
  return (
    <Svg width={largeur} height={h} viewBox="0 0 360 190">
      {parGroupe.map(([code, liste]) => {
        const couleur = code === null ? "none" : positions ? COULEUR_VOTE[positions[code] ?? "abstention"] : couleurGroupe(code);
        const attenue = selection && code !== selection;
        return (
          <G key={code ?? "vacants"} opacity={attenue ? 0.3 : 1} onPress={code && onSelection ? () => onSelection(code) : undefined}>
            {liste.map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={couleur} stroke={code === null ? P.ardoise : P.nuit} strokeWidth={code === null ? 0.6 : 0.35} />
            ))}
          </G>
        );
      })}
      <Rect x={150} y={170} width={60} height={14} rx={2} fill={P.or} stroke={P.nuit} strokeWidth={1} />
      <SvgText x={180} y={181} fontSize={9} fontWeight="bold" fill={P.nuit} textAnchor="middle">Perchoir</SvgText>
      <Line x1={180} y1={8} x2={180} y2={20} stroke={P.or} strokeWidth={1} />
    </Svg>
  );
});

/** Barre de majorité : sièges favorables estimés face au seuil (289 sur 577 par défaut). */
export function BarreSeuil({ pour, contre, total, seuil }: { pour: number; contre: number; total: number; seuil: number }) {
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ height: 18, flexDirection: "row", borderWidth: 1.5, borderColor: P.nuit, borderRadius: 3, overflow: "hidden", backgroundColor: melange(P.or, P.papier, 0.5) }}>
        <View style={{ width: `${(pour / total) * 100}%`, backgroundColor: P.cobalt }} />
        <View style={{ flex: 1 }} />
        <View style={{ width: `${(contre / total) * 100}%`, backgroundColor: P.rouge }} />
        <View style={{ position: "absolute", left: `${(seuil / total) * 100}%`, top: -2, bottom: -2, width: 3, backgroundColor: P.nuit }} />
      </View>
      <Text style={{ color: P.papier, fontSize: 12, marginTop: 4 }}>
        Pour {pour} · Contre {contre} · Seuil de majorité et de censure : {seuil} voix sur {total}
      </Text>
    </View>
  );
}
