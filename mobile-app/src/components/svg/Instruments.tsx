/** Thermomètre comparatif France / zone euro et jauge liquide de trésorerie sur 30 jours. */
import { memo, useMemo } from "react";
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { euros, nombre, pourcent } from "../../../../mobile-core/src/narrative/format";
import { JALONS, jalonDuJour, type Jalon } from "../../core/regles";
import { melange, P } from "../../theme/palette";
import { chemin, echelleLineaire } from "./echelles";

/** Deux thermomètres côte à côte : taux à long terme de la France et de la zone euro. */
export function Thermometre({ france, zoneEuro, largeur }: { france: number; zoneEuro: number; largeur: number }) {
  const max = Math.max(1, Math.ceil(Math.max(france, zoneEuro) + 1)), h = 150;
  const col = (x: number, v: number, couleur: string, nom: string) => {
    const haut = 18 + (h - 58) * (1 - v / max);
    return (
      <G key={nom}>
        <Rect x={x - 9} y={14} width={18} height={h - 46} rx={9} fill={P.papier} stroke={P.nuit} strokeWidth={1.5} />
        <Rect x={x - 5} y={haut} width={10} height={h - 36 - haut} fill={couleur} />
        <Circle cx={x} cy={h - 26} r={14} fill={couleur} stroke={P.nuit} strokeWidth={1.5} />
        <SvgText x={x} y={10} fontSize={11} fontWeight="bold" fill={P.papier} textAnchor="middle">{pourcent(v, 2)}</SvgText>
        <SvgText x={x} y={h - 2} fontSize={11} fill={P.papier} textAnchor="middle">{nom}</SvgText>
      </G>
    );
  };
  return (
    <Svg width={largeur} height={h}>
      {[0, 0.5, 1].map((t) => <Line key={t} x1={largeur * 0.2} x2={largeur * 0.8} y1={18 + (h - 58) * t} y2={18 + (h - 58) * t} stroke={P.ardoise} strokeWidth={0.5} opacity={0.4} />)}
      {col(largeur * 0.33, france, P.rouge, "France")}
      {col(largeur * 0.67, zoneEuro, P.cobalt, "Zone euro")}
    </Svg>
  );
}

export interface JourTresorerie {
  date: string;
  etat: number;
  acoss: number;
  plafondAcoss: number;
  mouvements: { id: string; montant: number }[];
  murs: { libelle: string; montant: number; critique: boolean; compte: string }[];
}

const PICTO: Record<Jalon, string> = { caf: "C", pensions: "R", prelevements: "P", paie: "€" };

/**
 * Jauge liquide : réservoir dont le niveau suit la trésorerie de l'Acoss (marge sous le plafond d'emprunt) ;
 * courbe de la trésorerie de l'État avant refinancement ; jalons des jours 5, 9, 15 et 28 ; murs critiques en rouge.
 */
export const JaugeLiquide = memo(function JaugeLiquide({ jours, largeur, hauteur = 230, selection, onJour }: {
  jours: JourTresorerie[]; largeur: number; hauteur?: number; selection?: number | null; onJour?: (i: number) => void;
}) {
  const g = { haut: 26, bas: 34, gauche: 8, droite: 8 };
  const c = useMemo(() => {
    const sx = echelleLineaire(0, Math.max(1, jours.length - 1), g.gauche, largeur - g.droite);
    const plafond = Math.max(...jours.map((j) => j.plafondAcoss), 1);
    // niveau du liquide = marge d'emprunt restante de l'Acoss (plein = aucun emprunt, vide = plafond atteint)
    const marge = (j: JourTresorerie) => Math.max(0, Math.min(1, 1 - Math.max(0, -j.acoss) / j.plafondAcoss));
    const sy = echelleLineaire(0, 1, hauteur - g.bas, g.haut);
    const liquide = jours.map((j, i) => ({ x: sx(i), y: sy(marge(j)) }));
    const surface = `${chemin(liquide)} L${sx(jours.length - 1)},${hauteur - g.bas} L${sx(0)},${hauteur - g.bas} Z`;
    const etats = jours.map((j) => j.etat);
    const e0 = Math.min(...etats, 0), e1 = Math.max(...etats, 1);
    const se = echelleLineaire(e0, e1, hauteur - g.bas - 4, g.haut + 4);
    const etat = jours.map((j, i) => ({ x: sx(i), y: se(j.etat) }));
    return { sx, sy, surface, etat, plafond };
  }, [jours, largeur, hauteur]);
  return (
    <Svg width={largeur} height={hauteur}>
      <Defs>
        <LinearGradient id="eau" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={P.cobalt} stopOpacity={0.95} />
          <Stop offset="1" stopColor={P.nuit} stopOpacity={0.95} />
        </LinearGradient>
        <ClipPath id="cuve"><Rect x={g.gauche} y={g.haut} width={largeur - g.gauche - g.droite} height={hauteur - g.haut - g.bas} rx={10} /></ClipPath>
      </Defs>
      <Rect x={g.gauche} y={g.haut} width={largeur - g.gauche - g.droite} height={hauteur - g.haut - g.bas} rx={10} fill={melange(P.nuit, P.papier, 0.08)} stroke={P.or} strokeWidth={2} />
      <G clipPath="url(#cuve)">
        <Path d={c.surface} fill="url(#eau)" />
        <Path d={chemin(c.etat)} stroke={P.or} strokeWidth={2} fill="none" strokeDasharray="5 3" />
      </G>
      {jours.map((j, i) => {
        const jalons = jalonDuJour(j.mouvements);
        const critique = j.murs.some((m) => m.critique);
        const x = c.sx(i);
        return (
          <G key={j.date} onPress={onJour ? () => onJour(i) : undefined}>
            <Rect x={x - 6} y={g.haut} width={12} height={hauteur - g.haut} fill="transparent" />
            {critique ? <Line x1={x} x2={x} y1={g.haut} y2={hauteur - g.bas} stroke={P.rouge} strokeWidth={2.5} /> : null}
            {selection === i ? <Line x1={x} x2={x} y1={g.haut} y2={hauteur - g.bas} stroke={P.papier} strokeWidth={1} /> : null}
            {jalons.map((jl, k) => (
              <G key={jl}>
                <Circle cx={x} cy={hauteur - g.bas + 11 + k * 0} r={8} fill={critique ? P.rouge : P.or} stroke={P.nuit} strokeWidth={1} />
                <SvgText x={x} y={hauteur - g.bas + 14.5} fontSize={9} fontWeight="bold" fill={P.nuit} textAnchor="middle">{PICTO[jl]}</SvgText>
              </G>
            ))}
            {i % 5 === 0 ? <SvgText x={x} y={hauteur - 3} fontSize={9} fill={P.ardoise} textAnchor="middle">{j.date.slice(8, 10)}/{j.date.slice(5, 7)}</SvgText> : null}
          </G>
        );
      })}
      <SvgText x={g.gauche + 6} y={16} fontSize={10.5} fill={P.papier}>Marge d'emprunt de l'Acoss (plafond {euros(c.plafond)})</SvgText>
    </Svg>
  );
});

export const LEGENDE_JALONS = (Object.keys(JALONS) as Jalon[]).map((j) => `${PICTO[j]} = ${JALONS[j].libelle} (jour ${JALONS[j].jour})`);
export const formatMilliards = (v: number) => `${nombre(v / 1e9, 1)} Md€`;
