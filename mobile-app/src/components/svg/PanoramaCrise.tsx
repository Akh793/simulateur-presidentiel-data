/**
 * Panoramas de crise vectoriels (bandeau 12:5), version de repli des 8 panoramas peints de la Style Bible.
 * Ligne claire : filet d'encre constant (nuit), aplats de la palette, aucun texte, aucun logo, aucune personne réelle.
 */
import { memo, type ReactNode } from "react";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Polyline, Rect } from "react-native-svg";
import type { ThemeCrise } from "../../core/regles";
import { melange, P } from "../../theme/palette";

const ENCRE = { stroke: P.nuit, strokeWidth: 1.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const ciel = (c: string) => <Rect width={360} height={150} fill={c} />;
const sol = (y: number, c: string) => <Rect x={0} y={y} width={360} height={150 - y} fill={c} {...ENCRE} />;

function Voiture({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <G>
      <Path d={`M${x},${y + 14} l6,-10 h28 l8,10 h6 v10 h-56 z`} fill={c} {...ENCRE} />
      <Rect x={x + 9} y={y + 6} width={10} height={7} fill={P.papier} {...ENCRE} strokeWidth={1} />
      <Rect x={x + 22} y={y + 6} width={10} height={7} fill={P.papier} {...ENCRE} strokeWidth={1} />
      <Circle cx={x + 10} cy={y + 24} r={5} fill={P.nuit} /><Circle cx={x + 40} cy={y + 24} r={5} fill={P.nuit} />
    </G>
  );
}

const SCENES: Record<ThemeCrise, () => ReactNode> = {
  carburant: () => (
    <G>
      {ciel(melange(P.papier, P.or, 0.25))}
      {sol(118, melange(P.ardoise, P.papier, 0.5))}
      <Rect x={190} y={34} width={150} height={12} fill={P.rouge} {...ENCRE} />
      <Line x1={205} y1={46} x2={205} y2={118} {...ENCRE} /><Line x1={325} y1={46} x2={325} y2={118} {...ENCRE} />
      {[240, 285].map((x) => (
        <G key={x}><Rect x={x} y={78} width={18} height={40} fill={P.papier} {...ENCRE} /><Rect x={x + 3} y={83} width={12} height={9} fill={P.nuit} /></G>
      ))}
      <Rect x={150} y={58} width={34} height={22} fill={P.rouge} {...ENCRE} /><Line x1={167} y1={80} x2={167} y2={118} {...ENCRE} />
      <Voiture x={14} y={95} c={P.cobalt} /><Voiture x={76} y={95} c={P.or} /><Voiture x={190} y={95} c={P.ardoise} />
      <Rect x={140} y={104} width={14} height={16} rx={2} fill={P.rouge} {...ENCRE} />
    </G>
  ),
  reseau: () => (
    <G>
      {ciel(P.nuit)}
      {([[0, 70, 40, 80], [44, 50, 34, 100], [82, 84, 50, 66], [136, 60, 30, 90], [300, 64, 60, 86]] as [number, number, number, number][]).map(([x, y, w, h], i) => (
        <Rect key={i} x={x} y={y} width={w} height={h} fill={melange(P.nuit, P.ardoise, 0.45)} stroke={melange(P.ardoise, P.papier, 0.3)} strokeWidth={1.2} />
      ))}
      {([[10, 82], [52, 66], [60, 96], [146, 76], [312, 80]] as [number, number][]).map(([x, y], i) => <Rect key={i} x={x} y={y} width={6} height={6} fill={P.or} />)}
      <G stroke={P.papier} strokeWidth={1.4} fill="none">
        <Polyline points="200,150 230,30 260,150" /><Line x1={208} y1={118} x2={252} y2={118} /><Line x1={215} y1={88} x2={245} y2={88} />
        <Line x1={222} y1={60} x2={238} y2={60} /><Line x1={208} y1={118} x2={245} y2={88} /><Line x1={252} y1={118} x2={215} y2={88} />
        <Line x1={196} y1={42} x2={264} y2={42} /><Path d="M196,42 Q150,60 100,52" /><Path d="M264,42 Q290,58 300,54" />
      </G>
      <Polygon points="300,50 312,40 306,52 318,48 304,62 308,54" fill={P.or} />
      <Circle cx={330} cy={24} r={9} fill={melange(P.papier, P.nuit, 0.2)} />
    </G>
  ),
  urgences: () => (
    <G>
      {ciel(melange(P.papier, P.cobalt, 0.12))}
      <Polygon points="0,150 140,92 220,92 360,150" fill={melange(P.papier, P.ardoise, 0.25)} {...ENCRE} />
      <Rect x={140} y={34} width={80} height={58} fill={melange(P.papier, P.cobalt, 0.3)} {...ENCRE} />
      <Line x1={0} y1={0} x2={140} y2={34} {...ENCRE} /><Line x1={360} y1={0} x2={220} y2={34} {...ENCRE} />
      <Circle cx={180} cy={20} r={8} fill={P.papier} {...ENCRE} /><Line x1={180} y1={20} x2={180} y2={15} {...ENCRE} /><Line x1={180} y1={20} x2={184} y2={22} {...ENCRE} />
      {([[24, 112, 1.2], [96, 102, 0.95], [244, 104, 1]] as [number, number, number][]).map(([x, y, k], i) => (
        <G key={i} transform={`translate(${x},${y}) scale(${k})`}>
          <Rect x={0} y={0} width={70} height={10} rx={3} fill={P.papier} {...ENCRE} />
          <Rect x={2} y={-6} width={22} height={8} rx={4} fill={melange(P.cobalt, P.papier, 0.6)} {...ENCRE} />
          <Line x1={8} y1={10} x2={8} y2={26} {...ENCRE} /><Line x1={62} y1={10} x2={62} y2={26} {...ENCRE} />
        </G>
      ))}
      <Rect x={300} y={40} width={24} height={10} rx={3} fill={P.cobalt} {...ENCRE} />
      <Path d="M296,36 l-8,-6 M328,36 l8,-6 M312,34 v-9" stroke={P.cobalt} strokeWidth={2} />
    </G>
  ),
  nappes: () => (
    <G>
      {ciel(melange(P.or, P.papier, 0.55))}
      <Circle cx={300} cy={34} r={18} fill={P.or} {...ENCRE} />
      {sol(78, melange(P.or, P.ardoise, 0.35))}
      <Path d="M0,104 Q90,92 180,106 T360,100 L360,124 Q270,118 180,128 T0,124 Z" fill={melange(P.or, P.ardoise, 0.55)} {...ENCRE} />
      <Path d="M30,90 l18,8 l-6,10 M120,84 l10,12 l14,-2 M220,88 l-8,10 l16,8 M300,86 l12,10 l-4,12 M70,134 l20,-6 l8,10 M250,136 l14,-8 l12,6" fill="none" {...ENCRE} strokeWidth={1.2} />
      <Rect x={150} y={40} width={10} height={60} fill={P.papier} {...ENCRE} />
      <Rect x={150} y={84} width={10} height={16} fill={P.cobalt} />
      <Line x1={146} y1={52} x2={164} y2={52} stroke={P.rouge} strokeWidth={2} />
    </G>
  ),
  blocage: () => (
    <G>
      {ciel(melange(P.papier, P.ardoise, 0.2))}
      {sol(92, melange(P.ardoise, P.papier, 0.35))}
      <Ellipse cx={180} cy={118} rx={70} ry={18} fill={melange(P.or, P.papier, 0.5)} {...ENCRE} />
      {([[40, 82], [250, 80]] as [number, number][]).map(([x, y], i) => (
        <G key={i}>
          <Rect x={x} y={y} width={44} height={22} rx={3} fill={P.rouge} {...ENCRE} />
          <Rect x={x + 26} y={y - 16} width={18} height={18} fill={P.papier} {...ENCRE} />
          <Circle cx={x + 10} cy={y + 26} r={11} fill={P.nuit} /><Circle cx={x + 38} cy={y + 28} r={7} fill={P.nuit} />
        </G>
      ))}
      {[120, 150, 182, 214].map((x) => <Rect key={x} x={x} y={96} width={26} height={16} rx={3} fill={P.or} {...ENCRE} />)}
      {([[150, 58], [200, 62]] as [number, number][]).map(([x, y], i) => (
        <G key={i}><Circle cx={x} cy={y} r={6} fill={melange(P.papier, P.or, 0.3)} {...ENCRE} /><Rect x={x - 7} y={y + 7} width={14} height={24} rx={3} fill={P.or} {...ENCRE} /></G>
      ))}
      <Path d="M300,60 q10,-20 0,-40 q-10,-20 6,-34" stroke={P.ardoise} strokeWidth={6} fill="none" opacity={0.5} />
    </G>
  ),
  marches: () => (
    <G>
      {ciel(melange(P.nuit, P.ardoise, 0.25))}
      {[0, 1, 2, 3].map((i) => (
        <G key={i}>
          <Rect x={14 + i * 86} y={18} width={76} height={50} fill={P.nuit} stroke={P.papier} strokeWidth={1.2} />
          <Polyline points={`${20 + i * 86},${30 + (i % 2) * 6} ${36 + i * 86},${36} ${50 + i * 86},${34} ${64 + i * 86},${50} ${84 + i * 86},${60}`} stroke={P.rouge} strokeWidth={2} fill="none" />
          <Line x1={20 + i * 86} y1={44} x2={84 + i * 86} y2={44} stroke={P.ardoise} strokeWidth={0.8} strokeDasharray="3 3" />
        </G>
      ))}
      <Rect x={0} y={108} width={360} height={42} fill={melange(P.ardoise, P.nuit, 0.4)} {...ENCRE} />
      {[30, 120, 210, 300].map((x) => (
        <G key={x}><Circle cx={x} cy={92} r={8} fill={melange(P.papier, P.or, 0.3)} {...ENCRE} /><Rect x={x - 11} y={100} width={22} height={12} rx={4} fill={P.cobalt} {...ENCRE} /></G>
      ))}
    </G>
  ),
  universite: () => (
    <G>
      {ciel(melange(P.papier, P.or, 0.15))}
      {[0, 1, 2, 3, 4].map((i) => (
        <Path key={i} d={`M${-10 - i * 10},${70 + i * 18} Q180,${50 + i * 16} ${370 + i * 10},${70 + i * 18}`} stroke={P.nuit} strokeWidth={1.4} fill="none" />
      ))}
      <Rect x={130} y={10} width={100} height={40} fill={P.nuit} {...ENCRE} />
      {([[30, 16, -4], [262, 18, 3]] as [number, number, number][]).map(([x, y, r], i) => (
        <G key={i} transform={`rotate(${r} ${x} ${y})`}><Rect x={x} y={y} width={70} height={26} fill={P.papier} {...ENCRE} /><Line x1={x} y1={y} x2={x - 8} y2={y - 8} {...ENCRE} /><Line x1={x + 70} y1={y} x2={x + 78} y2={y - 8} {...ENCRE} /></G>
      ))}
      {[60, 110, 170, 230, 290].map((x, i) => (
        <G key={x}><Circle cx={x} cy={96 + (i % 2) * 18} r={6} fill={melange(P.papier, P.or, 0.3)} {...ENCRE} /><Rect x={x - 8} y={103 + (i % 2) * 18} width={16} height={14} rx={3} fill={[P.rouge, P.cobalt, P.ardoise][i % 3]} {...ENCRE} /></G>
      ))}
    </G>
  ),
  prison: () => (
    <G>
      {ciel(melange(P.ardoise, P.papier, 0.55))}
      <Rect x={0} y={40} width={360} height={110} fill={melange(P.ardoise, P.papier, 0.25)} {...ENCRE} />
      {[20, 100, 180, 260].map((x) => (
        <G key={x}>
          <Rect x={x} y={56} width={60} height={40} fill={P.nuit} {...ENCRE} />
          {[0, 1, 2, 3, 4].map((k) => <Line key={k} x1={x + 8 + k * 11} y1={56} x2={x + 8 + k * 11} y2={96} stroke={melange(P.ardoise, P.papier, 0.5)} strokeWidth={2.2} />)}
          {[x + 16, x + 38].map((cx) => <Circle key={cx} cx={cx} cy={82} r={5} fill={melange(P.papier, P.or, 0.3)} />)}
        </G>
      ))}
      <Line x1={0} y1={112} x2={360} y2={112} {...ENCRE} />
      <Rect x={330} y={4} width={22} height={36} fill={melange(P.ardoise, P.nuit, 0.3)} {...ENCRE} />
      <Polygon points="326,6 341,-4 356,6" fill={P.nuit} />
      <Path d="M0,40 q15,-8 30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0" stroke={P.nuit} strokeWidth={1.2} fill="none" />
    </G>
  ),
};

export const LIBELLES_CRISES: Record<ThemeCrise, string> = {
  carburant: "Pénurie de carburants", reseau: "Réseau électrique sous tension", urgences: "Urgences saturées", nappes: "Nappes phréatiques au plus bas",
  blocage: "Blocage routier", marches: "Salle des marchés en alerte", universite: "Université occupée", prison: "Surpopulation carcérale",
};

export const PanoramaCrise = memo(function PanoramaCrise({ theme, hauteur = 110 }: { theme: ThemeCrise; hauteur?: number }) {
  return (
    <Svg width="100%" height={hauteur} viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" accessibilityLabel={LIBELLES_CRISES[theme]}>
      {SCENES[theme]()}
      <Rect x={0.8} y={0.8} width={358.4} height={148.4} fill="none" {...ENCRE} />
    </Svg>
  );
});
