import fs from "node:fs";
import { computeQuote, FleetBaseline, ShowQuoteInput } from "./quoteEngine.ts";

const fleet = JSON.parse(fs.readFileSync("core/sample.fleet.json", "utf8")) as FleetBaseline;
const input = JSON.parse(fs.readFileSync("core/sample.quote.json", "utf8")) as ShowQuoteInput;

const result = computeQuote(fleet, input);
console.log("INPUT_JSON:", JSON.stringify(input, null, 2));
console.log("RESULT:", JSON.stringify(result, null, 2));
