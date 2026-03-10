/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from "react";

export type ApView = "EXEC" | "OPS";
export type ApKeyField = "owner" | "due" | "status" | "dismissed";

export type ActionPlanPanelCtx = {
  apView: ApView;
  setApView: React.Dispatch<React.SetStateAction<ApView>>;

  __apSuggested: any[];
  actionPlanMerged: any[];
  apSorted: any[];
  apExecTop: any[];

  __dcApWrite: (k: string, v: string) => void;
  __dcApKey: (id: string, field: ApKeyField) => string;
  __dcApBump: () => void;

  riskBadgeStyle: (sev: any, status?: any) => React.CSSProperties;
};

