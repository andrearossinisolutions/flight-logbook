import { resolveQueryToIcaos } from "../lib/weather";

async function test() {
  const res = await resolveQueryToIcaos("DKSADMASP", "LIML");
  console.log("resolveQueryToIcaos('DKSADMASP') ->", res);
}

test();
