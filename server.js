import WebService from "jswebservice/WebService.js";
import StaticService from "jswebservice/services/StaticService.js";

const enableCors = process.argv.indexOf("-cors") >= 1;
const port = process.argv.indexOf("-port") >= 1 ? process.argv[process.argv.indexOf("-port") + 1] : "5700";

const service = new WebService(port, {enableCors});
service.registerServiceModule(StaticService, "", {serveFolder: "./webtest"});
service.registerServiceModule(StaticService, "/_libs/archipelagojs", {serveFolder: "./src"});

service.printServerInfoPanel();
