/** Icônes de navigation dessinées en ligne claire (aucune police d'icônes à télécharger). */
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type NomIcone = "bureau" | "hemicycle" | "cockpit" | "tresorerie" | "une";

export function Icone({ nom, couleur, taille = 24 }: { nom: NomIcone; couleur: string; taille?: number }) {
  const t = { stroke: couleur, strokeWidth: 1.8, fill: "none", strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      {nom === "bureau" ? <><Path d="M3,7 L9,7 L11,9 L21,9 L21,19 L3,19 Z" {...t} /><Path d="M3,11 L21,11" {...t} /></> : null}
      {nom === "hemicycle" ? <><Path d="M3,18 A9,9 0 0 1 21,18" {...t} /><Path d="M7,18 A5,5 0 0 1 17,18" {...t} /><Rect x={10} y={16} width={4} height={3} {...t} /></> : null}
      {nom === "cockpit" ? <><Path d="M3,20 L21,20" {...t} /><Path d="M4,16 L9,11 L13,14 L20,6" {...t} /><Path d="M4,14 L9,13 L13,15 L20,11" {...t} strokeDasharray="2 2" /></> : null}
      {nom === "tresorerie" ? <><Path d="M6,4 L18,4 L18,20 L6,20 Z" {...t} /><Path d="M6,13 Q9,11 12,13 Q15,15 18,13" {...t} /><Circle cx={12} cy={8} r={1.5} {...t} /></> : null}
      {nom === "une" ? <><Rect x={4} y={4} width={16} height={16} {...t} /><Path d="M7,8 L17,8 M7,12 L12,12 M7,15 L12,15 M14,12 L17,12 L17,16 L14,16 Z" {...t} /></> : null}
    </Svg>
  );
}
