import { z } from "zod";
const text = (max) => z.string().trim().max(max, "Texto muito longo.");
const optionalEmail = z.union([
  z.email("Informe um e-mail válido."),
  z.literal(""),
]);
export const digits = (v) => String(v || "").replace(/\D/g, "");
export const clientSchema = z.object({
  name: text(160).min(2, "Informe o nome completo."),
  phone: text(25),
  whatsapp: z
    .string()
    .transform(digits)
    .pipe(
      z
        .string()
        .regex(/^\d{10,15}$/, "Informe WhatsApp com DDD (10 a 15 dígitos)."),
    ),
  email: optionalEmail,
  birth_date: z.string().nullable(),
  cpf: z
    .string()
    .transform((v) => digits(v) || null)
    .refine((v) => !v || v.length === 11, "CPF deve ter 11 dígitos."),
  notes: text(10000),
  active: z.boolean(),
});
export const procedureSchema = z.object({
  name: text(160).min(2, "Informe o nome."),
  description: text(5000),
  duration: z.coerce.number().int().min(5).max(480),
  price: z.coerce.number().min(0).max(99999999),
  category: text(100).min(2),
  active: z.boolean(),
});
export const appointmentSchema = z.object({
  client_id: z.uuid(),
  professional_id: z.uuid(),
  procedure_id: z.uuid(),
  starts_at: z.iso.datetime({ offset: true }),
  duration: z.coerce.number().int().min(5).max(480),
  price: z.coerce.number().min(0),
  notes: text(10000),
  status: z.enum([
    "scheduled",
    "confirmed",
    "in_progress",
    "cancelled",
    "no_show",
  ]),
});
