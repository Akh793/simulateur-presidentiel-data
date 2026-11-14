/**
 * Bibliothèque de gabarits narratifs paramétrés.
 *
 * Règles de rédaction (vérifiées par les tests) :
 * - aucun chiffre ni nombre en lettres dans un gabarit : tous les nombres et dates viennent des faits `{...}` ;
 * - aucun nom de personne : seuls les ministres fictifs du moteur sont injectés, via `{ministre}` ;
 * - aucun parti ni groupe parlementaire nommé ;
 * - chaque famille × niveau offre au moins deux variantes de titre et de constat (anti-répétition).
 *
 * Familles couvertes :
 * - slot 1 (données et divergences) : energie, meteo, eau, normes, sante, emploi, mobilite ;
 * - slot 2 (institutionnel) : institutions (graine du jour), parlement, budget ;
 * - slot 3 : publication, et Situations Émergentes : dialogue (corps intermédiaires, blocages), ministre.
 */
import type { LigneEditoriale, Niveau } from "./types";

export type Bloc = Readonly<Record<Niveau, readonly string[]>>;

export interface GabaritFamille {
  libelle: string;
  emergente?: boolean;
  titres: Bloc;
  constats: Bloc;
  enjeux: readonly string[];
  bercy: readonly string[];
  social: readonly string[];
  une: Readonly<Record<LigneEditoriale, readonly string[]>>;
}

export interface Theme {
  theme: string;
  objet: string;
  menages: string;
}

/** Thèmes de toutes les familles d'indicateurs du catalogue (48) et des dossiers système. */
export const THEMES: Readonly<Record<string, Theme>> = {
  prix: { theme: "les prix", objet: "le coût de la vie", menages: "le pouvoir d'achat" },
  conjoncture: { theme: "la conjoncture", objet: "l'activité économique", menages: "les carnets de commandes" },
  taux: { theme: "les taux d'intérêt", objet: "le coût de la dette", menages: "le crédit immobilier" },
  dette: { theme: "la dette publique", objet: "la trajectoire de la dette", menages: "les marges de l'action publique" },
  budget: { theme: "le budget", objet: "les comptes publics", menages: "le financement des services publics" },
  emploi: { theme: "l'emploi", objet: "le marché du travail", menages: "les fins de mois des salariés" },
  menages: { theme: "le moral des ménages", objet: "la confiance des ménages", menages: "la consommation" },
  sante: { theme: "la santé", objet: "le système de soins", menages: "l'accès aux soins" },
  demographie: { theme: "la natalité", objet: "les naissances", menages: "les familles" },
  energie: { theme: "l'énergie", objet: "l'approvisionnement énergétique", menages: "le plein et le chauffage" },
  meteo: { theme: "la météo", objet: "les conditions météorologiques", menages: "les déplacements et la sécurité" },
  eau: { theme: "l'eau", objet: "la ressource en eau", menages: "les restrictions d'usage" },
  mobilite: { theme: "les transports", objet: "le réseau ferroviaire", menages: "les trajets du quotidien" },
  normes: { theme: "l'activité normative", objet: "l'application des lois", menages: "les démarches administratives" },
  prisons: { theme: "les prisons", objet: "la surpopulation carcérale", menages: "la sécurité des établissements" },
  echanges: { theme: "le commerce extérieur", objet: "les échanges de services", menages: "l'attractivité du pays" },
  logement: { theme: "le logement", objet: "la construction de logements", menages: "l'accès au logement" },
  hebergement: { theme: "l'hébergement d'urgence", objet: "les places d'hébergement", menages: "les personnes sans abri" },
  securite: { theme: "la sécurité", objet: "la délinquance", menages: "la tranquillité publique" },
  asile: { theme: "l'asile", objet: "les demandes d'asile", menages: "l'accueil des demandeurs" },
  ordre_public: { theme: "l'ordre public", objet: "les mobilisations", menages: "la sécurité des rassemblements" },
  justice: { theme: "la justice", objet: "les délais de jugement", menages: "les justiciables" },
  education: { theme: "l'éducation", objet: "l'école", menages: "les élèves et leurs familles" },
  agriculture: { theme: "l'agriculture", objet: "le revenu agricole", menages: "les prix alimentaires" },
  defense: { theme: "la défense", objet: "les capacités des armées", menages: "la sécurité du pays" },
  europe: { theme: "l'Europe", objet: "les relations avec l'Union européenne", menages: "les fonds européens" },
  culture: { theme: "la culture", objet: "la vie culturelle", menages: "les sorties culturelles" },
  tourisme: { theme: "le tourisme", objet: "la fréquentation touristique", menages: "l'économie des territoires" },
  social: { theme: "la protection sociale", objet: "les comptes sociaux", menages: "les prestations" },
  institutions: { theme: "les institutions", objet: "le calendrier parlementaire", menages: "la vie démocratique" },
  parlement: { theme: "le Parlement", objet: "la navette parlementaire", menages: "les lois en préparation" },
  publication: { theme: "les statistiques publiques", objet: "les chiffres officiels", menages: "le quotidien des Français" },
  dialogue: { theme: "le dialogue social", objet: "les corps intermédiaires", menages: "la paix sociale" },
  ministre: { theme: "le gouvernement", objet: "l'équipe gouvernementale", menages: "l'action ministérielle" },
};

/**
 * Constats des dossiers de données (slot 1, sources « donnees » et « graine ») : le repère est la normale
 * récente (médiane des 30 derniers jours) ou le seuil d'alerte publié par le relais, jamais l'uchronie.
 * La troisième variante ne dépend d'aucun repère : elle est toujours applicable.
 */
function constatsDonnees(f1: string, f2: string, f3: string): Bloc {
  return {
    1: [`Le niveau {deIndicateur} s'établit à {valeur} ; {repereLe} est de {repere}. ${f1}`,
      `Le niveau {deIndicateur} s'établit à {valeur}, à {scoreAnomalie} fois la dispersion habituelle de la normale récente. ${f1}`,
      `Léger mouvement pour {leIndicateur}, à {valeur}. ${f1}`],
    2: [`Le niveau {deIndicateur} atteint {valeur}, en {sens} marquée par rapport {repereA} ({repere}). ${f2}`,
      `Le niveau {deIndicateur} atteint {valeur}, soit un écart à la normale récente de {scoreAnomalie} fois la dispersion habituelle. ${f2}`,
      `Avec {valeur}, la mesure {deIndicateur} sort de sa plage habituelle. ${f2}`],
    3: [`Le niveau {deIndicateur} atteint {valeur}, très loin {repereDe} ({repere}). ${f3}`,
      `Écart exceptionnel pour {leIndicateur} : {valeur}, à {scoreAnomalie} fois la dispersion habituelle de la normale récente. ${f3}`,
      `Niveau exceptionnel {deIndicateur} : {valeur}. ${f3}`],
  };
}

export const FAMILLES: Readonly<Record<string, GabaritFamille>> = {
  energie: {
    libelle: "Énergie",
    titres: {
      1: ["Énergie : un signal à surveiller", "Premiers frémissements sur {objet}", "{Indicateur} : léger décalage"],
      2: ["Tension sur {objet}", "Énergie : la pression monte", "{Indicateur} : écart marqué à la référence"],
      3: ["Alerte énergétique : {objet} sous très forte pression", "Crise de l'énergie : le seuil d'alerte est franchi"],
    },
    constats: constatsDonnees("Les opérateurs suivent la situation sans inquiétude particulière.", "Les opérateurs signalent une tension durable.", "Les marges du système énergétique sont entamées."),
    enjeux: ["Le coût pour les ménages et les entreprises suivra si la tension se prolonge.",
      "Les stocks et les capacités d'importation déterminent la marge de manœuvre des prochains jours."],
    bercy: ["Chaque geste sur les prix de l'énergie coûte cher et se retire difficilement.",
      "Une aide générale sur les prix de l'énergie profite d'abord aux plus gros consommateurs."],
    social: ["Les ménages modestes et les territoires dépendants de la voiture sont exposés en premier.",
      "La facture énergétique pèse d'abord sur les foyers qui ne peuvent pas réduire leur consommation."],
    une: {
      economique: ["Énergie : les marchés sous tension", "Les industriels surveillent {objet}"],
      generaliste: ["Énergie : l'exécutif face à la tension", "{Indicateur} : la situation se tend"],
      populaire: ["Plein et chauffage : ce qui vous attend", "Énergie : votre facture en question"],
    },
  },
  meteo: {
    libelle: "Météo",
    titres: {
      1: ["Météo : vigilance de routine", "Conditions météorologiques à surveiller"],
      2: ["Épisode météorologique marqué", "Vigilance renforcée sur {objet}", "Météo : plusieurs départements exposés"],
      3: ["Épisode météorologique dangereux", "Alerte météo : les secours mobilisés"],
    },
    constats: constatsDonnees("Rien d'inhabituel à ce stade.", "Les préfectures relaient les consignes de prudence.", "Les dispositifs de crise sont activés."),
    enjeux: ["Les transports, l'énergie et les urgences hospitalières encaissent le choc en premier.",
      "La qualité de l'information du public conditionne la sécurité des déplacements."],
    bercy: ["Les dégâts relèvent d'abord des assurances et du régime des catastrophes naturelles.",
      "Une enveloppe d'urgence doit rester ciblée et temporaire."],
    social: ["Les personnes isolées, âgées ou sans abri doivent être repérées et protégées.",
      "Les travailleurs exposés et les élèves en déplacement ont besoin de consignes claires."],
    une: {
      economique: ["Intempéries : l'activité ralentit", "Météo : les assureurs en alerte"],
      generaliste: ["Alerte météo : le pays se prépare", "Épisode météo : les secours sur le pied de guerre"],
      populaire: ["Météo : les bons réflexes", "Intempéries : faut-il prendre la route ?"],
    },
  },
  eau: {
    libelle: "Eau",
    titres: {
      1: ["Ressource en eau : premiers signaux", "Eau : niveau à surveiller"],
      2: ["Tension sur {objet}", "Eau : les restrictions se profilent"],
      3: ["Alerte hydrologique : {objet} en danger", "Eau : situation critique"],
    },
    constats: constatsDonnees("Les services de l'eau restent attentifs.", "Les préfets préparent des arrêtés de restriction.", "L'approvisionnement de certaines communes est menacé."),
    enjeux: ["L'agriculture, l'industrie et la production électrique se partagent une ressource contrainte.",
      "Les arbitrages entre usages devront être expliqués territoire par territoire."],
    bercy: ["Les investissements dans les réseaux sont lourds et pluriannuels.",
      "Les indemnisations agricoles pèsent vite sur les comptes publics."],
    social: ["Les restrictions touchent d'abord les communes rurales et les petites exploitations.",
      "L'accès à l'eau potable reste la priorité absolue des populations."],
    une: {
      economique: ["Eau : l'agriculture et l'industrie s'inquiètent", "Ressource en eau : la facture des usages"],
      generaliste: ["Eau : l'exécutif sous pression", "Ressource en eau : les territoires en alerte"],
      populaire: ["Restrictions d'eau : ce qui change chez vous", "Arrosage, piscines : les nouvelles règles"],
    },
  },
  normes: {
    libelle: "Normes",
    titres: {
      1: ["Production normative : rythme ordinaire", "Journal officiel : activité à suivre"],
      2: ["Inflation normative en vue", "Application des lois : retard préoccupant"],
      3: ["Embouteillage normatif", "Application des lois : décrochage"],
    },
    constats: constatsDonnees("Le rythme reste habituel.", "Les administrations peinent à suivre.", "La sécurité juridique se dégrade."),
    enjeux: ["Une loi sans décret d'application reste lettre morte pour les usagers.",
      "Les entreprises réclament de la stabilité réglementaire."],
    bercy: ["La simplification ne coûte rien et rapporte en productivité.",
      "Chaque norme nouvelle a un coût de mise en conformité pour l'économie."],
    social: ["Les droits votés mais non appliqués nourrissent la défiance.",
      "Les usagers attendent des démarches lisibles, pas des textes supplémentaires."],
    une: {
      economique: ["Normes : les entreprises demandent une pause", "Simplification : l'économie attend"],
      generaliste: ["Lois votées, lois appliquées ?", "Journal officiel : la machine s'emballe"],
      populaire: ["Démarches : pourquoi rien ne change", "Ces lois votées qui ne s'appliquent pas"],
    },
  },
  sante: {
    libelle: "Santé",
    titres: {
      1: ["Santé : vigilance saisonnière", "Hôpital : situation à surveiller"],
      2: ["Tension sur {objet}", "Urgences et pharmacies sous pression"],
      3: ["Alerte sanitaire : {objet} au bord de la rupture", "Hôpital : plan blanc en vue"],
    },
    constats: constatsDonnees("Les services de santé restent dans leurs capacités habituelles.", "Les services d'urgence signalent des délais en hausse.", "Les établissements déprogramment des soins."),
    enjeux: ["La saturation des urgences se répercute sur toute la chaîne de soins.",
      "Les ruptures de médicaments imposent des arbitrages avec les industriels et l'Europe."],
    bercy: ["L'objectif national de dépenses d'assurance maladie est déjà sous tension.",
      "Une rallonge hospitalière doit être financée dans la loi de financement de la sécurité sociale."],
    social: ["Les patients âgés et les déserts médicaux paient le prix de la saturation.",
      "Les soignants épuisés attendent un signal concret, pas une annonce."],
    une: {
      economique: ["Assurance maladie : la facture s'alourdit", "Médicaments : les laboratoires interpellés"],
      generaliste: ["Hôpital : le système de soins sous tension", "Santé : l'exécutif face à l'urgence"],
      populaire: ["Urgences : combien de temps d'attente ?", "Pharmacies : ces médicaments introuvables"],
    },
  },
  emploi: {
    libelle: "Emploi",
    titres: {
      1: ["Emploi : léger infléchissement", "Marché du travail : signal faible"],
      2: ["Le marché du travail se retourne", "Emploi : les recrutements ralentissent"],
      3: ["Alerte sur l'emploi", "Emploi : décrochage brutal"],
    },
    constats: constatsDonnees("Le marché du travail reste globalement stable.", "Les intentions d'embauche reculent.", "Les plans sociaux se multiplient."),
    enjeux: ["Un retournement de l'emploi ampute les recettes sociales avec quelques mois de retard.",
      "Les jeunes et les intérimaires sont les premiers touchés."],
    bercy: ["Moins d'emplois, ce sont moins de cotisations et plus d'indemnisation.",
      "Les aides à l'embauche ont un effet d'aubaine élevé si elles ne sont pas ciblées."],
    social: ["Les demandeurs d'emploi de longue durée doivent rester accompagnés.",
      "L'insécurité économique pèse sur le moral et la consommation des ménages."],
    une: {
      economique: ["Emploi : les entreprises lèvent le pied", "Recrutements : le coup de frein"],
      generaliste: ["Emploi : le signal d'alarme", "L'exécutif face au retournement de l'emploi"],
      populaire: ["Trouver un emploi devient plus difficile", "Emploi : ce que cela change pour vous"],
    },
  },
  mobilite: {
    libelle: "Mobilité",
    titres: {
      1: ["Transports : quelques perturbations", "Réseau ferroviaire : à surveiller"],
      2: ["Transports perturbés", "Le réseau ferroviaire sous tension"],
      3: ["Paralysie des transports", "Réseau ferroviaire : journée noire"],
    },
    constats: constatsDonnees("Les perturbations restent localisées.", "Les usagers subissent des retards importants.", "Une partie du réseau est à l'arrêt."),
    enjeux: ["Les trajets domicile-travail et le fret dépendent de la fiabilité du réseau.",
      "La continuité du service public de transport est un marqueur d'efficacité de l'État."],
    bercy: ["La régénération du réseau exige des investissements massifs et pluriannuels.",
      "Les compensations aux opérateurs pèsent sur le budget sans améliorer le service."],
    social: ["Les usagers sans alternative à la voiture ou au train sont les plus pénalisés.",
      "Les salariés des transports et les usagers doivent être entendus ensemble."],
    une: {
      economique: ["Transports : le fret et le tourisme pénalisés", "Réseau ferroviaire : le coût des retards"],
      generaliste: ["Transports : la grande galère", "Réseau ferroviaire : l'exécutif interpellé"],
      populaire: ["Trains : comment se déplacer ?", "Retards en série : les usagers à bout"],
    },
  },
  institutions: {
    libelle: "Institutions",
    titres: {
      1: ["Calendrier parlementaire chargé", "Institutions : rendez-vous à venir"],
      2: ["Décrets en attente et calendrier serré", "Institutions : l'exécutif sous contrainte"],
      3: ["Bras de fer institutionnel", "Institutions : l'exécutif en difficulté"],
    },
    constats: {
      1: ["Une motion de censure serait adoptée à partir de {seuil} voix sur {siegesTotal} sièges. Niveau {deIndicateur} : {valeur}.",
        "Le seuil de censure est de {seuil} voix sur {siegesTotal} sièges ; niveau {deIndicateur} : {valeur}."],
      2: ["Le soutien estimé au gouvernement réunit {soutien} sièges, pour un seuil de censure de {seuil} voix. Niveau {deIndicateur} : {valeur}.",
        "Niveau {deIndicateur} à {valeur} et soutien estimé à {soutien} sièges : chaque texte devra être négocié.",
        "Aucun groupe ne s'est engagé à soutenir le gouvernement ; une motion de censure serait adoptée à partir de {seuil} voix sur {siegesTotal} sièges."],
      3: ["Avec un soutien estimé à {soutien} sièges seulement et un seuil de censure de {seuil} voix, le gouvernement est à la merci d'une motion.",
        "Majorité introuvable : {soutien} sièges de soutien estimé, seuil de censure à {seuil} voix.",
        "Aucun groupe ne soutient le gouvernement et le seuil de censure est de {seuil} voix : chaque scrutin peut le renverser."],
    },
    enjeux: ["Le calendrier parlementaire fixe le tempo de toutes les réformes.",
      "La crédibilité de l'exécutif dépend de sa capacité à faire appliquer les lois votées."],
    bercy: ["Sans budget voté à temps, l'État fonctionne sous loi spéciale et l'investissement se fige.",
      "La stabilité politique est surveillée de près par les investisseurs."],
    social: ["Les blocages institutionnels retardent les mesures attendues par les ménages.",
      "La défiance envers les institutions se nourrit des lois votées mais inappliquées."],
    une: {
      economique: ["Instabilité politique : les investisseurs attentifs", "Budget : le calendrier inquiète"],
      generaliste: ["L'exécutif face à l'Assemblée", "Censure : la menace plane"],
      populaire: ["Ce que la crise politique change pour vous", "Lois en attente : les Français patientent"],
    },
  },
  parlement: {
    libelle: "Parlement",
    titres: {
      1: ["Navette parlementaire : {etape} en vue", "Parlement : prochaine étape pour « {texte} »", "Parlement : échéance en vue"],
      2: ["Vote serré en vue sur « {texte} »", "Parlement : {etape} sous tension", "Parlement : un scrutin à risque"],
      3: ["« {texte} » : le gouvernement joue sa survie", "Épreuve de force au Parlement sur « {texte} »", "Parlement : l'exécutif sur le fil"],
    },
    constats: {
      1: ["Le texte « {texte} » arrive à l'étape « {etape} » le {echeance}. Le seuil de censure est de {seuil} voix sur {siegesTotal} sièges.",
        "Prochaine étape pour le texte « {texte} » : {etape}, le {echeance}.",
        "Une échéance parlementaire approche ; le seuil de censure est de {seuil} voix sur {siegesTotal} sièges."],
      2: ["Le texte « {texte} » passe à l'étape « {etape} » le {echeance}. Le soutien estimé ne dépasse pas {soutien} sièges.",
        "Le {echeance}, le texte « {texte} » affronte l'étape « {etape} » avec un soutien estimé de {soutien} sièges.",
        "Le {echeance}, le texte « {texte} » affronte l'étape « {etape} » sans qu'aucun groupe ne se soit engagé à le soutenir.",
        "Un scrutin à risque approche : le seuil de censure est de {seuil} voix sur {siegesTotal} sièges."],
      3: ["Le {echeance}, le texte « {texte} » sera soumis à l'étape « {etape} ». Avec {soutien} sièges de soutien estimé pour un seuil de censure de {seuil} voix, l'issue est incertaine.",
        "Échéance du {echeance} pour le texte « {texte} » : le soutien estimé ({soutien} sièges) reste loin du compte.",
        "Le {echeance}, le texte « {texte} » sera soumis à l'étape « {etape} » sans soutien déclaré ; le seuil de censure est de {seuil} voix.",
        "L'exécutif aborde un scrutin décisif : une motion de censure serait adoptée à partir de {seuil} voix sur {siegesTotal} sièges."],
    },
    enjeux: ["Un rejet obligerait à revoir le texte ou à engager la responsabilité du gouvernement.",
      "Les groupes pivots monnaieront leur soutien contre des engagements précis."],
    bercy: ["Les concessions de dernière minute ont souvent un coût budgétaire caché.",
      "Un texte financier rejeté se traduit par une loi spéciale et un budget figé."],
    social: ["Un passage en force abîmerait durablement le climat social.",
      "Les engagements pris auprès des groupes doivent être tenus pour rester crédibles."],
    une: {
      economique: ["Finances publiques : les marchés suspendus au vote", "Vote décisif pour les finances publiques"],
      generaliste: ["Vote à haut risque à l'Assemblée", "Parlement : le gouvernement compte ses voix"],
      populaire: ["Ce que le vote de cette semaine va changer", "Assemblée : un vote qui vous concerne"],
    },
  },
  budget: {
    libelle: "Budget",
    emergente: true,
    titres: {
      1: ["Trésorerie sociale : vigilance", "Comptes sociaux : marge réduite"],
      2: ["Plafond d'emprunt de l'Acoss en vue", "Trésorerie de la Sécurité sociale sous tension"],
      3: ["Plafond d'emprunt de l'Acoss dépassé", "Mur de trésorerie : la Sécurité sociale à court de financement"],
    },
    constats: {
      1: ["L'encours d'emprunt de l'Acoss atteint {acoss}, pour un plafond de {plafond} ({usage} utilisés).",
        "La Sécurité sociale emprunte {acoss} sur un plafond de {plafond}."],
      2: ["L'encours de l'Acoss atteint {acoss}, soit {usage} du plafond de {plafond}. Les prochains versements de prestations seront délicats à couvrir.",
        "Avec {acoss} empruntés sur un plafond de {plafond} ({usage}), la marge de trésorerie sociale se réduit fortement."],
      3: ["L'encours de l'Acoss ({acoss}) dépasse le plafond autorisé de {plafond} : sans relèvement, le versement des prestations est menacé.",
        "Plafond franchi : {acoss} empruntés pour {plafond} autorisés ({usage})."],
    },
    enjeux: ["Le relèvement du plafond passe par une loi de financement rectificative ou un décret d'urgence.",
      "Les pensions et les remboursements de soins dépendent de cette trésorerie."],
    bercy: ["Relever le plafond sans mesure de redressement envoie un mauvais signal aux prêteurs.",
      "Le coût de financement de la dette sociale augmente avec les taux."],
    social: ["Le versement des pensions et des prestations ne peut pas être suspendu.",
      "Une hausse de prélèvements toucherait directement les retraités et les actifs."],
    une: {
      economique: ["Sécurité sociale : le mur de trésorerie", "Dette sociale : les prêteurs inquiets"],
      generaliste: ["La Sécurité sociale à court d'argent ?", "Comptes sociaux : l'alerte"],
      populaire: ["Pensions et remboursements : faut-il s'inquiéter ?", "Votre retraite sera-t-elle versée à temps ?"],
    },
  },
  publication: {
    libelle: "Publication",
    titres: {
      1: ["Publication : {indicateurTitre}", "Chiffre du jour : {indicateurTitre}"],
      2: ["{Indicateur} : une publication qui interpelle", "Chiffres officiels : surprise sur {leIndicateur}"],
      3: ["{Indicateur} : une publication qui inquiète", "Chiffres officiels : coup de tonnerre sur {leIndicateur}"],
    },
    constats: {
      1: ["Publication {deIndicateur} : {valeur} ; précédente valeur publiée : {precedente}.",
        "Nouvelle valeur publiée pour {leIndicateur} : {valeur} (précédemment {precedente})."],
      2: ["Publication {deIndicateur} : {valeur}, contre {precedente} à la publication précédente. L'écart au scénario sans vos décisions atteint {ecart}.",
        "La publication {deIndicateur} ({valeur}) s'écarte de la précédente ({precedente})."],
      3: ["Publication {deIndicateur} : {valeur}, très loin de la valeur précédente ({precedente}) ; l'écart au scénario sans vos décisions atteint {ecart}.",
        "Choc statistique pour {leIndicateur} : {valeur}, contre {precedente} précédemment."],
    },
    enjeux: ["Les commentateurs vont lire ce chiffre comme un bilan de l'action gouvernementale.",
      "Une publication officielle s'impose à tous : la contester serait contre-productif."],
    bercy: ["Les agences de notation et les investisseurs lisent les mêmes chiffres.",
      "Un chiffre isolé ne justifie pas un changement de trajectoire budgétaire."],
    social: ["Derrière la moyenne, les écarts entre ménages peuvent être importants.",
      "Les Français jugent sur leur quotidien plus que sur la statistique."],
    une: {
      economique: ["{Indicateur} : le chiffre qui fait réagir", "Statistiques : nouvelle publication pour {leIndicateur}"],
      generaliste: ["Le chiffre du jour : {indicateurTitre}", "{Indicateur} : ce que dit la statistique officielle"],
      populaire: ["Ce chiffre qui touche votre quotidien", "{Indicateur} : ce que cela change pour vous"],
    },
  },
  dialogue: {
    libelle: "Dialogue social",
    emergente: true,
    titres: {
      1: ["{Corps} : le ton se durcit", "Dialogue social : premiers signes de crispation"],
      2: ["{Corps} : la mobilisation se prépare", "Tensions avec {corpsLe}"],
      3: ["Blocage en cours : {corpsTitre}", "Crise sociale : {corpsLe} en première ligne"],
    },
    constats: {
      1: ["La radicalisation {corpsDe} atteint {radicalisation} points ; le blocage intervient au-delà de {seuilBlocage}.",
        "{Corps} : radicalisation à {radicalisation} points, sous le seuil de blocage ({seuilBlocage})."],
      2: ["La radicalisation {corpsDe} atteint {radicalisation} points, proche du seuil de blocage ({seuilBlocage}). Des appels à la mobilisation circulent.",
        "{Corps} : {radicalisation} points de radicalisation, pour un seuil de blocage à {seuilBlocage}."],
      3: ["{Corps} : {blocageMin}. La radicalisation atteint {radicalisation} points, au-delà du seuil de {seuilBlocage}.",
        "La radicalisation {corpsDe} ({radicalisation} points) dépasse le seuil de blocage ({seuilBlocage}) : l'activité est directement touchée.",
        "Mouvement en cours, {blocageMin} : radicalisation {corpsDe} à {radicalisation} points."],
    },
    enjeux: ["Un blocage physique ampute l'activité et les recettes fiscales dès les premiers jours.",
      "Le temps du dialogue est compté : chaque journée de conflit coûte."],
    bercy: ["Un blocage prolongé coûte davantage en recettes perdues qu'un compromis ciblé.",
      "Les concessions doivent rester réversibles et gagées."],
    social: ["Ouvrir une négociation rapide évite que le mouvement ne s'étende.",
      "La reconnaissance des revendications compte autant que les mesures."],
    une: {
      economique: ["Conflit social : l'économie au ralenti", "Mobilisation : les entreprises comptent les pertes"],
      generaliste: ["{Corps} : le bras de fer", "Crise sociale : l'exécutif sous pression"],
      populaire: ["Mobilisation : ce qui est perturbé près de chez vous", "Grève, blocages : comment s'organiser"],
    },
  },
  ministre: {
    libelle: "Ministre",
    emergente: true,
    titres: {
      1: ["{Ministre} sous le feu des critiques", "Ministère {ministereDe} : premières critiques"],
      2: ["{Ministre} en difficulté", "Ministère {ministereDe} : la pression monte"],
      3: ["{Ministre} sur la sellette", "Ministère {ministereDe} : la question du remaniement est posée"],
    },
    constats: {
      1: ["La tension sectorielle autour du ministère {ministereDe} atteint {tension} points.",
        "{Ministre}, en charge du ministère {ministereDe}, voit la tension de son secteur monter à {tension} points."],
      2: ["La tension autour du ministère {ministereDe} atteint {tension} points ; {ministre} peine à reprendre la main.",
        "{Ministre} affronte une tension sectorielle de {tension} points."],
      3: ["À {tension} points de tension sectorielle, {ministre} n'a plus la confiance de son secteur.",
        "Le ministère {ministereDe} est en crise : tension de {tension} points."],
    },
    enjeux: ["Un remaniement soulage la pression mais coûte du capital politique et irrite les groupes alliés.",
      "Soutenir publiquement le ministère engage l'autorité de l'exécutif."],
    bercy: ["Un changement de ministre retarde les chantiers budgétaires en cours.",
      "Les annonces de soutien ne doivent pas se traduire par des crédits supplémentaires."],
    social: ["Les acteurs du secteur attendent un interlocuteur stable et écouté.",
      "Le changement de visage ne suffit pas sans changement de méthode."],
    une: {
      economique: ["Ministère {ministereDe} : les acteurs du secteur inquiets", "Remaniement : quelles conséquences ?"],
      generaliste: ["{Ministre} dans la tourmente", "Remaniement : l'hypothèse se précise"],
      populaire: ["Faut-il un remaniement ?", "Un ministère sous le feu des critiques"],
    },
  },
};

/** Divergences causées par le joueur (source « divergence »), déclinées par niveau. */
export const DIVERGENCE: { titres: Bloc; constats: Bloc; cause: readonly string[]; evenement: readonly string[] } = {
  titres: {
    1: ["Vos arbitrages déplacent {objet}", "Écart naissant sur {objet} après vos décisions"],
    2: ["Vos décisions creusent l'écart sur {objet}", "Divergence nette sur {objet}"],
    3: ["Seuil de divergence franchi sur {objet}", "{Objet} : vos choix ont fait basculer la trajectoire"],
  },
  constats: {
    1: ["Par rapport au scénario sans vos décisions, le niveau {deIndicateur} s'écarte de {partDecision} ({valeur} contre {reference}).",
      "Vos arbitrages éloignent {leIndicateur} de sa trajectoire de référence : {valeur} contre {reference}."],
    2: ["Niveau {deIndicateur} : {valeur}, contre {reference} dans le scénario de référence ; vos décisions expliquent {partDecision}.",
      "La trajectoire {deIndicateur} diverge nettement ({valeur} contre {reference}) ; la part imputable à vos décisions atteint {partDecision}."],
    3: ["Divergence majeure : niveau {deIndicateur} à {valeur} au lieu de {reference}, dont {partDecision} imputables à vos décisions.",
      "Vos choix ont fait basculer {leIndicateur} : {valeur} contre {reference} sans eux ({partDecision} de votre fait)."],
  },
  cause: ["La mesure « {decision} » explique l'essentiel de cet écart.", "L'effet tient d'abord à la mesure « {decision} »."],
  evenement: ["L'épisode « {evenement} » pèse aussi sur cette trajectoire.", "S'y ajoute l'effet de l'épisode « {evenement} »."],
};

/** Archétypes de ministres fictifs (formulations sans accord de genre). */
export type Archetype = "technicien" | "fidele" | "populaire" | "frondeur" | "fragilise" | "discret";
export const MINISTRES: Readonly<Record<Archetype, readonly string[]>> = {
  technicien: ["{Ministre} met en avant une solide maîtrise technique et a déjà préparé plusieurs options.",
    "Au ministère {ministereDe}, {ministre} plaide pour une réponse précise et chiffrée."],
  fidele: ["{Ministre} appliquera votre arbitrage sans états d'âme.", "Par loyauté, {ministre} attend votre feu vert pour agir."],
  populaire: ["{Ministre}, qui bénéficie d'une bonne image dans l'opinion, souhaite porter l'annonce.",
    "Avec une popularité solide, {ministre} veut une décision visible."],
  frondeur: ["{Ministre} fait savoir avoir sa propre idée de la réponse.", "Attention : {ministre} pourrait prendre ses distances publiquement."],
  fragilise: ["Déjà en difficulté, {ministre} ne peut pas se permettre un nouvel échec.", "En position délicate, {ministre} a besoin d'un arbitrage clair de votre part."],
  discret: ["{Ministre} suivra le dossier au ministère {ministereDe}.", "Le ministère {ministereDe} attend vos instructions."],
};

export const REGISTRES_BERCY: Readonly<Record<"marge" | "vigilance" | "alerte", readonly string[]>> = {
  marge: ["Les comptes laissent une marge : le solde cumulé de l'État s'établit à {solde}, pour {soldeRef} dans la référence.",
    "La situation budgétaire est tenue : {solde} de solde cumulé, pour {soldeRef} dans la référence."],
  vigilance: ["Les marges se réduisent : solde cumulé de {solde} contre {soldeRef} en référence, et un encours Acoss à {usage} de son plafond.",
    "Vigilance budgétaire : le taux à long terme atteint {taux} et l'Acoss utilise {usage} de son plafond d'emprunt."],
  alerte: ["Alerte budgétaire : solde cumulé de {solde} contre {soldeRef} en référence, taux à long terme à {taux}, Acoss à {usage} de son plafond.",
    "La trésorerie est au plus juste : {acoss} empruntés par l'Acoss sur {plafond} autorisés, crédibilité financière à {credibilite} points."],
};

export const REGISTRES_SOCIAL: Readonly<Record<"apaise" | "tendu" | "rupture", readonly string[]>> = {
  apaise: ["Le climat social reste calme : la radicalisation la plus forte, celle {corpsDe}, s'établit à {radicalisation} points.",
    "Pas de foyer de conflit majeur : la tension la plus vive concerne {corpsLe} ({radicalisation} points)."],
  tendu: ["Le climat se tend : la radicalisation {corpsDe} atteint {radicalisation} points, pour un seuil de blocage à {seuilBlocage}.",
    "Attention au climat social : {radicalisation} points de radicalisation pour {corpsLe}, proche du seuil de blocage ({seuilBlocage})."],
  rupture: ["Le climat social est en rupture : la radicalisation {corpsDe} dépasse le seuil de blocage ({radicalisation} points pour {seuilBlocage}).",
    "Situation de rupture, {blocageMin} : radicalisation {corpsDe} à {radicalisation} points."],
};

export const RECO_BERCY = {
  option: ["Bercy recommande : « {option} »{impact}.", "Option privilégiée par Bercy : « {option} »{impact}."],
  aucune: ["Bercy recommande de ne pas engager de dépense nouvelle tant que la situation n'est pas consolidée.",
    "Bercy conseille d'attendre la prochaine publication avant toute mesure coûteuse."],
  concession: ["Bercy reconnaît que l'inaction a aussi un coût social.", "Bercy admet qu'une réponse trop tardive pourrait coûter plus cher."],
};

export const RECO_SOCIAL = {
  option: ["Le Cabinet social recommande : « {option} »{impact}.", "Option privilégiée par le Cabinet social : « {option} »{impact}."],
  aucune: ["Le Cabinet social recommande d'ouvrir sans attendre un temps d'écoute avec les acteurs concernés.",
    "Le Cabinet social conseille une prise de parole rapide pour expliquer la méthode."],
  concession: ["Le Cabinet social reconnaît que toute mesure devra être financée.", "Le Cabinet social admet que la réponse doit rester soutenable pour les comptes publics."],
};

export const TITRES_NOTES = {
  bercy: ["Note de Bercy : {theme}", "Bercy : coût et soutenabilité, {theme}"],
  social: ["Note du Cabinet social : {theme}", "Cabinet social : effets sur les Français, {theme}"],
};

/** Chapeaux d'Une par niveau de gravité du dossier principal. */
export const CHAPEAUX: Bloc = {
  1: ["Un dossier à suivre, sans urgence à ce stade. {ResumeCourt}.", "Signal faible mais réel. {ResumeCourt}."],
  2: ["La tension monte et l'exécutif est attendu. {ResumeCourt}.", "Le dossier s'invite au sommet de l'État. {ResumeCourt}."],
  3: ["Situation d'urgence, l'exécutif doit trancher. {ResumeCourt}.", "Le pays retient son souffle. {ResumeCourt}."],
};

/** Coût de l'inaction : la gravité d'un dossier non traité croît chaque jour. */
export const INACTION: readonly string[] = [
  "Ce dossier attend votre arbitrage depuis {attente} jours ; sa gravité s'accroît chaque jour.",
  "Sans décision depuis {attente} jours, la situation s'aggrave.",
];

/** Ligne généraliste sans dossier ouvert. */
export const UNE_GENERALISTE = {
  calme: ["Journée calme au sommet de l'État", "L'exécutif prépare les prochaines échéances"],
  chapeauCalme: ["Aucun dossier urgent sur le bureau présidentiel ; le capital politique disponible atteint {capital}.",
    "Les ministères avancent sur leurs chantiers ; opinion en moyenne glissante : {opinionMoy}."],
};

/** Ligne économique : indicateurs macroéconomiques, indépendamment du dossier principal. */
export const UNE_ECONOMIQUE = {
  degrade: ["{Indicateur} : le signal qui inquiète les marchés", "Économie : dégradation {deIndicateur}"],
  ameliore: ["{Indicateur} : une éclaircie pour l'économie", "Économie : amélioration {deIndicateur}"],
  calme: ["Économie : une journée sans surprise", "Les marchés attendent la prochaine publication"],
  chapeau: ["Niveau {deIndicateur} : {valeur}, contre {reference} dans la trajectoire de référence.",
    "Le solde cumulé de l'État atteint {solde} ; niveau {deIndicateur} : {valeur}."],
  chapeauCalme: ["Le solde cumulé de l'État atteint {solde}, pour {soldeRef} dans la trajectoire de référence.",
    "Le taux à long terme de l'État s'établit à {taux}."],
};

export const UNE_POPULAIRE = {
  degrade: ["{Indicateur} : ce qui se dégrade pour vous", "Votre quotidien : {leIndicateur} en question"],
  ameliore: ["{Indicateur} : une bonne nouvelle pour votre quotidien", "Enfin du mieux pour {leIndicateur}"],
  chapeau: ["Niveau {deIndicateur} : {valeur}, contre {reference} dans le scénario sans vos décisions.", "Le chiffre qui vous concerne : {valeur} pour {leIndicateur}."],
};

export const BREVES = {
  decision: ["Décision présidentielle : {libelle}.", "Arbitrage rendu : {libelle}."],
  decisionRefusee: ["Arbitrage impossible : {libelle}."],
  texte: ["« {texte} » : {etape} le {echeance}.", "Parlement : {etape} prévu le {echeance} pour « {texte} »."],
  blocage: ["{Corps} : {blocageMin} en cours.", "Mouvement en cours : {blocageMin}."],
  mur: ["Trésorerie : {libelle} le {echeance} ({montant}).", "Mur de trésorerie le {echeance} : {libelle} ({montant})."],
  publication: ["Publication officielle : {valeur} pour {leIndicateur}.", "Chiffre officiel, {leIndicateur} : {valeur}."],
  opinion: ["Opinion, moyenne glissante : {opinionMoy}.", "Baromètre de l'opinion en moyenne glissante : {opinionMoy}."],
  capital: ["Capital politique disponible : {capital} sur {plafondCP}.", "Réserve de capital politique : {capital}, pour un plafond de {plafondCP}."],
};

/** Versions neutres de repli : sans nombre ni nom propre, toujours valides. */
export const NEUTRES = {
  titre: "Dossier en cours d'instruction",
  briefing: "Les services de l'État instruisent ce dossier ; les données détaillées figurent au tableau de bord.",
  note: "La note détaillée n'a pas pu être établie avec les données disponibles.",
  une: "Actualité du jour",
  chapeau: "Les rédactions suivent l'actualité gouvernementale.",
  breve: "Activité gouvernementale en cours.",
};

export const LIBELLES_JALONS: Readonly<Record<string, string>> = {
  commission: "examen en commission",
  vote_an: "vote à l'Assemblée nationale",
  vote_senat: "vote au Sénat",
  lecture_definitive: "lecture définitive",
  motion_censure: "vote de la motion de censure",
  delai_constitutionnel: "échéance du délai constitutionnel",
};

export const EDITIONS: Readonly<Record<LigneEditoriale, string>> = {
  economique: "Édition économique",
  generaliste: "Édition générale",
  populaire: "Édition populaire",
};

/** Libellés « ministère de… » des 12 portefeuilles du moteur. */
export const MINISTERES_DE: Readonly<Record<string, string>> = {
  economie_finances: "de l'Économie et des Finances",
  travail_solidarites: "du Travail et des Solidarités",
  sante: "de la Santé",
  ecologie_energie: "de l'Écologie et de l'Énergie",
  transports_logement: "des Transports et du Logement",
  interieur: "de l'Intérieur",
  justice: "de la Justice",
  education_esr: "de l'Éducation et de l'Enseignement supérieur",
  agriculture: "de l'Agriculture",
  armees: "des Armées",
  europe_affaires_etrangeres: "de l'Europe et des Affaires étrangères",
  culture_sports: "de la Culture et des Sports",
};

/** Formes articulées des 8 corps intermédiaires du moteur. */
export const CORPS_ARTICLES: Readonly<Record<string, { le: string; de: string }>> = {
  patronat: { le: "le patronat", de: "du patronat" },
  syndicats_reformistes: { le: "les syndicats réformistes", de: "des syndicats réformistes" },
  syndicats_contestataires: { le: "les syndicats contestataires", de: "des syndicats contestataires" },
  monde_agricole: { le: "le monde agricole", de: "du monde agricole" },
  haute_fonction_publique: { le: "la haute fonction publique", de: "de la haute fonction publique" },
  collectivites: { le: "les collectivités locales", de: "des collectivités locales" },
  associatif_ecolo: { le: "le monde associatif et écologiste", de: "du monde associatif et écologiste" },
  classes_moyennes: { le: "les classes moyennes", de: "des classes moyennes" },
};

/** Genre et nombre du premier mot des libellés d'indicateurs (articles « le / la / l' / les »). */
export const GENRES: Readonly<Record<string, "m" | "f" | "p">> = {
  Indice: "m", Climat: "m", Production: "f", Taux: "m", Dette: "f", Solde: "m", Confiance: "f", Masse: "f", Offres: "p",
  Passages: "p", Médicaments: "p", Naissances: "p", Consommation: "f", Prix: "m", Stock: "m", Température: "f", Débit: "m",
  Trains: "p", Textes: "p", Personnes: "p", Variation: "f", Tension: "f", Mises: "p", Demande: "f", Demandes: "p",
  Délinquance: "f", Mobilisations: "p", Postes: "p", Effectifs: "p", Décrochage: "m", Stocks: "p", Revenu: "m",
  Disponibilité: "f", Coût: "m", Contribution: "f", Fonds: "p", Fréquentation: "f", Grands: "p", Emploi: "m",
};

/** Toutes les chaînes de la bibliothèque (pour les contrôles statiques et la liste blanche des noms propres). */
export function chainesGabarits(): string[] {
  const out: string[] = [];
  const visiter = (x: unknown): void => {
    if (typeof x === "string") out.push(x);
    else if (Array.isArray(x)) x.forEach(visiter);
    else if (x && typeof x === "object") Object.values(x).forEach(visiter);
  };
  visiter([THEMES, FAMILLES, DIVERGENCE, MINISTRES, REGISTRES_BERCY, REGISTRES_SOCIAL, RECO_BERCY, RECO_SOCIAL, TITRES_NOTES, CHAPEAUX,
    UNE_GENERALISTE, INACTION, UNE_ECONOMIQUE, UNE_POPULAIRE, BREVES, NEUTRES, LIBELLES_JALONS, EDITIONS, MINISTERES_DE, CORPS_ARTICLES, Object.keys(GENRES)]);
  return out;
}
