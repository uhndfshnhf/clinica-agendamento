import test from "node:test";
import assert from "node:assert/strict";
import {
  clientSchema,
  appointmentSchema,
  procedureSchema,
} from "../src/admin/validation.js";
import { toISO, localInput } from "../src/admin/ui.js";
test("Brazilian phone normalization and optional CPF", () => {
  const c = clientSchema.parse({
    name: "Pessoa Fictícia",
    phone: "",
    whatsapp: "+55 (11) 90000-0000",
    email: "",
    birth_date: null,
    cpf: "",
    notes: "",
    active: true,
  });
  assert.equal(c.whatsapp, "5511900000000");
  assert.equal(c.cpf, null);
  assert.throws(() => clientSchema.parse({ ...c, whatsapp: "123" }));
});
test("Appointments cannot bypass workflow with a completed status", () => {
  assert.throws(() => appointmentSchema.parse({ status: "completed" }));
  assert.throws(() =>
    procedureSchema.parse({
      name: "Tratamento",
      description: "",
      duration: 0,
      price: -1,
      category: "Pele",
      active: true,
    }),
  );
});
test("Clinic timezone is independent of browser timezone", () => {
  assert.equal(toISO("2026-10-05T09:00"), "2026-10-05T12:00:00.000Z");
  assert.equal(localInput("2026-10-05T12:00:00Z"), "2026-10-05T09:00");
});
