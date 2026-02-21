import type { QuoteInputs } from "./types";

function inRange01(n: number) {
  return Number.isFinite(n) && n >= 0 && n <= 1;
}

export function validateInputs(x: QuoteInputs): string[] {
  const errs: string[] = [];

  const pos = (v: number, name: string) => {
    if (!Number.isFinite(v) || v < 0) errs.push(`${name} must be >= 0`);
  };

  pos(x.dronesPerShow, "dronesPerShow");
  pos(x.showsPerYear, "showsPerYear");
  pos(x.pricePerShow, "pricePerShow");
  pos(x.opexPerShow, "opexPerShow");
  pos(x.fixedOpexPerYear, "fixedOpexPerYear");

  if (!inRange01(x.cancellationRate)) errs.push("cancellationRate must be 0..1");
  if (!inRange01(x.priceUpliftRate)) errs.push("priceUpliftRate must be 0..1");
  if (!inRange01(x.costInflationRate)) errs.push("costInflationRate must be 0..1");

  if (!inRange01(x.rampY1)) errs.push("rampY1 must be 0..1");
  if (!inRange01(x.rampY2)) errs.push("rampY2 must be 0..1");
  if (!inRange01(x.rampY3Plus)) errs.push("rampY3Plus must be 0..1");

  return errs;
}
