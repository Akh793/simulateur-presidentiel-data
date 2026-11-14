/**
 * Extraction de l'état du moteur vers les structures de mobile-core (état narratif, ligne d'historique,
 * pastilles d'attribution). Lecture seule : aucune de ces fonctions ne modifie la simulation.
 */
import { CATALOGUE, SEUIL_BLOCAGE, calendrier as cal, type Interruption, type Simulation } from "../../../engine/src/index";
import { BOUSSOLE_NEUTRE } from "../../../engine/src/types";
import type { EtatNarratif } from "../narrative/etat";
import type { DecisionJournal, PartAttribution, Pastille, TurnRecord } from "../types";

export const CATALOGUE_IDS: readonly string[] = CATALOGUE.map((s) => s.id);

export function partsAttribution(sim: Simulation, id: string): PartAttribution[] {
  const origines = new Map(sim.macro.impulsions.map((x) => [x.id, x.origine]));
  const parts = sim.attribution(id).filter((p) => Math.abs(p.contribution) > 1e-12);
  const total = parts.reduce((s, p) => s + Math.abs(p.contribution), 0) || 1;
  return parts
    .map((p) => ({ impulsion: p.id, libelle: p.libelle, origine: origines.get(p.id) ?? "evenement", contribution: p.contribution, part: Math.abs(p.contribution) / total }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

/** Pastilles d'attribution causale : indicateurs les plus écartés du Réel, avec la part de chaque décision ou événement. */
export function pastilles(sim: Simulation, max = 6, seuilUnites = 0.5): Pastille[] {
  return CATALOGUE
    .filter((s) => s.pilote === "macro")
    .map((s) => ({ s, e: sim.ecartUnites(s.id) }))
    .filter((x) => Math.abs(x.e) >= seuilUnites)
    .sort((a, b) => Math.abs(b.e) - Math.abs(a.e))
    .slice(0, max)
    .map(({ s }) => ({
      indicateur: s.id, libelle: s.libelle, unite: s.unite, ecart: sim.valeur(s.id) - sim.valeurReference(s.id),
      parts: partsAttribution(sim, s.id).slice(0, 5),
    }));
}

export function etatNarratif(sim: Simulation, scenario: EtatNarratif["scenario"] = null): EtatNarratif {
  const date = sim.date;
  const { y } = cal.ymd(date);
  const cites = new Set(sim.parapheurCourant.flatMap((d) => d.indicateurs));
  const anomalies = new Map(sim.graine.pilotage.map((p) => [p.id, { methode: p.anomalie.methode, score: p.anomalie.score, seuil: p.anomalie.seuil }]));
  return {
    jour: sim.jour, date, seed: sim.seed,
    capitalPolitique: sim.capitalPolitique, plafondCP: sim.parlement.plafondCP, credibilite: sim.credibilite,
    opinion: sim.acteurs.opinion(), opinion90: sim.opinion90(), seuilBlocage: SEUIL_BLOCAGE,
    indicateurs: CATALOGUE.map((s) => ({
      id: s.id, libelle: s.libelle, unite: s.unite, ministere: s.ministere, famille: s.famille, origine: s.origine, sens: s.sens,
      jeu: sim.valeur(s.id), reference: sim.valeurReference(s.id), ecartUnites: sim.ecartUnites(s.id), publiee: sim.publiees[s.id] ?? null,
      normale: sim.normaleRecente(s.id), anomalieGraine: anomalies.get(s.id) ?? null,
    })),
    tresorerie: {
      soldeEtat: sim.livre.soldeEtatAnnee, soldeEtatRef: sim.livreRef.soldeEtatAnnee,
      dette: sim.livre.stocks.detteNegociable, detteRef: sim.livreRef.stocks.detteNegociable,
      acoss: sim.livre.stocks.tresorerieAcoss, plafondAcoss: sim.plafondAcoss(y) + sim.plafondAcossBonus, tauxLong: sim.valeur("FIN1"),
    },
    segments: sim.acteurs.segments.map((s) => ({ id: s.id, poids: s.poids, approbation: s.approbation })),
    corps: sim.acteurs.corps.map((c) => ({
      id: c.id, libelle: c.libelle, radicalisation: c.radicalisation, approbation: c.approbation,
      bloque: c.bloqueJusqua !== null && c.bloqueJusqua >= sim.jour, blocage: c.blocage.libelle,
    })),
    ministres: sim.acteurs.ministres.map((m) => ({ ministere: m.ministere, nom: m.nom, competence: m.competence, loyaute: m.loyaute, popularite: m.popularite, tension: m.tension })),
    parlement: {
      seuilCensure: sim.parlement.seuilCensure(), siegesTotal: sim.parlement.an.siegesTotal,
      // soutien estimé = votes « pour » prévus au prochain scrutin de l'Assemblée (même calcul que l'hémicycle)
      soutien: sim.parlement.voter(sim.parlement.an, (sim.parlement.textes.find((t) => t.statut === "en_cours" && t.jalons.some((j) => !j.fait && j.nom === "vote_an"))
        ?? sim.parlement.textes.find((t) => t.statut === "en_cours"))?.boussole ?? BOUSSOLE_NEUTRE, sim.acteurs.opinion(), sim.credibilite).pour,
      textes: sim.parlement.textes.filter((t) => t.statut === "en_cours").map((t) => {
        const j = t.jalons.find((x) => !x.fait && x.date >= date);
        return { id: t.id, titre: t.titre, type: t.type, prochaine: j ? { nom: j.nom, date: j.date } : null };
      }),
    },
    murs: sim.livre.calendrier(cal.addDays(date, 1), 7).map((m) => ({ date: m.date, libelle: m.libelle, montant: m.montant })),
    attribution: Object.fromEntries([...cites].map((id) => [id, partsAttribution(sim, id)])),
    scenario,
  };
}

/** Ligne d'historique du jour courant (valeurs Jeu / Référence dans l'ordre du catalogue). */
export function ligneDuJour(sim: Simulation, interruptions: Interruption[], decisions: DecisionJournal[] = []): TurnRecord {
  const sc = sim.score();
  return {
    day: sim.jour, date: sim.date,
    jeu: CATALOGUE_IDS.map((id) => sim.valeur(id)), reference: CATALOGUE_IDS.map((id) => sim.valeurReference(id)),
    synthese: {
      opinion: sim.acteurs.opinion(), opinion90: sim.opinion90(), capitalPolitique: sim.capitalPolitique, plafondCP: sim.parlement.plafondCP,
      credibilite: sim.credibilite, score: sc.total, detteJeu: sim.livre.stocks.detteNegociable, detteRef: sim.livreRef.stocks.detteNegociable,
      soldeJeu: sim.livre.soldeEtatAnnee, soldeRef: sim.livreRef.soldeEtatAnnee,
    },
    decisions, interruptions, attribution: null, une: null, breves: null,
  };
}
