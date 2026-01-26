// Normalized OCR token -> normalized item shortName mappings.
// Extend this list as you encounter common OCR misreads.
export const STASH_OCR_ALIASES: Record<string, string> = {
  // Common OCR misreads
  H202: "H2O2",
  POWERBAN: "POWERBANK",
  SCGEWS: "SCREWS",
  "1GBHONE": "1GPHONE",
  "1GRHONE": "1GPHONE",
  SGZC10: "SGC10",
  SGSC10: "SGC10",
  FIREKLEA: "FIREKLEAN",
  FIREKLEAN: "FIREKLEAN",
  RLASH: "FLASHDRIVE",
  // PAPAPAR: "PARACORD", // Removed - causes false positives
  RFILTER: "WFILTER",
  HE: "HELIX",
  HOSEL: "HOSE",
  OSE: "HOSE",
  MOPARTS: "MPARTS",
  FAN: "CPUFAN",
  CAER: "CAMERA",
  BLASHDRIV: "FLASHDRIVE",
  ELASHDRIV: "FLASHDRIVE",
  APS: "MAPS",
  TOOTHPAST: "TOOTHPASTE",
  BEARDQIL: "BEARDOIL",
  DRLLUPOS: "DRLUPOS",
  ET: "TOOLSET",

  // Items from Tarkov stash screenshots
  RBATTERY: "RBATTERY",
  MTUBE: "MTUBE",
  MS2000: "MS2000",
  LEDX: "LEDX",
  TAPE: "TAPE",
  PLEXIGLASS: "PLEXIGLASS",
  PGAUGE: "PGAUGE",
  THERM: "THERM",
  TUBE: "TUBE",
  POXERAM: "POXERAM",
  KEK: "KEK",
  MPARTS: "MPARTS",
  GPHONE: "GPHONE",
  CPUFAN: "CPUFAN",
  CPU: "CPU",
  TPLUG: "TPLUG",
  SMT: "SMT",
  PFILTER: "PFILTER",
  WIRES: "WIRES",
  SPLUG: "SPLUG",
  LION: "LION",
  CORD: "CORD",
  EGG: "EGG",
  TOOLSET: "TOOLSET",
  RFIDR: "RFIDR",
  VPX: "VPX",
  MCABLE: "MCABLE",
  GPSA: "GPSA",
  MCC: "MCC",
  WD40: "WD40",
  THERMITE: "THERMITE",
  SSD: "SSD",
  FLASHDRIV: "FLASHDRIVE",
  FLASHDRIVE: "FLASHDRIVE",
  DIARY: "DIARY",
  MFD: "MFD",
  BAKEEZY: "BAKEEZY",
  CAMERA: "CAMERA",
  ROOSTER: "ROOSTER",
  REPELLENT: "REPELLENT",
  TEAPOT: "TEAPOT",
  DUCTTAPE: "DUCTTAPE",
  SKULL: "SKULL",
  CAT: "CAT",
  AXEL: "AXEL",
  MSCISSORS: "MSCISSORS",
  PLIERS: "PLIERS",
  SCAV: "SCAV",
  PGW: "PGW",
  ROLER: "ROLER",
  NIXXOR: "NIXXOR",
  RELAY: "RELAY",
  GPX: "GPX",
  LOOTLORD: "LOOTLORD",
  DRLUPOS: "DRLUPOS",
  BEARDOIL: "BEARDOIL",

  // Partial matches and truncated names
  FIREKIE: "FIREKLEAN",
  FIREKLE: "FIREKLEAN",
  FLASHDR: "FLASHDRIVE",
  FLASHDRI: "FLASHDRIVE",
  THERMIT: "THERMITE",
  PLEXIGL: "PLEXIGLASS",
  PLEXIGLA: "PLEXIGLASS",
  TOOLSE: "TOOLSET",
  REPELLEN: "REPELLENT",

  // OCR misreads from screenshot2.png testing
  MFO: "MFD", // MFD misread as MFO
  RGW: "PGW", // PGW misread as RGW
  DUCTYTAPE: "DUCTTAPE", // Duct tape misread
  DUCKTAPE: "DUCTTAPE",
  VEX: "VPX", // VPX misread as VEX
  RLASHDRIV: "FLASHDRIVE", // Flash drive misread
  BAKEZY: "BAKEEZY", // BakeEzy variations
  BAKEEY: "BAKEEZY",
  LOOTORD: "LOOTLORD",
  DRLUPOSS: "DRLUPOS",
  T0PLUG: "TPLUG", // T-Plug with zero instead of hyphen
  SCREW: "SCREWS",
  PFLLTER: "PFILTER", // PFilter misreads
  PFLITER: "PFILTER",
  PLIER: "PLIERS", // Pliers misreads
  PLLERS: "PLIERS",
  PILERS: "PLIERS",

  // Additional misreads found in testing
  SVRED: "SMT", // SMT misread as SVRED

  // Loot Lord - OCR splits into two words
  LOOT: "LOOTLORD",
  LORD: "LOOTLORD",

  // Additional misreads from website testing
  SCNPEWS: "SCREWS",
};
