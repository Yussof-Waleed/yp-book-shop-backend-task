import { db } from "../common/db.js";
import { users } from "../models/index.js";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

export async function getUserById(id: number) {
  return db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
}

export async function getUserWithPasswordById(id: number) {
  return db.select().from(users).where(eq(users.id, id)).limit(1);
}

export async function updateProfile(
  id: number,
  data: { name?: string; username?: string; email?: string },
) {
  const updateData: { name?: string; username?: string; email?: string } = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.username !== undefined) updateData.username = data.username;
  if (data.email !== undefined) updateData.email = data.email;

  return await db.update(users).set(updateData).where(eq(users.id, id));
}

export async function changePassword(
  id: number,
  oldPassword: string,
  newPassword: string,
) {
  const user = await getUserWithPasswordById(id);
  if (!user[0]) throw new Error("User not found");
  const valid = await bcrypt.compare(oldPassword, user[0].password_hash);
  if (!valid) throw new Error("Invalid old password");
  const password_hash = await bcrypt.hash(newPassword, 10);
  return db.update(users).set({ password_hash }).where(eq(users.id, id));
}

export async function resetPassword(id: number, newPassword: string) {
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user.length) throw new Error("User not found");

  const password_hash = await bcrypt.hash(newPassword, 10);
  return db.update(users).set({ password_hash }).where(eq(users.id, id));
}
