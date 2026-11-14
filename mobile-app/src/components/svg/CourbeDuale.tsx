/**
 * Courbe duale : trajectoire de référence (le Réel prolongé, pointillés gris) et trajectoire simulée du joueur
 * (trait plein), zone hachurée de brouillard statistique après la dernière publication, pastilles cliquables
 * d'attribution causale posées au jour de chaque décision.
 */
import { memo, useMemo } from "react";
import Svg, { Circle, Defs, G, Line, Path, Pattern, Rect, Text as SvgText } from "react-native-svg";
import { P } from "../../theme/palette";
import { chemin, domaine, echelleLineaire, sousEchantillonner, type Point } from "./echelles";

export interface PointCourbe {
  day: number;
  jeu: number;
  reference: number;
}

export interface PastilleCourbe {
  cle: string;
  day: number;
  favorable: boolean;
}

export const CourbeDuale = memo(function CourbeDuale({ points, largeur, hauteur = 150, brouillard, pastilles = [], onPastille, formatY }: {
  points: PointCourbe[]; largeur: number; hauteur?: number; brouillard?: { debut: number; fin: number } | null;
  pastilles?: PastilleCourbe[]; onPastille?: (cle: string) => void; formatY: (v: number, amplitude: number) => string;
}) {
  const g = { haut: 10, bas: 18, gauche: 6, droite: 58 };
  const calc = useMemo(() => {
    const pts = sousEchantillonner(points, 220);
    const [y0, y1] = domaine(pts.flatMap((p) => [p.jeu, p.reference]));
    const d0 = pts[0]?.day ?? 0, d1 = pts[pts.length - 1]?.day ?? 1;
    const sx = echelleLineaire(d0, Math.max(d1, d0 + 1), g.gauche, largeur - g.droite);
    const sy = echelleLineaire(y0, y1, hauteur - g.bas, g.haut);
    const ref: Point[] = pts.map((p) => ({ x: sx(p.day), y: sy(p.reference) }));
    const jeu: Point[] = pts.map((p) => ({ x: sx(p.day), y: sy(p.jeu) }));
    return { pts, y0, y1, sx, sy, ref, jeu };
  }, [points, largeur, hauteur]);
  const { pts, y0, y1, sx, sy } = calc;
  const valeurAu = (day: number) => {
    const p = pts.reduce((m, x) => (Math.abs(x.day - day) < Math.abs(m.day - day) ? x : m), pts[0] ?? { day, jeu: 0, reference: 0 });
    return sy(p.jeu);
  };
  return (
    <Svg width={largeur} height={hauteur}>
      <Defs>
        <Pattern id="hachures" patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
          <Line x1={0} y1={0} x2={0} y2={6} stroke={P.ardoise} strokeWidth={1.4} opacity={0.45} />
        </Pattern>
      </Defs>
      {[0, 0.5, 1].map((t) => {
        const v = y0 + (y1 - y0) * t;
        return (
          <G key={t}>
            <Line x1={g.gauche} x2={largeur - g.droite} y1={sy(v)} y2={sy(v)} stroke={P.ardoise} strokeWidth={0.5} opacity={0.35} />
            <SvgText x={largeur - g.droite + 4} y={sy(v) + 3} fontSize={9.5} fill={P.ardoise}>{formatY(v, y1 - y0)}</SvgText>
          </G>
        );
      })}
      {brouillard ? (
        <Rect x={sx(brouillard.debut)} y={g.haut} width={Math.max(2, sx(brouillard.fin) - sx(brouillard.debut))} height={hauteur - g.haut - g.bas} fill="url(#hachures)" />
      ) : null}
      <Path d={chemin(calc.ref)} stroke={P.ardoise} strokeWidth={1.6} strokeDasharray="4 4" fill="none" />
      <Path d={chemin(calc.jeu)} stroke={P.cobalt} strokeWidth={2.4} fill="none" />
      {pastilles.map((p) => (
        <G key={p.cle} onPress={onPastille ? () => onPastille(p.cle) : undefined}>
          <Circle cx={sx(p.day)} cy={valeurAu(p.day)} r={9} fill="transparent" />
          <Circle cx={sx(p.day)} cy={valeurAu(p.day)} r={5} fill={p.favorable ? P.or : P.rouge} stroke={P.nuit} strokeWidth={1.2} />
        </G>
      ))}
    </Svg>
  );
});
