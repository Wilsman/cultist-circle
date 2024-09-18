// app/api/pvp-items/route.ts

import { NextResponse } from "next/server";

const PVP_API_URL = "https://api.tarkov-market.app/api/v1/items/all";

export async function GET() {
  try {
    const response = await fetch(PVP_API_URL, {
      headers: {
        "x-api-key": process.env.API_KEY || "",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to fetch PVP data" },
        { status: response.status }
      );
    }

    const data: Item[] = await response.json();

    // Optional: Filter or map the data to include only necessary fields
    // const filteredData = data.map(item => ({
    //   uid: item.uid,
    //   name: item.name,
    //   price: item.price,
    //   basePrice: item.basePrice,
    //   // Add other necessary fields
    // }));

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
