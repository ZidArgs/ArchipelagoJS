import WebService from "webservice/WebService.js";
import StaticService from "webservice/services/StaticService.js";

const cors = process.argv.indexOf("-cors") >= 1;
const port = process.argv.indexOf("-port") >= 1 ? process.argv[process.argv.indexOf("-port") + 1] : "5700";

const service = new WebService(port, cors);
service.registerService(StaticService, "", {serveFolder: "./webtest"});
service.registerService(StaticService, "/archipelago", {serveFolder: "./src"});

const po = port.toString().padEnd(5);

console.log(``);
console.log(`╔════════════════════════════════════════╗`);
console.log(`║ ┌╦┐ ╭────────────────────────────╮ ┌╦┐ ║`);
console.log(`║  │  │                            │  │  ║`);
console.log(`╠─═╬═─╡   http://localhost:${po}   ╞─═╬═─╣`);
console.log(`║  │  │                            │  │  ║`);
console.log(`║ └╩┘ ╰────────────────────────────╯ └╩┘ ║`);
console.log(`╚════════════════════════════════════════╝`);
console.log(``);
