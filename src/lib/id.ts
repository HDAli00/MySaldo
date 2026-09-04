import { randomUUID } from "crypto";

/** Generates a new primary key value for inserts (tables have no DB-side id default). */
export function newId(): string {
  return randomUUID();
}
