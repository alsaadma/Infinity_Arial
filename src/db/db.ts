import Dexie from "dexie";
import type { Table } from "dexie";

export interface Quote {
  id?: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  overrideNote?: string;
}

class DronesDB extends Dexie {
  quotes!: Table<Quote, number>;

  constructor() {
    super("DronesCalcDB");
    this.version(1).stores({
      quotes: "++id, name, createdAt, updatedAt",
    });
  }
}

export const db = new DronesDB();
