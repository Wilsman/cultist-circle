export interface TarkovItem {
  id: string;
  name: string;
  basePrice: number;
  lastLowPrice: number | null;
  avg24hPrice: number | null;
  updated: string;
  lastOfferCount: number | null;
  iconLink: string;
  categories: Array<{
    name: string;
  }>;
}

export interface GraphQLResponse {
  data?: {
    // Support for single mode query
    items?: Array<TarkovItem>;
    // Support for combined mode query
    pvpItems?: Array<TarkovItem>;
    pveItems?: Array<TarkovItem>;
  };
  errors?: Array<{ message: string }>;
}