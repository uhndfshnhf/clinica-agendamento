import { adminClient, ok, localOnly } from "./env.mjs";
import { createClient } from "@supabase/supabase-js";
localOnly();
const db = adminClient();
async function clean() {
  const photos = await ok(
    db.from("evolution_photos").select("object_path").eq("demo", true),
  );
  if (photos.length)
    await ok(
      db.storage.from("evolution").remove(photos.map((p) => p.object_path)),
    );
  for (const table of [
    "evolution_photos",
    "reminders",
    "treatments",
    "appointments",
    "leads",
    "clients",
    "procedures",
  ])
    await ok(db.from(table).delete().eq("demo", true));
  console.log(
    "Fictional clinical records removed; non-demo records and user accounts preserved.",
  );
}
if (process.argv[2] === "reset") {
  await clean();
  process.exit(0);
}
if (process.argv[2] !== "seed") throw Error("Use seed or reset.");
const existing = await ok(
  db.from("clients").select("id").eq("demo", true).limit(1),
);
if (existing.length) {
  console.log("Demo already present; use demo:reset first to rebuild it.");
  process.exit(0);
}
const users = await ok(db.auth.admin.listUsers());
async function user(email, password, name, role) {
  if (!email || !password)
    throw Error("Run npm run local:env to prepare local demo credentials.");
  let u = users.users.find((u) => u.email === email);
  if (!u)
    u = (
      await ok(
        db.auth.admin.createUser({ email, password, email_confirm: true }),
      )
    ).user;
  await ok(db.from("users").upsert({ id: u.id, name, role, active: true }));
  let p = await ok(
    db.from("professionals").select("*").eq("user_id", u.id).maybeSingle(),
  );
  if (!p)
    p = await ok(
      db
        .from("professionals")
        .insert({
          user_id: u.id,
          name,
          email,
          specialty:
            role === "admin" ? "Gestão & estética facial" : "Estética facial",
          registration: "DEMONSTRAÇÃO",
          photo_url:
            role === "admin"
              ? "/assets/profissional-principal.webp"
              : "/assets/profissional-02.webp",
          demo: true,
        })
        .select()
        .single(),
    );
  return p;
}
const admin = await user(
  process.env.DEMO_ADMIN_EMAIL,
  process.env.DEMO_ADMIN_PASSWORD,
  "Marina Almeida",
  "admin",
);
const professional = await user(
  process.env.DEMO_PROFESSIONAL_EMAIL,
  process.env.DEMO_PROFESSIONAL_PASSWORD,
  "Helena Duarte",
  "professional",
);
let third = await ok(
  db
    .from("professionals")
    .select("*")
    .eq("email", "ricardo@quartier.example")
    .maybeSingle(),
);
if (!third)
  third = await ok(
    db
      .from("professionals")
      .insert({
        name: "Ricardo Moreira",
        email: "ricardo@quartier.example",
        specialty: "Harmonização facial",
        registration: "DEMONSTRAÇÃO",
        photo_url: "/assets/profissional-03.webp",
        demo: true,
      })
      .select()
      .single(),
  );
const names = [
  "Harmonização Facial",
  "Toxina Botulínica",
  "Preenchimento Facial",
  "Bioestimuladores",
  "Skinbooster",
  "Cuidados com a Pele",
];
const procedures = await ok(
  db
    .from("procedures")
    .insert(
      names.map((name, i) => ({
        name,
        description:
          "Procedimento demonstrativo. Indicação após avaliação individual.",
        duration: [60, 40, 60, 50, 40, 60][i],
        price: [1800, 950, 1400, 1600, 700, 280][i],
        category: i === 5 ? "Pele" : "Facial",
        demo: true,
      })),
    )
    .select(),
);
await ok(
  db
    .from("procedure_professionals")
    .insert(
      procedures.flatMap((p) =>
        [admin, professional, third].map((s) => ({
          procedure_id: p.id,
          professional_id: s.id,
        })),
      ),
    ),
);
const clientNames = [
  "Clara Valença",
  "Beatriz Nogueira",
  "Isabela Monteiro",
  "Camila Azevedo",
  "Luísa Figueiredo",
  "Sofia Amaral",
  "Manuela Siqueira",
  "Ana Cecília Prado",
];
const clients = await ok(
  db
    .from("clients")
    .insert(
      clientNames.map((name, i) => ({
        name,
        phone: `1190000000${i}`,
        whatsapp: `551190000000${i}`,
        email: `cliente${i + 1}@example.invalid`,
        birth_date: `199${i}-04-12`,
        notes:
          "Pessoa fictícia para demonstração. Nenhuma informação clínica real.",
        demo: true,
      })),
    )
    .select(),
);
const authed = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
await ok(
  authed.auth.signInWithPassword({
    email: process.env.DEMO_ADMIN_EMAIL,
    password: process.env.DEMO_ADMIN_PASSWORD,
  }),
);
const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
}).format(new Date());
const dateAt = (offset, hour = 10, monthOffset = 0) => {
  const d = new Date(day + "T12:00:00-03:00");
  d.setUTCMonth(d.getUTCMonth() + monthOffset);
  d.setUTCDate(d.getUTCDate() + offset);
  return (
    d.toISOString().slice(0, 10) +
    `T${String(hour).padStart(2, "0")}:00:00-03:00`
  );
};
for (let i = 0; i < 24; i++) {
  const monthOffset = -Math.floor(i / 4);
  const c = clients[i % clients.length],
    p = procedures[i % procedures.length],
    pro = i % 2 ? professional : admin;
  const start = dateAt(-((i % 4) + 1), 9 + (i % 4) * 2, monthOffset);
  const a = await ok(
    db
      .from("appointments")
      .insert({
        client_id: c.id,
        professional_id: pro.id,
        procedure_id: p.id,
        starts_at: start,
        ends_at: start,
        duration: p.duration,
        price: p.price,
        demo: true,
      })
      .select()
      .single(),
  );
  await ok(
    authed.rpc("complete_appointment", {
      appointment: a.id,
      notes: "Atendimento fictício para apresentar o histórico da clínica.",
      expected_result: "Exemplo de planejamento individualizado.",
      recommendations:
        "Recomendações demonstrativas; não são orientação clínica.",
      return_date: null,
    }),
  );
}
for (let i = 0; i < 7; i++) {
  const p = procedures[i % 6],
    start = dateAt(i < 4 ? 0 : i - 3, 9 + (i % 4) * 2);
  await ok(
    db
      .from("appointments")
      .insert({
        client_id: clients[i].id,
        professional_id: (i % 2 ? professional : admin).id,
        procedure_id: p.id,
        starts_at: start,
        ends_at: start,
        duration: p.duration,
        price: p.price,
        status: i % 2 ? "confirmed" : "scheduled",
        demo: true,
      }),
  );
}
await ok(
  db
    .from("reminders")
    .insert(
      clients
        .slice(0, 5)
        .map((c, i) => ({
          client_id: c.id,
          professional_id: (i % 2 ? professional : admin).id,
          title: [
            "Retorno da avaliação",
            "Acompanhar evolução",
            "Próxima sessão de cuidado",
            "Contato após atendimento",
            "Planejar novo retorno",
          ][i],
          kind: i % 2 ? "follow_up" : "return",
          due_at: dateAt(i - 1, 10),
          priority: i === 0 ? "high" : "normal",
          description: "Lembrete fictício para demonstração.",
          demo: true,
        })),
    ),
);
await ok(
  db.from("leads").insert([
    {
      name: "Laura Campos (demo)",
      whatsapp: "5511900000091",
      procedure_name: "Skinbooster",
      status: "new",
      demo: true,
    },
    {
      name: "Elisa Martins (demo)",
      whatsapp: "5511900000092",
      procedure_name: "Avaliação personalizada",
      status: "contacted",
      demo: true,
    },
  ]),
);
console.log(
  "Demo seeded: 8 fictional clients, 3 professionals, 6 procedures, 31 appointments, 24 histories, 5 reminders and 2 contacts. No real patient data or clinical result photos.",
);
