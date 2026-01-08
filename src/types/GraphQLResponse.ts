export interface TarkovItem {
  id: string;
  name: string;
  shortName: string;
  basePrice: number;
  lastLowPrice: number | null;
  avg24hPrice: number | null;
  updated: string;
  lastOfferCount: number | null;
  iconLink: string;
  link?: string;
  height: number;
  width: number;
  categories: Array<{
    id?: string;
    name: string;
  }>;
  buyFor?: Array<{
    priceRUB: number;
    vendor: {
      normalizedName: string;
      minTraderLevel?: number;
    };
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