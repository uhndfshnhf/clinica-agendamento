import { adminClient, ok } from "./env.mjs";
const db = adminClient();
const email = process.env.ADMIN_EMAIL,
  password = process.env.ADMIN_PASSWORD,
  name = process.env.ADMIN_NAME || "Administração Quartier";
if (!email || !password || password.length < 12)
  throw Error(
    "Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD (12+ characters) securely in your shell.",
  );
const { user } = await ok(
  db.auth.admin.createUser({ email, password, email_confirm: true }),
);
try {
  await ok(db.from("users").insert({ id: user.id, name, role: "admin" }));
  await ok(
    db
      .from("professionals")
      .insert({ user_id: user.id, name, email, specialty: "Administração" }),
  );
} catch (e) {
  await db.auth.admin.deleteUser(user.id);
  throw e;
}
console.log("Administrator created. No password printed.");
