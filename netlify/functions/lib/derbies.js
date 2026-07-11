// Static rivalry list. Barely changes season to season, so no need to compute
// this — just keep it updated by hand if a new fixture rivalry matters.
// Each entry is two lists of name fragments (lowercased, accent-stripped)
// that identify either side of the rivalry, matched against team names
// coming back from football-data.org.
export const DERBIES = [
  { name: "El Clasico", sides: [["real madrid"], ["barcelona"]] },
  { name: "Der Klassiker", sides: [["bayern"], ["dortmund"]] },
  { name: "Derby della Madonnina", sides: [["internazionale", "inter milano"], ["ac milan", "milan"]] },
  { name: "Derby d'Italia", sides: [["juventus"], ["internazionale", "inter milano"]] },
  { name: "North London Derby", sides: [["arsenal"], ["tottenham"]] },
  { name: "Manchester Derby", sides: [["manchester united"], ["manchester city"]] },
  { name: "Merseyside Derby", sides: [["liverpool"], ["everton"]] },
  { name: "North West Derby", sides: [["liverpool"], ["manchester united"]] },
  { name: "Le Classique", sides: [["paris saint-germain", "psg"], ["marseille"]] },
  { name: "Derby della Capitale", sides: [["roma"], ["lazio"]] },
  { name: "El Gran Derbi (Seville Derby)", sides: [["sevilla"], ["real betis", "betis"]] },
  { name: "Basque Derby", sides: [["athletic club", "athletic bilbao"], ["real sociedad"]] },
  { name: "Revierderby", sides: [["dortmund"], ["schalke"]] },
  { name: "Rhein-Ruhr Derby", sides: [["dortmund"], ["koln", "koeln", "cologne"]] },
];

function normalize(name) {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(fc|cf|afc|sad|cfc)\b/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sideMatches(normalizedName, fragments) {
  return fragments.some((f) => normalizedName.includes(f));
}

/** Returns the derby name if homeName vs awayName is a known rivalry, else null. */
export function findDerby(homeName, awayName) {
  const home = normalize(homeName);
  const away = normalize(awayName);
  for (const derby of DERBIES) {
    const [a, b] = derby.sides;
    if ((sideMatches(home, a) && sideMatches(away, b)) || (sideMatches(home, b) && sideMatches(away, a))) {
      return derby.name;
    }
  }
  return null;
}
