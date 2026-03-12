/* eslint-disable @typescript-eslint/no-explicit-any */
export type SnapshotBarProps = {
  // Keep permissive during architecture phase; QuoteCalc can pass anything without TS break.
  [key: string]: any;
};

export function SnapshotBar(props: SnapshotBarProps) {
  
  void props;// Reliability-first: do not crash UI if snapshot shape changes.
  return null;
}

export default SnapshotBar;




