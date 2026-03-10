import type { CSSProperties } from "react";

export type ActionPlanExecViewProps = {
  apExecTop: any[];
  actionPlanMerged: any[];
  riskBadgeStyle: (sev: any, status?: any) => CSSProperties;
};

export default function ActionPlanExecView(props: ActionPlanExecViewProps) {
  const { apExecTop, actionPlanMerged, riskBadgeStyle } = props;

  return (
    <>
      <div>
        <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 8 }}>
          Top 3 by priority (status ? severity ? due). Total visible: <b>{actionPlanMerged.length}</b>
        </div>

        {apExecTop.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.75 }}>No action items.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {apExecTop.map((row: any, idx: number) => (
              <div
                key={row.id ?? idx}
                style={{
                  padding: 12,
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>
                    <div style={{ fontWeight: 700 }}>{row.title ?? " "}</div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      Status: <b>{row.status ?? "TODO"}</b>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      Sev:{" "}
                      {row.severity ? (
                        <span style={riskBadgeStyle(row.severity, row.status)}>{row.severity}</span>
                      ) : (
                        <span style={{ opacity: 0.65 }}>--</span>
                      )}
                    </div>
                  </div>
                </div>

                {row.detail ? (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.78, whiteSpace: "pre-wrap" }}>
                    {row.detail}
                  </div>
                ) : null}

                <div style={{ marginTop: 6, fontSize: 11, opacity: 0.55 }}>
                  id: {row.id}
                  {row.due ? (
                    <>
                      {" "}
                      | due: <b>{row.due}</b>
                    </>
                  ) : null}
                  {row.owner ? (
                    <>
                      {" "}
                      | owner: <b>{row.owner}</b>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
