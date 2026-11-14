/**
 * Partie en cours : relie le moteur (engine/), la persistance (db/) et la narration (narrative/).
 *
 * - `avancer()` rejoue la boucle d'avance rapide du moteur jour par jour (7 jours au plus, arrêt au premier
 *   événement critique) pour journaliser CHAQUE jour dans `turn_history`, puis narre le tour et sauvegarde.
 * - Chaque arbitrage (décision, 49.3, promesse, remaniement, dissolution, Matignon, objectif) est suivi d'une
 *   sauvegarde automatique atomique (état + journal du jour).
 * - La narration d'un tour est figée : rouvrir la partie ou arbitrer ne change pas le texte des dossiers déjà présentés.
 */
import { Simulation, type ConfigSimulation, type Interruption, type Ministere, type ResultatDecision } from "../../../engine/src/index";
import { scenario as scenarioParId, appliquerScenario } from "../archives/scenarios";
import type { StorageService } from "../db/storage";
import type { DerniereDecision, EtatNarratif } from "../narrative/etat";
import { buildTurnNarrative } from "../narrative/generator";
import { MEMOIRE_VIDE, type MemoireNarrative, type NarrationTour } from "../narrative/types";
import type { DecisionJournal, Progression, SaveRecord, TurnRecord } from "../types";
import { CATALOGUE_IDS, etatNarratif, ligneDuJour, pastilles } from "./snapshot";

export const VERSION_MOTEUR = 1;

/** Ce qui est persisté dans `saves.narrative_memory` : mémoire anti-répétition + contexte du tour en cours. */
type MemoirePersistee = MemoireNarrative & { debutTour?: MemoireNarrative; derniere?: DerniereDecision | null };

export interface OptionsNouvellePartie {
  seedId: string;
  scenarioId?: string;
  label?: string;
  sessionId?: string;
  config?: ConfigSimulation;
}

export interface ResultatTour {
  jours: number;
  interruptions: Interruption[];
  narration: NarrationTour;
  fin: boolean;
}

function idSession(seedId: string): string {
  const alea = Math.floor(Math.random() * 0x7fffffff).toString(36);
  return `${seedId.replace(/[^a-z0-9-]/gi, "")}-${Date.now().toString(36)}-${alea}`;
}

export class GameSession {
  private narrationCourante: NarrationTour;
  private derniere: DerniereDecision | null = null;
  private nbDecisions = 0;

  private constructor(
    readonly storage: StorageService,
    readonly sim: Simulation,
    readonly meta: { sessionId: string; seedId: string; seedDate: string; scenarioId: string | null; label: string; createdAt?: string },
    private memoireDebutTour: MemoireNarrative,
    private memoire: MemoireNarrative,
    derniere: DerniereDecision | null = null,
  ) {
    this.derniere = derniere;
    this.narrationCourante = this.narrer(memoireDebutTour);
  }

  static async nouvelle(storage: StorageService, o: OptionsNouvellePartie): Promise<GameSession> {
    const graine = await storage.graine(o.seedId);
    const sim = new Simulation(graine, o.config);
    const sc = o.scenarioId ? scenarioParId(o.scenarioId) : null;
    if (sc) appliquerScenario(sim, sc);
    const s = new GameSession(storage, sim, {
      sessionId: o.sessionId ?? idSession(o.seedId), seedId: o.seedId, seedDate: graine.meta.date_jeu, scenarioId: sc?.id ?? null,
      label: o.label ?? sc?.titre ?? `Mandat du ${graine.meta.date_jeu}`,
    }, MEMOIRE_VIDE, MEMOIRE_VIDE);
    s.memoire = s.narrationCourante.memoire;
    const j0 = ligneDuJour(sim, []);
    j0.une = s.narrationCourante.une;
    j0.breves = s.narrationCourante.breves;
    j0.attribution = pastilles(sim);
    await storage.sauvegarder(s.enregistrement(), [j0]);
    return s;
  }

  static async reprendre(storage: StorageService, sessionId: string): Promise<GameSession> {
    const save = await storage.chargerPartie(sessionId);
    if (!save) throw new Error(`partie introuvable : ${sessionId}`);
    if (save.engineVersion !== VERSION_MOTEUR) throw new Error(`sauvegarde du moteur v${save.engineVersion}, moteur actuel v${VERSION_MOTEUR}`);
    if (save.catalogue.join(",") !== CATALOGUE_IDS.join(",")) throw new Error("catalogue d'indicateurs modifié depuis la sauvegarde");
    const graine = await storage.graine(save.seedId);
    const sim = Simulation.restaurer(graine, save.state);
    const m = save.memoire as MemoirePersistee;
    const s = new GameSession(storage, sim, {
      sessionId: save.sessionId, seedId: save.seedId, seedDate: save.seedDate, scenarioId: save.scenarioId, label: save.label, createdAt: save.createdAt,
    }, m.debutTour ?? MEMOIRE_VIDE, { v: 1, recents: m.recents }, m.derniere ?? null);
    s.nbDecisions = save.progression.decisions;
    return s;
  }

  get sessionId(): string {
    return this.meta.sessionId;
  }

  /** Narration du tour en cours (Parapheur, notes, Une, brèves). */
  get narration(): NarrationTour {
    return this.narrationCourante;
  }

  etat(): EtatNarratif {
    const sc = this.meta.scenarioId ? scenarioParId(this.meta.scenarioId) : null;
    return etatNarratif(this.sim, sc ? { id: sc.id, titre: sc.titre, evenement: sc.evenement } : null);
  }

  private narrer(memoire: MemoireNarrative): NarrationTour {
    return buildTurnNarrative(this.etat(), this.sim.parapheurCourant, this.derniere, { memoire });
  }

  private progression(): Progression {
    return {
      score: this.sim.score().total, opinion90: this.sim.opinion90(), capitalPolitique: this.sim.capitalPolitique,
      credibilite: this.sim.credibilite, decisions: this.nbDecisions, fin: this.sim.fin,
    };
  }

  private enregistrement(): Omit<SaveRecord, "createdAt" | "updatedAt"> {
    return {
      sessionId: this.meta.sessionId, seedId: this.meta.seedId, seedDate: this.meta.seedDate, scenarioId: this.meta.scenarioId,
      label: this.meta.label, currentDay: this.sim.jour, gameDate: this.sim.date, engineSeed: this.sim.seed, engineVersion: VERSION_MOTEUR,
      state: this.sim.serialiser(),
      memoire: { ...this.memoire, debutTour: this.memoireDebutTour, derniere: this.derniere } as MemoirePersistee,
      catalogue: [...CATALOGUE_IDS], progression: this.progression(), termine: this.sim.fin,
    };
  }

  /**
   * Avance rapide (7 jours au plus) avec journalisation quotidienne, narration du nouveau tour et sauvegarde.
   * `surJour` est appelé après chaque jour simulé (animation du défilement des jours dans l'interface).
   */
  async avancer(maxJours = 7, opts: { surJour?: (j: { jour: number; date: string; interruptions: Interruption[] }) => void | Promise<void> } = {}): Promise<ResultatTour> {
    const lignes: TurnRecord[] = [];
    const toutes: Interruption[] = [];
    let n = 0;
    while (n < maxJours && !this.sim.fin) {
      const its = this.sim.etapeJour();
      n++;
      toutes.push(...its);
      lignes.push(ligneDuJour(this.sim, its));
      if (opts.surJour) await opts.surJour({ jour: this.sim.jour, date: this.sim.date, interruptions: its });
      if (its.some((x) => x.critique)) break;
    }
    this.memoireDebutTour = this.memoire;
    this.narrationCourante = this.narrer(this.memoireDebutTour);
    this.memoire = this.narrationCourante.memoire;
    const der = lignes[lignes.length - 1];
    if (der) {
      der.attribution = pastilles(this.sim);
      der.une = this.narrationCourante.une;
      der.breves = this.narrationCourante.breves;
    }
    await this.storage.sauvegarder(this.enregistrement(), lignes);
    return { jours: n, interruptions: toutes, narration: this.narrationCourante, fin: this.sim.fin };
  }

  private async arbitrage(type: DecisionJournal["type"], libelle: string, r: ResultatDecision, cible?: string): Promise<ResultatDecision> {
    const d: DecisionJournal = { type, libelle, ok: r.ok, message: r.message, coutCP: r.ok ? r.coutCP : 0, jour: this.sim.jour, ...(cible ? { cible } : {}) };
    if (r.ok) this.nbDecisions++;
    this.derniere = { libelle, ok: r.ok, jour: this.sim.jour, ...(type === "decider" && cible ? { gabaritId: cible } : {}) };
    // Les dossiers déjà narrés gardent leur texte ; un dossier retiré disparaît, un nouveau est narré avec la même mémoire.
    this.narrationCourante = this.narrer(this.memoireDebutTour);
    await this.storage.sauvegarder(this.enregistrement(), [], { day: this.sim.jour, d });
    return r;
  }

  decider(gabaritId: string, dossierId?: string): Promise<ResultatDecision> {
    const libelle = this.narrationCourante.dossiers.flatMap((x) => x.options).find((o) => o.gabaritId === gabaritId)?.libelle ?? gabaritId;
    return this.arbitrage("decider", libelle, this.sim.decider(gabaritId, dossierId), gabaritId);
  }

  engager493(texteId: string): Promise<ResultatDecision> {
    const t = this.sim.parlement.texte(texteId);
    return this.arbitrage("engager493", `Engagement de responsabilité sur « ${t?.titre ?? texteId} »`, this.sim.engager493(texteId), texteId);
  }

  signerPromesse(groupe: string, gabaritId: string, type: "adopter" | "renoncer", jours: number): Promise<ResultatDecision> {
    return this.arbitrage("promesse", `Engagement envers un groupe parlementaire (${type === "adopter" ? "adopter" : "renoncer à"} une mesure)`,
      this.sim.signerPromesse(groupe, gabaritId, type, jours), gabaritId);
  }

  remanier(ministere: Ministere): Promise<ResultatDecision> {
    return this.arbitrage("remaniement", "Remaniement ministériel", this.sim.remanier(ministere), ministere);
  }

  dissoudre(): Promise<ResultatDecision> {
    return this.arbitrage("dissolution", "Dissolution de l'Assemblée nationale", this.sim.dissoudre());
  }

  changerMatignon(): Promise<ResultatDecision> {
    return this.arbitrage("matignon", "Changement de Premier ministre", this.sim.changerMatignon());
  }

  annoncerObjectif(indicateur: string, cible: number, sens: "au_moins" | "au_plus"): Promise<ResultatDecision> {
    return this.arbitrage("objectif", "Objectif public annoncé", this.sim.annoncerObjectif(indicateur, cible, sens), indicateur);
  }

  /** Sauvegarde manuelle (par exemple à la mise en arrière-plan de l'application). */
  sauvegarder(): Promise<void> {
    return this.storage.sauvegarder(this.enregistrement());
  }
}
