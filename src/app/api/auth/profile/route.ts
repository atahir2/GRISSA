import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/src/lib/auth/current-user";
import { getDb } from "@/src/lib/db/drizzle";
import { profiles } from "../../../../../drizzle/schema";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const db = getDb();
  const [profile] = await db
    .select({
      organisationName: profiles.organisationName,
      organisationSize: profiles.organisationSize,
      industry: profiles.industry,
      country: profiles.country,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return NextResponse.json({
    organisationName: profile?.organisationName ?? "",
    organisationSize: profile?.organisationSize ?? "",
    industry: profile?.industry ?? "",
    country: profile?.country ?? "",
  });
}
