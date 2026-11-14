/**
 * Contexte de jeu : base SQLite, synchronisation de la graine, partie en cours (GameSession) et horloge.
 * Toute mutation de la partie passe par ce contexte, qui incrémente `version` pour rafraîchir les écrans.
 */
import Constants from "expo-constants";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ResultatDecision } from "../../../engine/src/index";
import { StorageService } from "../../../mobile-core/src/db/storage";
import type { SaveMeta } from "../../../mobile-core/src/types";
import type { NarrationTour } from "../../../mobile-core/src/narrative/types";
import { GameSession, type ResultatTour } from "../../../mobile-core/src/session/game-session";
import { ExpoSqliteDriver } from "./expo-driver";
import { phaseSuivante, type Phase } from "./regles";
import { synchroniserGraine, type Fetch, type ResultatSync } from "./sync";

interface ConfigGraine {
  urls: string[];
  delaiMs: number;
}

const CONFIG: ConfigGraine = {
  urls: [],
  delaiMs: 8000,
  ...((Constants.expoConfig?.extra as { graine?: Partial<ConfigGraine> } | undefined)?.graine ?? {}),
};

export interface Jeu {
  pret: boolean;
  erreur: string | null;
  sync: ResultatSync | null;
  parties: SaveMeta[];
  session: GameSession | null;
  narration: NarrationTour | null;
  phase: Phase;
  occupe: boolean;
  version: number;
  storage: StorageService | null;
  nouvellePartie(seedId: string, scenarioId?: string): Promise<void>;
  reprendre(sessionId: string): Promise<void>;
  supprimerPartie(sessionId: string): Promise<void>;
  quitter(): void;
  avancerSemaine(surJour?: (j: { jour: number; date: string }) => Promise<void> | void): Promise<ResultatTour | null>;
  arbitrer(action: (s: GameSession) => Promise<ResultatDecision>): Promise<ResultatDecision | null>;
  marquer(evenement: "arbitrage" | "hemicycle" | "une"): void;
  resynchroniser(): Promise<void>;
}

const Ctx = createContext<Jeu | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [storage, setStorage] = useState<StorageService | null>(null);
  const [sync, setSync] = useState<ResultatSync | null>(null);
  const [parties, setParties] = useState<SaveMeta[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("matin");
  const [occupe, setOccupe] = useState(false);
  const [version, setVersion] = useState(0);
  const session = useRef<GameSession | null>(null);
  const bump = () => setVersion((v) => v + 1);

  const synchroniser = useCallback(async (s: StorageService) => {
    const r = await synchroniserGraine(s, { ...CONFIG, fetch: fetch as unknown as Fetch });
    setSync(r);
    setParties(await s.listerParties());
  }, []);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const s = await StorageService.ouvrir(await ExpoSqliteDriver.ouvrir());
        if (annule) return;
        setStorage(s);
        await synchroniser(s);
      } catch (e) {
        setErreur((e as Error).message);
      }
    })();
    return () => { annule = true; };
  }, [synchroniser]);

  const avecVerrou = useCallback(async <T,>(f: () => Promise<T>): Promise<T | null> => {
    setOccupe(true);
    try { return await f(); } catch (e) { setErreur((e as Error).message); return null; } finally { setOccupe(false); bump(); }
  }, []);

  const jeu = useMemo<Jeu>(() => ({
    pret: storage !== null && sync !== null, erreur, sync, parties, session: session.current,
    narration: session.current?.narration ?? null, phase, occupe, version, storage,
    async nouvellePartie(seedId, scenarioId) {
      if (!storage) return;
      await avecVerrou(async () => {
        session.current = await GameSession.nouvelle(storage, { seedId, ...(scenarioId ? { scenarioId } : {}) });
        setPhase("matin");
        setParties(await storage.listerParties());
      });
    },
    async reprendre(sessionId) {
      if (!storage) return;
      await avecVerrou(async () => { session.current = await GameSession.reprendre(storage, sessionId); setPhase("matin"); });
    },
    async supprimerPartie(sessionId) {
      if (!storage) return;
      await avecVerrou(async () => {
        if (session.current?.sessionId === sessionId) session.current = null;
        await storage.supprimerPartie(sessionId);
        setParties(await storage.listerParties());
      });
    },
    quitter() { session.current = null; bump(); },
    avancerSemaine(surJour) {
      const s = session.current;
      if (!s) return Promise.resolve(null);
      return avecVerrou(async () => {
        const r = await s.avancer(7, surJour ? { surJour } : {});
        setPhase(phaseSuivante(phase, "semaine"));
        if (storage) setParties(await storage.listerParties());
        return r;
      });
    },
    arbitrer(action) {
      const s = session.current;
      if (!s) return Promise.resolve(null);
      return avecVerrou(async () => {
        const r = await action(s);
        if (r.ok) setPhase((p) => phaseSuivante(p, "arbitrage"));
        return r;
      });
    },
    marquer(evenement) { setPhase((p) => phaseSuivante(p, evenement)); },
    async resynchroniser() { if (storage) await avecVerrou(() => synchroniser(storage)); },
  }), [storage, sync, parties, erreur, phase, occupe, version, avecVerrou, synchroniser]);

  return <Ctx.Provider value={jeu}>{children}</Ctx.Provider>;
}

export function useJeu(): Jeu {
  const j = useContext(Ctx);
  if (!j) throw new Error("useJeu() hors de <GameProvider>");
  return j;
}

/** Partie en cours (les écrans de jeu ne sont montés que lorsqu'elle existe). */
export function useSession(): GameSession {
  const j = useJeu();
  if (!j.session) throw new Error("aucune partie en cours");
  return j.session;
}
