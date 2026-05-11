import { NextRequest, NextResponse } from "next/server";
import { preRegisterSchema } from "@/lib/validation/schemas";
import { createServiceClient } from "@/lib/supabase/server";

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

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("pre_registrations")
      .insert({
        email: parsed.data.email,
        name: parsed.data.name ?? null,
        company: parsed.data.company ?? null,
        monthly_volume_m3: parsed.data.monthly_volume_m3 ?? null,
        current_rate: parsed.data.current_rate ?? null,
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ message: "Ya estás registrado." }, { status: 200 });
      }
      throw error;
    }

    return NextResponse.json({ message: "Registrado exitosamente." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
