import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    cacheDirectory: path.join(__dirname, "models"),
    loggerLevel: "info",
    loggerConsoleOutput: true
};
