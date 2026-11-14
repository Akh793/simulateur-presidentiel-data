import { Redirect, Tabs } from "expo-router";
import { Icone, type NomIcone } from "../../components/svg/Icones";
import { useJeu } from "../../core/jeu";
import { melange, P } from "../../theme/palette";

const ONGLETS: { nom: string; titre: string; icone: NomIcone }[] = [
  { nom: "bureau", titre: "Bureau", icone: "bureau" },
  { nom: "hemicycle", titre: "Hémicycle", icone: "hemicycle" },
  { nom: "cockpit", titre: "Cockpit", icone: "cockpit" },
  { nom: "tresorerie", titre: "Trésorerie", icone: "tresorerie" },
  { nom: "une", titre: "Une du 20h", icone: "une" },
];

export default function JeuLayout() {
  const jeu = useJeu();
  if (!jeu.session) return <Redirect href="/" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: P.nuit, borderTopColor: P.or, borderTopWidth: 1 },
      tabBarActiveTintColor: P.or,
      tabBarInactiveTintColor: melange(P.papier, P.ardoise, 0.4),
      tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
    }}>
      {ONGLETS.map((o) => (
        <Tabs.Screen key={o.nom} name={o.nom} options={{ title: o.titre, tabBarIcon: ({ color }) => <Icone nom={o.icone} couleur={String(color)} /> }} />
      ))}
    </Tabs>
  );
}
