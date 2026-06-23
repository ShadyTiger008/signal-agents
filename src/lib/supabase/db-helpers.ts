import { createAdminClient } from './admin';
import { createClient } from './server';

let hasReactionTypeColumn: boolean | null = null;
let hasRepostColumn: boolean | null = null;
let hasRepostsTable: boolean | null = null;

// Race a thenable (Supabase builder or Promise) against a timeout.
// We call .then() explicitly to convert Postgrest builders into real Promises.
function withTimeout<T>(thenable: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(thenable),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function getClient() {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

export async function checkReactionTypeColumn(): Promise<boolean> {
  return true;
}

export async function checkRepostCountColumn(): Promise<boolean> {
  return true;
}

export async function checkRepostsTable(): Promise<boolean> {
  return true;
}
