import { NextRequest, NextResponse } from "next/server";
import { calculatorSchema } from "@/lib/validation/schemas";
import {
  calculateBillableVolume,
  calculateShipmentPrice,
} from "@/lib/pricing/engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = calculatorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { weight_kg, length_cm, width_cm, height_cm, pool_volume_m3 } = parsed.data;

    const volume = calculateBillableVolume(weight_kg, length_cm, width_cm, height_cm);
    const pricing = calculateShipmentPrice(volume.billableM3, pool_volume_m3);

    return NextResponse.json({ volume, pricing });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
