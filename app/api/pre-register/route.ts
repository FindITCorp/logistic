import { NextRequest, NextResponse } from "next/server";
import { preRegisterSchema } from "@/lib/validation/schemas";

// In-memory store for Phase 1 validation — visible in server logs
const leads: Array<{ email: string; name?: string; company?: string; volume?: number; ts: string }> = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = preRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, name, company, monthly_volume_m3 } = parsed.data;

    // Check duplicate in memory
    if (leads.some((l) => l.email === email)) {
      return NextResponse.json({ message: "Ya estás registrado." }, { status: 200 });
    }

    const lead = { email, name, company, volume: monthly_volume_m3, ts: new Date().toISOString() };
    leads.push(lead);

    // Visible in Vercel / server logs
    console.log("[FINDIT PRE-REGISTRO]", JSON.stringify(lead));

    return NextResponse.json({ message: "Registrado exitosamente." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function GET() {
  // Simple endpoint to view leads (protect in production)
  return NextResponse.json({ total: leads.length, leads });
}
