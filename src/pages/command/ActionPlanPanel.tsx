import type { ActionPlanPanelCtx } from "./actionPlanTypes";
import ActionPlanExecView from "./ActionPlanExecView";


type Props = { ctx: ActionPlanPanelCtx };

export default function ActionPlanPanel(props: Props) {
  const {
    apView,
    __apSuggested,
    actionPlanMerged,
    apSorted,
    apExecTop,
    __dcApWrite,
    __dcApKey,
    __dcApBump,
    riskBadgeStyle,
  } = props.ctx;

  return (
    <>
      {apView === "EXEC" ? (
        <>
          <ActionPlanExecView
            apExecTop={apExecTop}
            actionPlanMerged={actionPlanMerged}
            riskBadgeStyle={riskBadgeStyle}
          />

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
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
                  <div style={{ fontWeight: 700 }}>{row.title ?? " "}</div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 16, opacity: 0.7 }}>
                      Status: <b>{row.status ?? "TODO"}</b>
                    </div>

                    <div style={{ fontSize: 16, opacity: 0.7 }}>
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
                  <div style={{ marginTop: 6, fontSize: 16, opacity: 0.78, whiteSpace: "pre-wrap" }}>
                    {row.detail}
                  </div>
                ) : null}

                <div style={{ marginTop: 6, fontSize: 16, opacity: 0.55 }}>
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
        </>
      ) : (
        <div>
          <div style={{ fontSize: 16, opacity: 0.6, marginBottom: 8 }}>
            suggested: <b>{__apSuggested.length}</b> | merged: <b>{actionPlanMerged.length}</b>
          </div>

          {actionPlanMerged.length === 0 ? (
            <div style={{ fontSize: 16, opacity: 0.75 }}>No action items.</div>
          ) : (
            <>
              <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 8 }}>
                Visible: <b>{actionPlanMerged.length}</b> (dismissed hidden locally)
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                      <th style={{ padding: "8px 6px", width: 34, textAlign: "center", whiteSpace: "nowrap" }}>#</th>
                      <th style={{ padding: "8px 6px", minWidth: 240 }}>Action</th>
                      <th style={{ padding: "8px 6px", width: 110, whiteSpace: "nowrap" }}>Severity</th>
                      <th style={{ padding: "8px 6px", width: 180, whiteSpace: "nowrap" }}>Owner</th>
                      <th style={{ padding: "8px 6px", width: 140, whiteSpace: "nowrap" }}>Due</th>
                      <th style={{ padding: "8px 6px", width: 140, whiteSpace: "nowrap" }}>Status</th>
                      <th style={{ padding: "8px 6px", width: 90, textAlign: "center", whiteSpace: "nowrap" }}>Dismiss</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(apSorted ?? []).map((row: any, idx: number) => (
                      <tr key={row.id ?? idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <td style={{ padding: "8px 6px", textAlign: "center", opacity: 0.75 }}>{idx + 1}</td>

                        <td style={{ padding: "8px 6px" }}>
                          <div style={{ fontWeight: 700 }}>{row.title ?? " "}</div>
                          {row.detail ? (
                            <div style={{ marginTop: 3, fontSize: 16, opacity: 0.78, whiteSpace: "pre-wrap" }}>
                              {row.detail}
                            </div>
                          ) : null}
                          <div style={{ marginTop: 3, fontSize: 16, opacity: 0.55 }}>
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
                        </td>

                        <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{row.severity ?? "--"}</td>
                        <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{row.owner ?? "--"}</td>
                        <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{row.due ?? "--"}</td>
                        <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{row.status ?? "TODO"}</td>

                        <td style={{ padding: "8px 6px", textAlign: "center" }}>
                          <button
                            onClick={() => {
                              __dcApWrite(__dcApKey(row.id, "dismissed"), "1");
                              __dcApBump();
                            }}
                            style={{ padding: "4px 8px", borderRadius: 10 }}
                            title="Hide locally"
                          >
                            Dismiss
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}





