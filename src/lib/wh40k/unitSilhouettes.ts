import type { BaseSize } from "./gameTypes";

export type SilhouetteType =
  | "space_marine_infantry"
  | "space_marine_vehicle"
  | "space_marine_dreadnought"
  | "tyranid_infantry"
  | "tyranid_monster"
  | "necron_infantry"
  | "necron_vehicle"
  | "generic_infantry"
  | "generic_vehicle";

// All paths are defined in a [-10, 10] normalized space.
// Apply a scale transform to fit the actual SVG radius.
const SILHOUETTES: Record<SilhouetteType, string> = {
  space_marine_infantry:
    // helmet
    "M-2.5,-9 L2.5,-9 L2.5,-4 L-2.5,-4 Z " +
    // left shoulder pad
    "M-5.5,-4.5 L-2,-4.5 L-2,-2 L-5.5,-2 Z " +
    // right shoulder pad
    "M2,-4.5 L5.5,-4.5 L5.5,-2 L2,-2 Z " +
    // body
    "M-2.5,-4.5 L2.5,-4.5 L2.5,2.5 L-2.5,2.5 Z " +
    // left leg
    "M-2.5,2.5 L-0.5,2.5 L-0.5,9 L-2.5,9 Z " +
    // right leg
    "M0.5,2.5 L2.5,2.5 L2.5,9 L0.5,9 Z",

  space_marine_vehicle:
    // hull
    "M-8,-4 L8,-4 L8,4 L-8,4 Z " +
    // turret
    "M-3,-7 L3,-7 L3,-4 L-3,-4 Z " +
    // gun barrel
    "M3,-6.5 L9,-6.5 L9,-5.5 L3,-5.5 Z " +
    // left track
    "M-8,4 L-3,4 L-3,7 L-8,7 Z " +
    // right track
    "M3,4 L8,4 L8,7 L3,7 Z",

  space_marine_dreadnought:
    // head
    "M-2,-9 L2,-9 L2,-5.5 L-2,-5.5 Z " +
    // wide torso (hunched)
    "M-6,-5.5 L6,-5.5 L7,0 L-7,0 Z " +
    // left arm/weapon
    "M-9,-4.5 L-6,-4.5 L-6,1 L-9,1 Z " +
    // right arm/weapon
    "M6,-4.5 L9,-4.5 L9,1 L6,1 Z " +
    // left leg
    "M-4.5,0 L-1.5,0 L-1.5,7.5 L-4.5,7.5 Z " +
    // right leg
    "M1.5,0 L4.5,0 L4.5,7.5 L1.5,7.5 Z",

  tyranid_infantry:
    // oval body (approximated with polygon)
    "M0,-8 L3,-6 L6,-2 L5.5,3 L2,6 L0,7 L-2,6 L-5.5,3 L-6,-2 L-3,-6 Z " +
    // upper limbs
    "M-5.5,-3 L-9,-7 L-8,-8.5 L-4.5,-4 Z " +
    "M5.5,-3 L9,-7 L8,-8.5 L4.5,-4 Z " +
    // lower limbs
    "M-5.5,3 L-9,7.5 L-8,8.5 L-4.5,4 Z " +
    "M5.5,3 L9,7.5 L8,8.5 L4.5,4 Z",

  tyranid_monster:
    // elongated body
    "M-7,-5 L-5,-9 L0,-9.5 L5,-9 L8,-5 L9,3 L6,7.5 L0,8 L-6,7.5 L-9,3 Z " +
    // upper claws
    "M-8,-4 L-10.5,-8 L-9,-9 L-7,-5 Z " +
    "M8,-4 L10.5,-8 L9,-9 L7,-5 Z " +
    // lower claws
    "M-8,3 L-10.5,7.5 L-9,8.5 L-7,4 Z " +
    "M8,3 L10.5,7.5 L9,8.5 L7,4 Z",

  necron_infantry:
    // elongated skull head
    "M-2,-9 L2,-9 L2.5,-5.5 L-2.5,-5.5 Z " +
    // thin body/spine
    "M-1.5,-5.5 L1.5,-5.5 L1.5,2 L-1.5,2 Z " +
    // arms
    "M-4.5,-4.5 L-1.5,-4.5 L-1.5,-2.5 L-4.5,-2.5 Z " +
    "M1.5,-4.5 L4.5,-4.5 L4.5,-2.5 L1.5,-2.5 Z " +
    // thin legs
    "M-1.5,2 L-0.3,2 L-0.3,9 L-1.5,9 Z " +
    "M0.3,2 L1.5,2 L1.5,9 L0.3,9 Z",

  necron_vehicle:
    // flying saucer hull
    "M-9,-2 L-8,-5 L0,-6 L8,-5 L9,-2 L9,2 L8,5 L0,6 L-8,5 L-9,2 Z " +
    // central spine
    "M-7,-0.5 L7,-0.5 L7,0.5 L-7,0.5 Z " +
    // engine pods
    "M-9,-1 L-12,-3 L-12,3 L-9,1 Z " +
    "M9,-1 L12,-3 L12,3 L9,1 Z",

  generic_infantry:
    // head
    "M-2,-9 L2,-9 L2,-5.5 L-2,-5.5 Z " +
    // body
    "M-3,-5.5 L3,-5.5 L3,3 L-3,3 Z " +
    // left leg
    "M-3,3 L-1,3 L-1,9 L-3,9 Z " +
    // right leg
    "M1,3 L3,3 L3,9 L1,9 Z",

  generic_vehicle:
    // hull
    "M-8,-5 L8,-5 L8,5 L-8,5 Z " +
    // left track
    "M-8,5 L-3,5 L-3,8 L-8,8 Z " +
    // right track
    "M3,5 L8,5 L8,8 L3,8 Z",
};

export function getSilhouettePath(type: SilhouetteType): string {
  return SILHOUETTES[type];
}

export function silhouetteTypeForUnit(faction: string, baseSize: BaseSize): SilhouetteType {
  const f = faction.toLowerCase();
  const isMarines = f.includes("marine") || f.includes("angel") || f.includes("astartes");
  const isNecrons = f.includes("necron");
  const isTyranids = f.includes("tyranid") || f.includes("nid");

  if (isMarines) {
    if (baseSize === "monster" || baseSize === "vehicle") return "space_marine_vehicle";
    if (baseSize === "dreadnought" || baseSize === "walker") return "space_marine_dreadnought";
    return "space_marine_infantry";
  }
  if (isNecrons) {
    if (baseSize === "monster" || baseSize === "vehicle" || baseSize === "dreadnought") return "necron_vehicle";
    return "necron_infantry";
  }
  if (isTyranids) {
    if (baseSize === "monster" || baseSize === "vehicle") return "tyranid_monster";
    return "tyranid_infantry";
  }
  if (baseSize === "monster" || baseSize === "vehicle" || baseSize === "titan" || baseSize === "superheavy") return "generic_vehicle";
  return "generic_infantry";
}

// Keyword-based icon paths, defined in a [-10, 10] normalized space.
// Priority order: Titanic > Flyer > Monster > Walker > Vehicle/Transport > Cavalry > Terminator > Character > Infantry
export function getUnitIcon(keywords: string[]): string {
  const kw = keywords.map((k) => k.toUpperCase());
  if (kw.includes("TITANIC"))
    return "M0,-8 L3,-2 L8,0 L3,2 L0,8 L-3,2 L-8,0 L-3,-2 Z";
  if (kw.includes("FLYER"))
    return "M0,-6 L8,2 L2,0 L0,6 L-2,0 L-8,2 Z";
  if (kw.includes("MONSTER"))
    return "M-6,-4 L-2,-8 L2,-8 L6,-4 L8,2 L0,6 L-8,2 Z";
  if (kw.includes("WALKER"))
    return "M-3,-8 L3,-8 L5,-2 L3,0 L5,6 L0,8 L-5,6 L-3,0 L-5,-2 Z";
  if (kw.includes("VEHICLE") || kw.includes("TRANSPORT"))
    return "M-8,-3 L-4,-6 L4,-6 L8,-3 L8,3 L4,6 L-4,6 L-8,3 Z";
  if (kw.includes("CAVALRY") || kw.includes("MOUNTED"))
    return "M-5,-6 L0,-8 L5,-6 L7,0 L5,6 L0,4 L-5,6 L-7,0 Z";
  if (kw.includes("TERMINATOR"))
    return "M-4,-8 L4,-8 L6,-4 L6,2 L4,8 L-4,8 L-6,2 L-6,-4 Z";
  if (kw.includes("CHARACTER"))
    return "M0,-8 L2,-3 L8,-3 L3,1 L5,7 L0,3 L-5,7 L-3,1 L-8,-3 L-2,-3 Z";
  if (kw.includes("INFANTRY"))
    return "M-2,-8 L2,-8 L3,-2 L6,0 L3,4 L3,8 L-3,8 L-3,4 L-6,0 L-3,-2 Z";
  return "M0,-6 A6,6 0 1,1 0,6 A6,6 0 1,1 0,-6";
}

// Radius multipliers (in inches on the board) per base size
export const BASE_RADIUS_INCHES: Record<BaseSize, number> = {
  infantry:       0.5,
  elite_infantry: 0.8,
  terminator:     0.8,
  cavalry:        1.2,
  bike:           1.2,
  dreadnought:    1.0,
  walker:         1.0,
  monster:        1.6,
  vehicle:        1.6,
  titan:          2.4,
  superheavy:     2.4,
};
