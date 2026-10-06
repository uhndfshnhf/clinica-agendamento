import { db, result } from "../supabase.js";
export { db, result };
export const appointmentSelect =
  "*,clients(id,name),procedures(id,name),professionals(id,name)";
// Capture one project for the complete operation, including work after awaits.
export function dataFor(client) {
 const db=client;
  async function list(
    table,
    {
      page = 0,
      search = "",
      active,
      order = "created_at",
      ascending = false,
      filters = {},
    } = {},
  ) {
    let q = db
      .from(table)
      .select("*", { count: "exact" })
      .order(order, { ascending })
      .range(page * 20, page * 20 + 19);
    if (search) q = q.ilike("name", `%${search.replace(/[%_\\]/g, "")}%`);
    if (active !== undefined && active !== "")
      q = q.eq("active", active === "true" || active === true);
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { data, count, error } = await q;
    if (error) throw error;
    return { data, count };
  }
  async function options() {
    const [clients, procedures, professionals, assignments] = await Promise.all([
      result(
        db
          .from("clients")
          .select("id,name")
          .eq("active", true)
          .order("name")
          .limit(1000),
      ),
      result(db.from("procedures").select("*").eq("active", true).order("name")),
      result(
        db.from("professionals").select("*").eq("active", true).order("name"),
      ),
      result(db.from("procedure_professionals").select("*")),
    ]);
    return { clients, procedures, professionals, assignments };
  }
  const save = (table, values, id) =>
    result(
      id
        ? db.from(table).update(values).eq("id", id).select().single()
        : db.from(table).insert(values).select().single(),
    );
  async function appointments(from, to) {
    return result(
      db
        .from("appointments")
        .select(appointmentSelect)
        .gte("starts_at", from)
        .lt("starts_at", to)
        .order("starts_at"),
    );
  }

 return {db,list,options,save,appointments};
}
