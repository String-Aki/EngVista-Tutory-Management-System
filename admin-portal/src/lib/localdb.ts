import Dexie, { Table } from "dexie";

export interface OfflineScan {
  id?: number;
  student_id: string;
  scanned_at: string;
  status: string;
}

export class ICMSLocalDB extends Dexie {
  offlineScans!: Table<OfflineScan>;
  constructor() {
    super("icms_local_db");
    this.version(1).stores({
      offlineScans: "++id, student_id, scanned_at",
    });
  }
}

export const localDB = new ICMSLocalDB();
