import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_ANON_KEY;
const configured = Boolean(url && key && process.env.DEMO_ADMIN_PASSWORD);
const make = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const service = configured
  ? createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;
async function login(role) {
  const c = make();
  const { error } = await c.auth.signInWithPassword({
    email: process.env[`DEMO_${role}_EMAIL`],
    password: process.env[`DEMO_${role}_PASSWORD`],
  });
  assert.ifError(error);
  return c;
}
test(
  "Anonymous cannot read clinical tables or sign up",
  { skip: !configured },
  async () => {
    const anon = make();
    for (const table of [
      "users",
      "clients",
      "professionals",
      "appointments",
      "treatments",
      "evolution_photos",
      "reminders",
      "leads",
      "settings",
    ]) {
      const { data, error } = await anon.from(table).select("*");
      assert.ok(error || data.length === 0, table);
    }
    const { error } = await anon.auth.signUp({
      email: "blocked@example.invalid",
      password: "blocked-password-123",
    });
    assert.ok(error);
    const { data, error: settingsError } = await anon.rpc("public_settings");
    assert.ifError(settingsError);
    assert.ok(data.name);
    assert.ok(!("users" in data));
  },
);
test(
  "Professionals cannot escalate role or access unassigned patients",
  { skip: !configured },
  async () => {
    const p = await login("PROFESSIONAL");
    const {
      data: { user },
    } = await p.auth.getUser();
    await p.from("users").update({ role: "admin" }).eq("id", user.id);
    const { data: profile } = await p
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    assert.equal(profile.role, "professional");
    const { data: client, error } = await service
      .from("clients")
      .insert({
        name: "RLS isolated test",
        whatsapp: "11900000555",
        demo: true,
      })
      .select()
      .single();
    assert.ifError(error);
    try {
      const { data } = await p.from("clients").select("*").eq("id", client.id);
      assert.equal(data.length, 0);
      const update = await p
        .from("clients")
        .update({ name: "changed" })
        .eq("id", client.id)
        .select();
      assert.equal(update.data?.length || 0, 0);
      const { error: assign } = await p.rpc("set_client_professionals", {
        client: client.id,
        professionals: [],
      });
      assert.ok(assign);
      const { error: procedure } = await p.rpc("save_procedure", {
        procedure: null,
        details: { name: "Forbidden" },
        professionals: [],
      });
      assert.ok(procedure);
      const { data: settings } = await p
        .from("settings")
        .update({ name: "Unauthorized" })
        .eq("id", true)
        .select();
      assert.equal(settings.length, 0);
    } finally {
      await service.from("clients").delete().eq("id", client.id);
    }
  },
);
test(
  "Public lead validation, rate limit and conversion idempotency",
  { skip: !configured },
  async () => {
    const anon = make(),
      admin = await login("ADMIN");
    const phone = "11900000777";
    await service.from("leads").delete().eq("whatsapp", phone);
    const payload = {
      full_name: "Contato fictício RLS",
      phone,
      interest: "Skinbooster",
      consent: true,
      website: "",
    };
    assert.ok(
      (await anon.rpc("submit_lead", { ...payload, consent: false })).error,
    );
    for (let i = 0; i < 3; i++)
      assert.ifError((await anon.rpc("submit_lead", payload)).error);
    assert.ok((await anon.rpc("submit_lead", payload)).error);
    const { data: leads } = await service
      .from("leads")
      .select("id")
      .eq("whatsapp", phone);
    let client;
    try {
      client = (await admin.rpc("convert_lead", { lead: leads[0].id })).data;
      const second = await admin.rpc("convert_lead", { lead: leads[0].id });
      assert.ifError(second.error);
      assert.equal(second.data, client);
    } finally {
      await service.from("leads").delete().eq("whatsapp", phone);
      if (client) await service.from("clients").delete().eq("id", client);
    }
  },
);
test(
  "Evolution storage is private and prevents cross-client upload",
  { skip: !configured },
  async () => {
    const anon = make(),
      p = await login("PROFESSIONAL");
    const { data: bucket, error } =
      await service.storage.getBucket("evolution");
    assert.ifError(error);
    assert.equal(bucket.public, false);
    const fake =
      "00000000-0000-0000-0000-000000000000/" + crypto.randomUUID() + ".webp";
    assert.ok(
      (
        await p.storage
          .from("evolution")
          .upload(fake, new Uint8Array([1, 2, 3]), {
            contentType: "image/webp",
          })
      ).error,
    );
    const { data: photos } = await service
      .from("evolution_photos")
      .select("object_path")
      .limit(1);
    if (photos.length) {
      const { error } = await anon.storage
        .from("evolution")
        .download(photos[0].object_path);
      assert.ok(error);
      const r = await fetch(
        url + "/storage/v1/object/public/evolution/" + photos[0].object_path,
      );
      assert.notEqual(r.status, 200);
    }
  },
);
test(
  "Invite endpoint validates caller and role",
  { skip: !configured },
  async () => {
    const anonymous = await fetch(url + "/functions/v1/invite-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(anonymous.status, 401);
    const p = await login("PROFESSIONAL");
    const {
      data: { session },
    } = await p.auth.getSession();
    const denied = await fetch(url + "/functions/v1/invite-team", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(denied.status, 403);
  },
);
test(
  "Professional can create their own client and cannot read another clinician history",
  { skip: !configured },
  async () => {
    const p = await login("PROFESSIONAL");
    const { data: row, error } = await p.rpc("create_client", {
      details: { name: "Professional creation test", whatsapp: "11900000666" },
      professionals: [],
    });
    assert.ifError(error);
    try {
      assert.equal(
        (await p.from("clients").select("id").eq("id", row.id)).data.length,
        1,
      );
    } finally {
      await service.from("clients").delete().eq("id", row.id);
    }
    const { data: all } = await service
      .from("treatments")
      .select("id,professional_id")
      .limit(100);
    const { data: mine } = await p.rpc("my_professional");
    const other = all.find((t) => t.professional_id !== mine);
    assert.ok(other);
    assert.equal(
      (await p.from("treatments").select("*").eq("id", other.id)).data.length,
      0,
    );
  },
);
test(
  "Uploaded photos require authentication and cannot be deleted by a professional",
  { skip: !configured },
  async () => {
    const admin = await login("ADMIN"),
      p = await login("PROFESSIONAL"),
      anon = make();
    const { data: client, error } = await admin.rpc("create_client", {
      details: { name: "Storage authorization test", whatsapp: "11900000444" },
      professionals: [],
    });
    assert.ifError(error);
    const { data: procedure } = await service
      .from("procedures")
      .select("id")
      .limit(1)
      .single();
    const photoId = crypto.randomUUID(),
      path = client.id + "/" + photoId + ".webp";
    try {
      const { readFile } = await import("node:fs/promises");
      assert.ifError(
        (
          await admin.storage
            .from("evolution")
            .upload(path, await readFile("public/assets/sobre-detalhe.webp"), {
              contentType: "image/webp",
            })
        ).error,
      );
      assert.ifError(
        (
          await admin
            .from("evolution_photos")
            .insert({
              id: photoId,
              client_id: client.id,
              procedure_id: procedure.id,
              category: "progress",
              object_path: path,
              notes: "Synthetic test fixture, not a clinical result.",
            })
        ).error,
      );
      assert.ifError(
        (await admin.storage.from("evolution").download(path)).error,
      );
      assert.ok((await anon.storage.from("evolution").download(path)).error);
      assert.ok((await p.storage.from("evolution").download(path)).error);
      const r = await fetch(
        url + "/storage/v1/object/public/evolution/" + path,
      );
      assert.notEqual(r.status, 200);
      const { data: pid } = await p.rpc("my_professional");
      assert.ifError(
        (
          await admin.rpc("set_client_professionals", {
            client: client.id,
            professionals: [pid],
          })
        ).error,
      );
      assert.ifError((await p.storage.from("evolution").download(path)).error);
      await p.storage.from("evolution").remove([path]);
      assert.ifError(
        (await admin.storage.from("evolution").download(path)).error,
      );
    } finally {
      await admin.storage.from("evolution").remove([path]);
      await service.from("evolution_photos").delete().eq("id", photoId);
      await service.from("clients").delete().eq("id", client.id);
    }
  },
);
