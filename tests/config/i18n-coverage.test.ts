// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import JSON5 from "json5";
import ts from "typescript";

const ROOT = path.resolve(__dirname, "../..");
const SOURCE_DIRS = ["app", "components", "contexts", "hooks", "lib"];
const LOCALE_DIR = path.join(ROOT, "config/i18n");

// Keys passed to t() through variables (nav labels, tab ids, sort options,
// reward tiers, scanner errors). Add new ones here when t() gets a non-literal.
const DYNAMIC_KEYS = [
  "Calculator",
  "Recipes",
  "Tracker",
  "Stash Scan",
  "Base Values",
  "Help & FAQ",
  "Updates",
  "General",
  "Categories",
  "Excluded Items",
  "Data & Reset",
  "Item name: A-Z",
  "Most recently updated",
  "Base Value: Low to High",
  "Base Value: High to Low",
  "Best value for money",
  "2 hours",
  "3 hours",
  "4 hours",
  "5 hours",
  "6 hours",
  "8 hours",
  "12 hours",
  "14 hours",
  "6 hours or 14 hours",
  ">= 400,000 25% chance of Quest/Hideout items",
  "No inventory slots were found in this screenshot. Upload an uncropped, full-resolution screenshot of your stash or a container. If it already is one, restart your browser and try again.",
  "Default",
  "Fastest First",
  "Slowest First",
  "Newest First",
  "Recently Worked",
  "Recently Failed",
  // Game mode labels (t(GAME_MODE_LABELS[mode]))
  "PVP",
  "PVE",
  "Season",
  // Item socket bonus options (t(item.name))
  "No bonus item",
  "Sacred Amulet",
  // Recipe submission timers and units (t(timer.label), t(unit))
  "6 minutes",
  "66 minutes",
  "666 minutes",
  "hours",
  "minutes",
  "seconds",
  // Onboarding tier notes and workflow labels (t(tier.note), t(label))
  "25% quest/hideout",
  "High value",
  "Set mode & target",
  "Auto Select",
  "Start & track",
  // Update alert / bell notification titles and toast notifications
  "SAS drive ➡️ THOR IC no longer works",
  "Black Division ritual still works in PvP Season",
  "Update: Black Division ritual works in PvP Season",
  "New figurine recipes: Black Division and Wedge",
  "In 66 mins the Black Division Operator figurine returns a Siege-R plate carrier and the Wedge figurine returns a CS gas grenade. Know the Team Leader timer and reward? Post it in our Discord.",
  "Confirmed working in PvP Season only. The launcher codes no longer work, but you can find Ferrum dogtags on Black Division bodies or exchange BP documents for them in the Battlepass.",
  // Recipe feedback store messages ({key} objects, not t() literals)
  "Community reports are temporarily unavailable",
  "Too many reports. Try again in {seconds}s.",
  "Too many reports. Please try again shortly.",
  "Report saved.",
  "Report removed.",
  "Your report was not saved. Please try again.",
  "Recipe reports could not be loaded",
  "Recipe report could not be saved",
  // Ritual reminder notification (uses getMessage directly, not t())
  "{mode} ritual ready",
  // Relative-time labels (t(relative.key) via relativeTimeParts)
  "just now",
  "{n}m ago",
  "{n}h ago",
  "yesterday",
  "{n}d ago",
  "{n}mo ago",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      return name === "node_modules" ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

function literalKeys(node: ts.Expression): string[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return [node.text];
  }
  if (ts.isParenthesizedExpression(node)) return literalKeys(node.expression);
  if (ts.isConditionalExpression(node)) {
    return [...literalKeys(node.whenTrue), ...literalKeys(node.whenFalse)];
  }
  return [];
}

function collectKeys(): Set<string> {
  const keys = new Set<string>(DYNAMIC_KEYS);
  for (const dir of SOURCE_DIRS) {
    for (const file of sourceFiles(path.join(ROOT, dir))) {
      const text = readFileSync(file, "utf8");
      if (!/\bt\(/.test(text)) continue;
      const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "t" &&
          node.arguments.length > 0
        ) {
          for (const key of literalKeys(node.arguments[0])) keys.add(key);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  return keys;
}

const placeholders = (message: string) =>
  [...message.matchAll(/\{(\w+)\}/g)]
    .map((match) => match[1])
    .sort()
    .join(",");

const keys = [...collectKeys()];
const locales = readdirSync(LOCALE_DIR)
  .filter((name) => name.endsWith(".json5") && name !== "en.json5")
  .map((name) => name.replace(/\.json5$/, ""));

describe("i18n coverage", () => {
  it("finds the translated keys in source", () => {
    expect(keys.length).toBeGreaterThan(500);
    expect(locales.length).toBeGreaterThan(0);
  });

  it.each(locales)("%s translates every key with matching placeholders", (lang) => {
    const messages = JSON5.parse(
      readFileSync(path.join(LOCALE_DIR, `${lang}.json5`), "utf8"),
    ) as Record<string, unknown>;

    const missing = keys.filter((key) => typeof messages[key] !== "string");
    const mismatched = keys.filter(
      (key) =>
        typeof messages[key] === "string" &&
        placeholders(messages[key] as string) !== placeholders(key),
    );

    expect(missing).toEqual([]);
    expect(mismatched).toEqual([]);
  });
});
