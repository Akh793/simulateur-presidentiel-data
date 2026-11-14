/**
 * File de dossiers et Parapheur (3 dossiers au plus par arbitrage).
 *
 * - Slot 1 (urgence data) : uniquement des indicateurs de pilotage ou des divergences causées par le joueur ;
 *   quota de diversité : une famille ne peut occuper le Slot 1 deux fois sur 10 tours (jours) ;
 *   à partir du tour 20, les divergences deviennent la source majoritaire (au moins 6 Slots 1 sur 10
 *   quand des divergences sont disponibles).
 * - Slot 2 (institutionnel) : échéances parlementaires, promesses, budget.
 * - Slot 3 (ministériel / actualité) : tension ministérielle, corps intermédiaires, publications.
 * - Coût de l'inaction : gravité x 1,15 par jour sans traitement (plafond 5) ; un dossier ignoré 60 jours
 *   se « résout » seul avec pénalité.
 */
import type { Ministere } from "./types";

export type SourceDossier = "donnees" | "divergence" | "institution" | "ministere" | "corps" | "publication" | "graine";

export interface Dossier {
  id: string;
  slot: 1 | 2 | 3;
  source: SourceDossier;
  famille: string;
  ministere: Ministere | "transversal";
  titre: string;
  resume: string;
  gravite: number;          // 1 … 5 (continu)
  creeLe: number;
  joursInaction: number;
  indicateurs: string[];
  options: string[];        // gabarits proposés
  reference?: string;       // texte, promesse ou corps concerné
  urgenceSignalee?: boolean; // l'interruption « urgence » n'est émise qu'une fois, au franchissement de la gravité 4
}

export const AGGRAVATION = 1.15;
export const QUOTA_FENETRE = 10;
export const TOUR_BASCULE = 20;
export const EXPIRATION = 60;
export const TAILLE_MAX_FILE = 12;

export class FileDossiers {
  file: Dossier[] = [];
  historiqueSlot1: { jour: number; famille: string; source: SourceDossier }[] = [];
  seq = 0; // sérialisé avec la file (identifiants uniques après restauration)

  nouvelId(): string {
    return `D${++this.seq}`;
  }

  /** Ajoute ou fusionne (même slot, même famille, même ministère : la gravité la plus haute est gardée). */
  ajouter(d: Omit<Dossier, "id" | "joursInaction">): Dossier {
    const existant = this.file.find((x) => x.slot === d.slot && x.famille === d.famille && x.ministere === d.ministere && x.reference === d.reference);
    if (existant) {
      existant.gravite = Math.max(existant.gravite, d.gravite);
      existant.resume = d.resume;
      return existant;
    }
    const nouveau: Dossier = { ...d, id: this.nouvelId(), joursInaction: 0 };
    this.file.push(nouveau);
    if (this.file.length > TAILLE_MAX_FILE) {
      this.file.sort((a, b) => b.gravite - a.gravite);
      this.file.length = TAILLE_MAX_FILE; // les moins graves sortent de la file
    }
    return nouveau;
  }

  /** Un jour passe : aggravation des dossiers non traités, expiration. Retourne les dossiers expirés. */
  vieillir(): Dossier[] {
    const expires: Dossier[] = [];
    for (const d of this.file) {
      d.joursInaction++;
      d.gravite = Math.min(5, d.gravite * AGGRAVATION);
    }
    for (let k = this.file.length - 1; k >= 0; k--) {
      const d = this.file[k]!;
      if (d.joursInaction >= EXPIRATION) { expires.push(d); this.file.splice(k, 1); }
    }
    return expires;
  }

  retirer(id: string): Dossier | undefined {
    const k = this.file.findIndex((d) => d.id === id);
    return k >= 0 ? this.file.splice(k, 1)[0] : undefined;
  }

  /** Familles déjà présentées en Slot 1 lors des tours PRÉCÉDENTS de la fenêtre (le tour en cours ne compte pas). */
  famillesInterdites(jour: number): Set<string> {
    return new Set(this.historiqueSlot1.filter((h) => h.jour < jour && jour - h.jour < QUOTA_FENETRE).map((h) => h.famille));
  }

  /** Compose le Parapheur du jour : au plus un dossier par slot, quota de diversité et règle du tour 20. */
  parapheur(jour: number): Dossier[] {
    const interdites = this.famillesInterdites(jour);
    const slot1 = this.file.filter((d) => d.slot === 1 && !interdites.has(d.famille));
    let choix1: Dossier | undefined;
    if (slot1.length) {
      const divergences = slot1.filter((d) => d.source === "divergence");
      const recents = this.historiqueSlot1.filter((h) => h.jour < jour).slice(-QUOTA_FENETRE);
      const partDiv = recents.length ? recents.filter((h) => h.source === "divergence").length / recents.length : 0;
      const pool = jour >= TOUR_BASCULE && divergences.length && partDiv < 0.6 ? divergences : slot1;
      choix1 = [...pool].sort((a, b) => b.gravite - a.gravite)[0];
    }
    const meilleur = (slot: 2 | 3) => this.file.filter((d) => d.slot === slot).sort((a, b) => b.gravite - a.gravite)[0];
    const out = [choix1, meilleur(2), meilleur(3)].filter((d): d is Dossier => d !== undefined);
    // un Parapheur recomposé dans la journée (après une décision) remplace l'entrée du jour au lieu de s'y ajouter
    const k = this.historiqueSlot1.findIndex((h) => h.jour === jour);
    if (k >= 0) this.historiqueSlot1.splice(k, 1);
    if (choix1) this.historiqueSlot1.push({ jour, famille: choix1.famille, source: choix1.source });
    if (this.historiqueSlot1.length > 200) this.historiqueSlot1.splice(0, this.historiqueSlot1.length - 200);
    return out;
  }
}
