/**
 * Zod schemas for card JSON data.
 *
 * These mirror the TS types in @cards/shared exactly, and are used to:
 *   1. Parse + validate JSON data at module load (see ./index.ts)
 *   2. Power the `cards:check` CLI that non-engineers run after edits
 *
 * If you change the shape of a card in @cards/shared/src/types.ts, update the
 * matching schema here too — the compiler won't catch drift because the JSON
 * isn't directly type-bound to those interfaces.
 */
import { z } from "zod";
import type {
  UnitCard,
  WeaponCard,
  ItemCard,
  SupportCard,
  TacticCard,
} from "@cards/shared";

// ── Primitives ──

const AttackTypeSchema = z.enum([
  "sword",
  "axe",
  "lance",
  "bow",
  "fire",
  "wind",
  "thunder",
]);

const UnitTagSchema = z.enum(["flying", "mounted", "armored", "infantry"]);

const StatKeySchema = z.enum(["hp", "str", "mag", "def", "res", "spd"]);

const StatsSchema = z.object({
  hp: z.number().int(),
  str: z.number().int().nonnegative(),
  mag: z.number().int().nonnegative(),
  def: z.number().int().nonnegative(),
  res: z.number().int().nonnegative(),
  spd: z.number().int().nonnegative(),
});

const FieldRowSchema = z.enum(["front", "back"]);
const FieldColSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const FieldPositionSchema = z.object({
  row: FieldRowSchema,
  col: FieldColSchema,
});

// ── Effects (discriminated union) ──

const EffectSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("damage_multiplier_vs_tag"),
    tag: UnitTagSchema,
    multiplier: z.number().positive(),
  }),
  z.object({ kind: z.literal("double_attack") }),
  z.object({ kind: z.literal("heal_adjacent"), amount: z.number().int().positive() }),
  z.object({ kind: z.literal("heal_target"), amount: z.number().int().positive() }),
  z.object({
    kind: z.literal("buff_target"),
    stat: StatKeySchema,
    amount: z.number().int(),
    duration: z.number().int().nonnegative(),
  }),
  z.object({ kind: z.literal("damage_target"), amount: z.number().int().positive() }),
  z.object({
    kind: z.literal("reposition"),
    from: FieldPositionSchema,
    to: FieldPositionSchema,
  }),
  z.object({ kind: z.literal("draw_cards"), amount: z.number().int().positive() }),
  z.object({ kind: z.literal("ranged") }),
  z.object({ kind: z.literal("flying") }),
  z.object({
    kind: z.literal("pair_bonus"),
    stat: StatKeySchema,
    amount: z.number().int(),
  }),
]);

// ── Cards ──

// Card ids feed into asset URLs (e.g. `/cards/<id>.png`) and Map keys, so
// restrict to kebab-case slugs — no dots, slashes, or whitespace that could
// change path resolution or break logs/lookups.
const CardIdSchema = z.string().regex(/^[a-z0-9-]+$/, {
  message: "id must be lowercase alphanumerics and hyphens",
});

const commonStringFields = {
  id: CardIdSchema,
  name: z.string().min(1),
  cost: z.number().int().nonnegative(),
  flavor: z.string().optional(),
};

export const UnitCardSchema = z.object({
  type: z.literal("unit"),
  ...commonStringFields,
  class: z.string().min(1),
  attackType: AttackTypeSchema,
  stats: StatsSchema,
  maxHp: z.number().int().positive(),
  tags: z.array(UnitTagSchema).min(1),
  effects: z.array(EffectSchema),
  isLord: z.boolean(),
}) satisfies z.ZodType<UnitCard>;

export const WeaponCardSchema = z.object({
  type: z.literal("weapon"),
  ...commonStringFields,
  attackType: AttackTypeSchema,
  statBoost: z
    .object({
      hp: z.number().int().optional(),
      str: z.number().int().optional(),
      mag: z.number().int().optional(),
      def: z.number().int().optional(),
      res: z.number().int().optional(),
      spd: z.number().int().optional(),
    })
    .partial(),
  effects: z.array(EffectSchema),
}) satisfies z.ZodType<WeaponCard>;

export const ItemCardSchema = z.object({
  type: z.literal("item"),
  ...commonStringFields,
  effects: z.array(EffectSchema),
}) satisfies z.ZodType<ItemCard>;

export const SupportCardSchema = z.object({
  type: z.literal("support"),
  ...commonStringFields,
  pairRequirement: z.object({
    classA: z.string().min(1),
    classB: z.string().min(1),
  }),
  effects: z.array(EffectSchema),
}) satisfies z.ZodType<SupportCard>;

export const TacticCardSchema = z.object({
  type: z.literal("tactic"),
  ...commonStringFields,
  effects: z.array(EffectSchema),
}) satisfies z.ZodType<TacticCard>;

// ── File-level schemas (a JSON file is an array of one card type) ──

export const UnitsFile = z.array(UnitCardSchema);
export const WeaponsFile = z.array(WeaponCardSchema);
export const ItemsFile = z.array(ItemCardSchema);
export const SupportsFile = z.array(SupportCardSchema);
export const TacticsFile = z.array(TacticCardSchema);

/**
 * Format a ZodError into friendly "file: card-id — field: message" lines
 * suitable for a non-engineer reading CLI output.
 */
export function formatZodIssues(file: string, data: unknown, error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const idx = typeof issue.path[0] === "number" ? issue.path[0] : null;
    const cardId =
      idx !== null &&
      Array.isArray(data) &&
      data[idx] &&
      typeof (data[idx] as { id?: unknown }).id === "string"
        ? ((data[idx] as { id: string }).id)
        : `entry ${idx ?? "?"}`;
    const fieldPath = issue.path.slice(1).join(".") || "(root)";
    return `${file}: ${cardId} — ${fieldPath}: ${issue.message}`;
  });
}
