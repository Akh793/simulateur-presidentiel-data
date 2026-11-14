import { describe, expect, it } from "vitest";
import { date, euros, nombre, pourcent, valeur } from "../src/narrative/format";
import { referencesReelles } from "../src/narrative/personnalites";
import { indexer, normaliserNombre, valider } from "../src/narrative/validator";

const faits = { a: pourcent(12.34, 1), b: euros(-181_234_567_890), c: nombre(574), d: date("2026-11-14"), e: valeur(103.46, "indice"), f: "49.3" };
const idx = indexer([faits, ["Projet de loi de finances pour 2027", "Indice des prix à la consommation, base 2025"]], { noms: ["Hugo Rinvelel"] });

describe("validateur anti-hallucination", () => {
  it("accepte un texte n'utilisant que les faits du payload (espaces fines, signe, virgule)", () => {
    expect(valider(`Le taux atteint ${faits.a} et le solde ${faits.b} ; ${faits.c} sièges pourvus au ${faits.d}.`, idx)).toEqual([]);
    expect(valider("Baisse de 181,2 Md€ et indice à 103,46 ; article 49.3 ; loi de finances pour 2027.", idx)).toEqual([]);
    expect(valider("Hugo Rinvelel présentera le plan.", idx)).toEqual([]);
  });

  it("bloque tout nombre inventé, y compris un arrondi ou un ordre de grandeur", () => {
    expect(valider("Le taux atteint 12,4 %.", idx)).toContain("nombre absent du payload : 12,4");
    expect(valider("Le taux atteint 12 %.", idx)).toContain("nombre absent du payload : 12");
    expect(valider("Près de 3 000 manifestants.", idx).some((m) => m.startsWith("nombre absent"))).toBe(true);
    expect(valider("Le coût atteint 1 200 000 €.", idx).some((m) => m.includes("1 200 000"))).toBe(true);
    expect(valider("Indice à 103,5.", idx)).toContain("nombre absent du payload : 103,5");
  });

  it("bloque les nombres en toutes lettres et les dates hors payload", () => {
    expect(valider("Des milliers de foyers privés de courant.", idx)).toContain("nombre en toutes lettres : milliers");
    expect(valider("Trois cents décès sont redoutés.", idx).some((m) => m.startsWith("nombre en toutes lettres"))).toBe(true);
    expect(valider("Rendez-vous le 15 novembre 2026.", idx)).toContain("date absente du payload : 15 novembre 2026");
    expect(valider("Rendez-vous le 2026-11-20.", idx)).toContain("date absente du payload : 2026-11-20");
  });

  it("bloque les personnalités et formations politiques réelles", () => {
    expect(valider("Selon Emmanuel Macron, la situation est grave.", idx).some((m) => m.includes("personnalité"))).toBe(true);
    expect(valider("Macron a tranché.", idx).some((m) => m.includes("personnalité"))).toBe(true);
    expect(valider("Le Rassemblement national dépose une motion.", idx).some((m) => m.includes("formation"))).toBe(true);
    expect(valider("La présidente Élisabeth Borne réagit.", idx).length).toBeGreaterThan(0);
    expect(referencesReelles("La borne kilométrique et la Hollande sont citées.")).toEqual([]);
  });

  it("bloque les noms propres hors liste blanche et les civilités", () => {
    expect(valider("Le ministre Jean Dupontel démissionne.", idx).some((m) => m.includes("Dupontel"))).toBe(true);
    expect(valider("Mme Durandeau conteste.", idx).some((m) => m.startsWith("civilité"))).toBe(true);
    expect(valider("Le texte passe au Sénat puis à l'Assemblée.", idx)).toEqual([]);
  });

  it("bloque les variables non substituées et les textes trop longs", () => {
    expect(valider("Valeur {valeur}.", idx).some((m) => m.startsWith("variable non substituée"))).toBe(true);
    expect(valider("Bercy. ".repeat(200), idx, 900).some((m) => m.startsWith("texte trop long"))).toBe(true);
  });

  it("normalise les écritures d'un même nombre", () => {
    expect(normaliserNombre("−1 234,50")).toBe("1234.5");
    expect(normaliserNombre("+0,10")).toBe("0.1");
    expect(normaliserNombre("007")).toBe("7");
  });
});
