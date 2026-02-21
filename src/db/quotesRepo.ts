import { db } from "./db";
import type { Quote } from "./db";

export async function createQuote(data: Omit<Quote, "id">) {
  return await db.quotes.add(data);
}

export async function listQuotes() {
  return await db.quotes.orderBy("createdAt").reverse().toArray();
}

export async function getQuote(id: number) {
  return await db.quotes.get(id);
}

export async function updateQuote(id: number, updates: Partial<Quote>) {
  return await db.quotes.update(id, updates);
}

export async function deleteQuote(id: number) {
  return await db.quotes.delete(id);
}
