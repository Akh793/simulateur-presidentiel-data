/**
 * Décors vectoriels de repli (format portrait 9:19.5), en attendant les décors peints de la Style Bible :
 * bureau doré en 3 éclairages (matin, après-midi, nuit), hémicycle, salle du Conseil des ministres, perron.
 * Formes simplifiées et génériques : boiseries, moulures dorées, fenêtre, bureau plat.
 */
import { memo } from "react";
import { useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import type { Eclairage } from "../../core/regles";
import { melange, P } from "../../theme/palette";

const LUMIERE: Record<Eclairage, { mur: string; fenetre: string; halo: number }> = {
  matin: { mur: melange(P.nuit, P.or, 0.22), fenetre: melange(P.papier, P.or, 0.35), halo: 0.35 },
  "apres-midi": { mur: melange(P.nuit, P.or, 0.3), fenetre: melange(P.or, P.rouge, 0.15), halo: 0.45 },
  nuit: { mur: P.nuit, fenetre: melange(P.nuit, P.cobalt, 0.4), halo: 0.12 },
};

export const BureauDore = memo(function BureauDore({ eclairage }: { eclairage: Eclairage }) {
  const { width, height } = useWindowDimensions();
  const l = LUMIERE[eclairage];
  return (
    <Svg width={width} height={height} viewBox="0 0 390 845" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="mur" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={l.mur} />
          <Stop offset="1" stopColor={P.nuit} />
        </LinearGradient>
      </Defs>
      <Rect width={390} height={845} fill="url(#mur)" />
      {[24, 140, 256].map((x) => (
        <G key={x} opacity={0.5}>
          <Rect x={x} y={70} width={110} height={300} rx={4} fill="none" stroke={P.or} strokeWidth={2} />
          <Rect x={x + 10} y={80} width={90} height={280} rx={3} fill="none" stroke={P.or} strokeWidth={0.8} />
          <Circle cx={x + 55} cy={70} r={7} fill="none" stroke={P.or} strokeWidth={1.4} />
        </G>
      ))}
      <Rect x={150} y={110} width={90} height={190} fill={l.fenetre} opacity={0.55} stroke={P.or} strokeWidth={2} />
      <Line x1={195} y1={110} x2={195} y2={300} stroke={P.or} strokeWidth={1.5} opacity={0.6} />
      <Line x1={150} y1={180} x2={240} y2={180} stroke={P.or} strokeWidth={1.5} opacity={0.6} />
      <Path d={`M120,300 L270,300 L330,845 L60,845 Z`} fill={P.or} opacity={l.halo * 0.25} />
      {eclairage === "nuit" ? <Circle cx={300} cy={420} r={60} fill={P.or} opacity={0.12} /> : null}
      <Rect x={0} y={640} width={390} height={205} fill={melange(P.nuit, P.or, 0.12)} />
      <Line x1={0} y1={640} x2={390} y2={640} stroke={P.or} strokeWidth={2} opacity={0.7} />
    </Svg>
  );
});

export const DecorHemicycle = memo(function DecorHemicycle() {
  const { width, height } = useWindowDimensions();
  return (
    <Svg width={width} height={height} viewBox="0 0 390 845" preserveAspectRatio="xMidYMid slice">
      <Rect width={390} height={845} fill={P.nuit} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Path key={i} d={`M${-40 + i * 6},${520 - i * 40} Q195,${170 - i * 30} ${430 - i * 6},${520 - i * 40}`} stroke={melange(P.rouge, P.nuit, 0.55)} strokeWidth={14} fill="none" opacity={0.4} />
      ))}
      <Rect x={150} y={560} width={90} height={60} fill={melange(P.or, P.nuit, 0.5)} opacity={0.5} />
    </Svg>
  );
});

/** Salle du Conseil : longue table, fauteuils, lustre, tapisseries (fond de l'onglet Acteurs). */
export const DecorConseil = memo(function DecorConseil() {
  const { width, height } = useWindowDimensions();
  return (
    <Svg width={width} height={height} viewBox="0 0 390 845" preserveAspectRatio="xMidYMid slice">
      <Rect width={390} height={845} fill={P.nuit} />
      {[30, 220].map((x) => <Rect key={x} x={x} y={90} width={140} height={230} fill={melange(P.nuit, P.rouge, 0.22)} stroke={P.or} strokeWidth={1.5} opacity={0.6} />)}
      <Line x1={195} y1={0} x2={195} y2={60} stroke={P.or} strokeWidth={1.2} opacity={0.6} />
      {[-36, -18, 0, 18, 36].map((dx) => <Circle key={dx} cx={195 + dx} cy={70 + Math.abs(dx) / 3} r={5} fill={P.or} opacity={0.45} />)}
      <Path d="M150,380 L240,380 L330,845 L60,845 Z" fill={melange(P.nuit, P.or, 0.18)} stroke={P.or} strokeWidth={1.5} opacity={0.7} />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = 420 + i * 68, d = 46 + i * 15;
        return <G key={i} opacity={0.55}><Rect x={195 - d - 52 - i * 4} y={y} width={22 + i * 2} height={30 + i * 3} rx={4} fill={melange(P.rouge, P.nuit, 0.4)} /><Rect x={195 + d + 30 + i * 2} y={y} width={22 + i * 2} height={30 + i * 3} rx={4} fill={melange(P.rouge, P.nuit, 0.4)} /></G>;
      })}
    </Svg>
  );
});

/** Perron : marches de pierre, colonnes, tapis, pupitre de presse (fond de la Une du 20h). */
export const DecorPerron = memo(function DecorPerron() {
  const { width, height } = useWindowDimensions();
  return (
    <Svg width={width} height={height} viewBox="0 0 390 845" preserveAspectRatio="xMidYMid slice">
      <Rect width={390} height={845} fill={melange(P.nuit, P.ardoise, 0.25)} />
      <Rect x={40} y={60} width={310} height={330} fill={melange(P.nuit, P.ardoise, 0.45)} stroke={P.or} strokeWidth={1} opacity={0.6} />
      {[70, 140, 250, 320].map((x) => <Rect key={x} x={x - 9} y={60} width={18} height={330} fill={melange(P.ardoise, P.papier, 0.18)} opacity={0.35} />)}
      <Rect x={160} y={190} width={70} height={200} fill={melange(P.nuit, P.or, 0.2)} stroke={P.or} strokeWidth={1.2} opacity={0.6} />
      {[0, 1, 2, 3, 4, 5].map((i) => <Rect key={i} x={20 - i * 12} y={390 + i * 26} width={350 + i * 24} height={26} fill={melange(P.ardoise, P.nuit, 0.35 + i * 0.06)} stroke={P.nuit} strokeWidth={1} opacity={0.7} />)}
      <Path d="M175,390 L215,390 L260,845 L130,845 Z" fill={P.rouge} opacity={0.35} />
      <Rect x={178} y={500} width={34} height={70} fill={P.nuit} stroke={P.or} strokeWidth={1} opacity={0.6} />
      {[184, 195, 206].map((x) => <Line key={x} x1={x} y1={500} x2={x - 6 + (x - 195) / 2} y2={470} stroke={P.papier} strokeWidth={1.5} opacity={0.5} />)}
    </Svg>
  );
});
