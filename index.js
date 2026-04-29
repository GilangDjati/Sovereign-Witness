import { modelRegistryList } from "@qvac/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("🚀 Initializing Sovereign Witness...");
    
    // Ensure the models folder exists
    const modelsDir = path.join(__dirname, "models");
    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
        console.log(`📁 Created models directory at ${modelsDir}`);
    } else {
        console.log(`✅ Models directory verified at ${modelsDir}`);
    }

    try {
        console.log("🔧 Loading QVAC SDK config and initializing...");
        
        // Basic sanity check to ensure functions are correctly imported
        if (typeof modelRegistryList !== 'function') {
            throw new Error("SDK exports are not correctly loaded.");
        }
        
        console.log("✅ QVAC SDK successfully loaded and ready to use!");
        console.log("✅ Setup is complete. The system points to the './models' folder as configured in qvac.config.js.");
        
        // Cleanly exit to prevent any background workers from keeping the process alive
        process.exit(0);
    } catch (error) {
        console.error("❌ Error initializing QVAC SDK:", error);
        process.exit(1);
    }
}

main();
