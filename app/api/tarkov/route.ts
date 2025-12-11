import { NextRequest, NextResponse } from "next/server";

const GRAPHQL_API_URL = "https://api.tarkov.dev/graphql";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(GRAPHQL_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                // Forward generic user agent if needed, or set a custom one
                "User-Agent": "CultistCircle/1.0",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Tarkov API responded with ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Proxy error fetching from Tarkov API:", error);
        return NextResponse.json(
            { error: "Failed to fetch from Tarkov API" },
            { status: 500 }
        );
    }
}
