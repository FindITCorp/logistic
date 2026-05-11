import { z } from "zod";

export const preRegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(2, "Nombre muy corto").optional(),
  company: z.string().optional(),
  monthly_volume_m3: z
    .number()
    .min(0.1, "Volumen mínimo 0.1 m³")
    .max(1000, "Volumen máximo 1000 m³")
    .optional(),
  current_rate: z
    .number()
    .min(50, "Tarifa mínima $50")
    .max(2000, "Tarifa máxima $2000")
    .optional(),
});

export type PreRegisterInput = z.infer<typeof preRegisterSchema>;

export const calculatorSchema = z.object({
  weight_kg: z
    .number()
    .min(0.1, "Peso mínimo 0.1 kg")
    .max(50000, "Peso máximo 50,000 kg"),
  length_cm: z
    .number()
    .min(1, "Longitud mínima 1 cm")
    .max(1000, "Longitud máxima 1000 cm"),
  width_cm: z
    .number()
    .min(1, "Ancho mínimo 1 cm")
    .max(1000, "Ancho máximo 1000 cm"),
  height_cm: z
    .number()
    .min(1, "Alto mínimo 1 cm")
    .max(1000, "Alto máximo 1000 cm"),
  pool_volume_m3: z
    .number()
    .min(0, "Volumen del pool inválido")
    .max(100, "Volumen máximo del pool 100 m³"),
});

export type CalculatorInput = z.infer<typeof calculatorSchema>;

export const shipmentSchema = z.object({
  pool_id: z.string().uuid("Pool inválido"),
  description: z.string().min(3, "Descripción muy corta").max(255),
  weight_kg: z.number().min(0.1).max(50000),
  volume_m3: z.number().min(0.001).max(100),
});

export type ShipmentInput = z.infer<typeof shipmentSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  full_name: z.string().min(2, "Nombre muy corto"),
  company: z.string().optional(),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Las contraseñas no coinciden",
  path: ["confirm_password"],
});

export type RegisterInput = z.infer<typeof registerSchema>;
