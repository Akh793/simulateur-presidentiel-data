// Metro : l'application importe le code source de ../engine, ../mobile-core et ../shared (monorepo sans
// workspaces npm). Expo configure seul les monorepos à workspaces ; ici, on déclare la racine du dépôt
// et on résout les dépendances (zod) depuis node_modules de l'application.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const racineApp = __dirname;
const racineDepot = path.resolve(racineApp, "..");
const config = getDefaultConfig(racineApp);
const sous = (...p) => new RegExp(`^${path.join(racineDepot, ...p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([/\\\\].*)?$`);

config.watchFolders = [racineDepot];
config.resolver.nodeModulesPaths = [path.resolve(racineApp, "node_modules")];
// dépendances de développement et tests des autres paquets, relais Python et données : jamais embarqués
config.resolver.blockList = [
  sous("engine", "node_modules"), sous("mobile-core", "node_modules"),
  sous("engine", "tests"), sous("mobile-core", "tests"), sous("mobile-app", "tests"),
  sous("pipeline"), sous("data"), sous(".github"),
];
// expo-sqlite sur le web (aperçu et tests d'interface) : moteur SQLite en WebAssembly
config.resolver.assetExts.push("wasm");
module.exports = config;
