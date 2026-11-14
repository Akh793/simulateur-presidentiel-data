/**
 * Portrait modulaire en ligne claire, 4 calques superposés (dans l'ordre de rendu) :
 *  1. morphologie (cou, oreilles, forme du visage, teint) ;
 *  2. tenue ministérielle (veste, chemise, cravate, foulard ou col ouvert, épinglette) ;
 *  3. coiffure et accessoires (cheveux, lunettes, barbe) ;
 *  4. expression (4 états) et cernes de fatigue selon l'usure.
 * Personnages entièrement fictifs, générés à partir d'une graine : aucun trait ne vise une personne réelle.
 * Les calques peints selon la Style Bible (PNG transparents 1024 × 1024) pourront remplacer ces vecteurs.
 */
import { memo, useMemo } from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { melange, P } from "../../theme/palette";
import { traits, type Expression, type TraitsPortrait } from "./portrait-traits";

const TRAIT = { stroke: P.nuit, strokeWidth: 1.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Morphologie({ t }: { t: TraitsPortrait }) {
  const ombre = melange(t.teint, P.nuit, 0.18);
  const visage = {
    ovale: <Ellipse cx={60} cy={60} rx={25} ry={31} fill={t.teint} {...TRAIT} />,
    rond: <Ellipse cx={60} cy={62} rx={28} ry={28} fill={t.teint} {...TRAIT} />,
    long: <Ellipse cx={60} cy={60} rx={22} ry={34} fill={t.teint} {...TRAIT} />,
    carre: <Path d="M35,42 Q35,29 60,29 Q85,29 85,42 L85,72 Q85,92 60,92 Q35,92 35,72 Z" fill={t.teint} {...TRAIT} />,
  }[t.morphologie];
  return (
    <G>
      <Path d="M50,84 L50,100 Q60,106 70,100 L70,84 Z" fill={ombre} {...TRAIT} />
      <Ellipse cx={34} cy={62} rx={5} ry={8} fill={t.teint} {...TRAIT} />
      <Ellipse cx={86} cy={62} rx={5} ry={8} fill={t.teint} {...TRAIT} />
      {visage}
    </G>
  );
}

function Tenue({ t }: { t: TraitsPortrait }) {
  return (
    <G>
      <Path d="M8,140 Q12,106 44,98 L60,116 L76,98 Q108,106 112,140 Z" fill={t.veste} {...TRAIT} />
      <Path d="M46,97 L60,116 L74,97 Q60,104 46,97 Z" fill={P.papier} {...TRAIT} />
      {t.col === "cravate" ? <Path d="M57,104 L63,104 L66,130 L60,136 L54,130 Z" fill={t.accent} {...TRAIT} /> : null}
      {t.col === "foulard" ? <Path d="M48,100 Q60,112 72,100 Q66,116 60,118 Q54,116 48,100 Z" fill={t.accent} {...TRAIT} /> : null}
      <Path d="M44,98 L52,126 M76,98 L68,126" {...TRAIT} fill="none" />
      <Circle cx={86} cy={116} r={2.8} fill={P.or} {...TRAIT} strokeWidth={1} />
    </G>
  );
}

function Coiffure({ t }: { t: TraitsPortrait }) {
  const c = { fill: t.cheveux, ...TRAIT };
  const cheveux = {
    courte: <Path d="M33,56 Q30,24 60,22 Q90,24 87,56 Q82,38 60,36 Q40,37 33,56 Z" {...c} />,
    raie: <Path d="M33,58 Q29,22 62,21 Q91,24 87,58 Q84,36 70,33 Q58,40 40,40 Q35,46 33,58 Z" {...c} />,
    carre_plongeant: <Path d="M30,82 Q24,26 60,22 Q96,26 90,82 L82,82 Q86,46 70,36 Q56,44 38,44 Q34,60 38,82 Z" {...c} />,
    chignon: <G><Circle cx={60} cy={20} r={10} {...c} /><Path d="M33,56 Q30,26 60,25 Q90,26 87,56 Q80,40 60,38 Q40,40 33,56 Z" {...c} /></G>,
    degarnie: <G><Path d="M32,62 Q31,46 38,40 Q40,52 38,62 Z" {...c} /><Path d="M88,62 Q89,46 82,40 Q80,52 82,62 Z" {...c} /></G>,
    boucles: <Path d="M32,60 Q22,50 30,40 Q28,26 42,26 Q48,16 60,20 Q72,16 78,26 Q92,26 90,40 Q98,50 88,60 Q84,44 74,40 Q60,46 46,40 Q36,44 32,60 Z" {...c} />,
  }[t.coiffure];
  return (
    <G>
      {cheveux}
      {t.barbe ? <Path d="M40,72 Q42,94 60,96 Q78,94 80,72 Q74,84 60,84 Q46,84 40,72 Z" fill={t.cheveux} {...TRAIT} opacity={0.92} /> : null}
      {t.lunettes ? (
        <G fill="none" {...TRAIT}>
          <Rect x={41} y={55} width={15} height={10} rx={3} />
          <Rect x={64} y={55} width={15} height={10} rx={3} />
          <Path d="M56,59 Q60,57 64,59" />
        </G>
      ) : null}
    </G>
  );
}

const SOURCILS: Record<Expression, [number, number]> = { neutre: [0, 0], confiant: [-1, -1], inquiet: [3, -2], colere: [-4, 3] };

function ExpressionCalque({ t }: { t: TraitsPortrait }) {
  const [interieur, exterieur] = SOURCILS[t.expression];
  const bouche = {
    neutre: "M52,80 Q60,82 68,80",
    confiant: "M50,78 Q60,88 70,78",
    inquiet: "M52,83 Q60,78 68,83",
    colere: "M51,83 Q60,79 69,83",
  }[t.expression];
  const yeuxFermes = t.expression === "confiant";
  return (
    <G>
      <Path d={`M42,${51 + exterieur} L55,${51 + interieur}`} {...TRAIT} strokeWidth={2.4} fill="none" />
      <Path d={`M65,${51 + interieur} L78,${51 + exterieur}`} {...TRAIT} strokeWidth={2.4} fill="none" />
      {yeuxFermes ? (
        <G fill="none" {...TRAIT}><Path d="M44,61 Q48.5,57 53,61" /><Path d="M67,61 Q71.5,57 76,61" /></G>
      ) : (
        <G>
          <Ellipse cx={48.5} cy={60} rx={2.6} ry={t.expression === "inquiet" ? 3.2 : 2.4} fill={P.nuit} />
          <Ellipse cx={71.5} cy={60} rx={2.6} ry={t.expression === "inquiet" ? 3.2 : 2.4} fill={P.nuit} />
          {t.fatigue > 0.45 ? <G fill={t.teint} {...TRAIT} strokeWidth={1}><Path d="M45,57 L52,57 L52,59 L45,59 Z" /><Path d="M68,57 L75,57 L75,59 L68,59 Z" /></G> : null}
        </G>
      )}
      {t.fatigue > 0.2 ? (
        <G fill="none" stroke={melange(P.ardoise, P.nuit, 0.3)} strokeWidth={1.2} opacity={Math.min(0.9, t.fatigue)}>
          <Path d="M44,65 Q48.5,68 53,65" /><Path d="M67,65 Q71.5,68 76,65" />
        </G>
      ) : null}
      <Path d="M60,62 L57,72 L61,73" fill="none" {...TRAIT} strokeWidth={1.3} />
      <Path d={bouche} fill="none" {...TRAIT} strokeWidth={2} />
    </G>
  );
}

export const ModularPortrait = memo(function ModularPortrait({ graine, expression, fatigue, taille = 72, fond = melange(P.papier, P.or, 0.2) }: {
  graine: string; expression: Expression; fatigue: number; taille?: number; fond?: string;
}) {
  const t = useMemo(() => traits(graine, { expression, fatigue }), [graine, expression, fatigue]);
  return (
    <Svg width={taille} height={(taille * 140) / 120} viewBox="0 0 120 140">
      <Rect x={1} y={1} width={118} height={138} rx={8} fill={fond} stroke={P.nuit} strokeWidth={1.5} />
      <Morphologie t={t} />
      <Tenue t={t} />
      <Coiffure t={t} />
      <ExpressionCalque t={t} />
    </Svg>
  );
});
