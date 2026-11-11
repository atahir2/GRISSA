export type StandardKind = "standard" | "regulation" | "directive" | "certification";

export type StandardAudience = "DC" | "RI" | "Org";

export interface StandardEntry {
  id: string;
  name: string;
  kind: StandardKind;
  summary: string;
  url: string;
  audiences: StandardAudience[];
  industries: string[];
  operatingModels: string[];
}

export interface StandardsCatalog {
  standards: StandardEntry[];
}
