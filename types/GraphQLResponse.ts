export interface GraphQLResponse {
  data?: {
    items?: Array<{
      id: string;
      name: string;
      basePrice: number;
      lastLowPrice: number | null;
      updated: string;
      lastOfferCount: number | null;
      iconLink: string;
      categories: Array<{
        name: string;
      }>;
    }>;
  };
  errors?: Array<{ message: string }>;
}