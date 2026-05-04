import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Import unified @qvac/sdk for real execution
import {
    loadModel,
    ocr,
    completion,
    unloadModel,
    close,
    OCR_LATIN_RECOGNIZER_1,
    LLAMA_3_2_1B_INST_Q4_0
} from '@qvac/sdk';

// 2. Import local dependencies
import WDK from './wdk-main/index.js';
import WalletManagerSolana from '@tetherto/wdk-wallet-solana';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CLI Progress bar helper for downloading models
 */
function logProgress(modelName, progress) {
    if (progress && progress.total && progress.loaded) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        const barLength = 20;
        const filled = Math.round((barLength * percent) / 100);
        const empty = barLength - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        process.stdout.write(`\r[Download] ${modelName}: [${bar}] ${percent}%`);
        if (percent === 100) {
            process.stdout.write('\n');
        }
    }
}

/**
 * MATA (The Eyes) - Real OCR Execution
 */
async function VisionEngine(imagePath) {
    console.log(`\n[VisionEngine] 👀 Initializing vision system...`);

    if (!fs.existsSync(imagePath)) {
        throw new Error(`[VisionEngine] ❌ Cannot find image at ${imagePath}. Please provide a valid receipt.jpg for testing!`);
    }

    try {
        console.log(`[VisionEngine] 🧠 Loading @qvac/sdk OCR model...`);
        const ocrModelId = await loadModel({
            modelSrc: OCR_LATIN_RECOGNIZER_1,
            modelType: "ocr",
            modelConfig: {
                useGPU: false
            },
            onProgress: (p) => logProgress("OCR Model", p)
        });

        console.log(`[VisionEngine] ⚙️ Processing image through neural network...`);
        const { blocks } = ocr({ modelId: ocrModelId, image: imagePath });

        const extractedBlocks = await blocks;

        // Combine text from all blocks
        const fullText = extractedBlocks.map(b => b.text).join(" ");
        console.log(`[VisionEngine] ✅ Extraction complete!\n`);
        console.log(`=========================================`);
        console.log(`   👁️  RAW CAPTURED TEXT PREVIEW         `);
        console.log(`=========================================`);
        console.log(`"${fullText}"`);
        console.log(`=========================================\n`);

        // Unload model to save memory
        await unloadModel({ modelId: ocrModelId });

        return fullText;
    } catch (error) {
        console.error(`[VisionEngine] ❌ OCR failed:`, error);
        throw error;
    }
}

/**
 * OTAK (The Brain) - Real LLM Execution
 */
async function AnalyticalEngine(ocrText) {
    console.log(`\n[AnalyticalEngine] 🧠 Activating analytical engine...`);

    let llmModelId;
    try {
        console.log(`[AnalyticalEngine] 🤖 Initializing @qvac/sdk lightweight LLM (1B)...`);
        console.log(`[AnalyticalEngine] 🔧 Configuring Model Constraints -> Execution: Pure CPU | Context: 1024 tokens`);
        
        let hasLoggedBoot = false;
        llmModelId = await loadModel({
            modelSrc: LLAMA_3_2_1B_INST_Q4_0,
            modelType: "llm",
            modelConfig: {
                device: "cpu",
                gpu_layers: 0,
                ctx_size: 1024
            },
            onProgress: (p) => {
                logProgress("LLM (1B)", p);
                if (p.loaded === p.total && p.total > 0 && !hasLoggedBoot) {
                    hasLoggedBoot = true;
                    console.log(`\n[AnalyticalEngine] ⏳ Model pulled. Booting into RAM (initFromConfig)... this may take a moment.`);
                }
            }
        });
        
        console.log(`[AnalyticalEngine] ✅ Model successfully booted into memory!`);

        const prompt = `You are a strict data extractor and OCR validator. Extract the FINAL TOTAL USDT amount, transaction purpose, and recipient address from the OCR text.
CRITICAL INSTRUCTION 1: If there are multiple numbers, you MUST prioritize the FINAL TOTAL amount. Ignore subtotals.
CRITICAL INSTRUCTION 2: We ONLY support USDT. Prioritize the final USDT total and ignore other currencies like SOL or USDC.
CRITICAL INSTRUCTION 3: If you see a long Solana-style wallet address (random letters and numbers), you MUST extract it as the recipient_address. If the OCR accidentally added a space in the middle, quietly merge it into one continuous string. Also, correct common OCR hallucinations using Base58 rules (e.g. change 'I', 'l', 'O', '0' to valid Base58 chars like '1', 'o', or '4' for 'A'). Do NOT treat it as a typo or gibberish.
CRITICAL INSTRUCTION 4: For the "purpose" field, extract the FINAL actual reason or item being paid for at the very end of the text (e.g., 'MCD', 'Server Hosting'). Ignore intermediate words like 'allocation', 'payment', 'Pay', or 'Send'.
CRITICAL INSTRUCTION 5: IF THE TEXT IS NOT 100% CLEAR, YOU MUST FAIL. DO NOT GUESS. If the OCR text is messy or contains weird misspellings (e.g. 'USUF', 'Loffee', 'UST'), return EXACTLY: {"error": true}
If the text is perfectly clear, return ONLY a valid JSON object with keys "amount_usdt", "purpose", and "recipient_address". Do not include any markdown formatting.

Text: "${ocrText}"`;

        console.log(`[AnalyticalEngine] ⚙️ Prompting LLM for structured extraction...`);

        const response = completion({
            modelId: llmModelId,
            history: [{ role: "user", content: prompt }],
            generationParams: {
                predict: 200,
                temp: 0.1
            }
        });
        
        const rawOutput = (await response.text).trim();
        console.log(`[AnalyticalEngine] 📝 Raw LLM output: ${rawOutput}`);

        let parsedData;
        try {
            // Clean markdown backticks if the LLM outputted them
            let cleanedJSON = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // Auto-close JSON if it was cut off
            if (!cleanedJSON.endsWith('}')) {
                cleanedJSON += '\n}';
            }
            
            parsedData = JSON.parse(cleanedJSON);
            
            if (parsedData.error || !parsedData.amount_usdt || !parsedData.recipient_address) {
                throw new Error("Messy OCR detected by LLM");
            }
            
            // Hardcoded Javascript Safety Guard
            const amount = Number(parsedData.amount_usdt);
            if (isNaN(amount) || amount <= 0) {
                console.error(`\n[AnalyticalEngine Safety Guard] 🚫 Triggered! Invalid or negative amount parsed: ${parsedData.amount_usdt}`);
                throw new Error("Safety Guard Exception");
            }
            
            // Solana Address Safety Guard (Base58 & Length 32-44)
            if (parsedData.recipient_address) {
                // Auto-clean any accidental spaces added by OCR
                parsedData.recipient_address = parsedData.recipient_address.replace(/\s+/g, '');
                
                // Cross-Chain Detective Filter
                const isEthereum = parsedData.recipient_address.startsWith('0x');
                const lowerAddress = parsedData.recipient_address.toLowerCase();
                const isBitcoin = lowerAddress.startsWith('bc1') || lowerAddress.startsWith('bci') || lowerAddress.startsWith('bcl');
                const isTron = parsedData.recipient_address.startsWith('T') && parsedData.recipient_address.length === 34;
                
                let invalidNetworkName = null;
                if (isEthereum) invalidNetworkName = "Ethereum (0x)";
                else if (isBitcoin) invalidNetworkName = "Bitcoin (bc1)";
                else if (isTron) invalidNetworkName = "Tron (T)";

                if (invalidNetworkName) {
                    console.error(`\n[AnalyticalEngine Safety Guard] 🚫 Triggered! ${invalidNetworkName} attempt blocked: ${parsedData.recipient_address}`);
                    throw new Error(`Invalid Network Exception: ${invalidNetworkName}`);
                }
                
                if (parsedData.recipient_address.length < 40) {
                    console.error(`\n[AnalyticalEngine Safety Guard] 🚫 Triggered! Cross-Chain attempt blocked: ${parsedData.recipient_address}`);
                    throw new Error("Invalid Network Exception: Short/Unknown");
                }
                
                const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
                if (!solanaAddressRegex.test(parsedData.recipient_address)) {
                    console.log(`\n[AnalyticalEngine] ⚠️ Address failed Base58 check. Attempting heuristic correction...`);
                    parsedData.recipient_address = parsedData.recipient_address
                        .replace(/I/g, '1')
                        .replace(/l/g, '1')
                        .replace(/O/g, 'o')
                        .replace(/0/g, 'o')
                        .replace(/Aff/g, '4ff');
                        
                    if (!solanaAddressRegex.test(parsedData.recipient_address)) {
                        console.error(`\n[AnalyticalEngine Safety Guard] 🚫 Triggered! Invalid Solana address format detected: ${parsedData.recipient_address}`);
                        throw new Error("Safety Guard Exception");
                    } else {
                        console.log(`[AnalyticalEngine] ✅ Heuristic correction successful! Cleaned Address: ${parsedData.recipient_address}`);
                    }
                }
            }
            
            const forbiddenWords = ["usuf", "loffee", "ust", "heading", "styles", "word menus"];
            for (const word of forbiddenWords) {
                const regex = new RegExp("\\b" + word + "\\b", "i");
                if (regex.test(ocrText)) {
                    console.error(`\n[AnalyticalEngine Safety Guard] 🚫 Triggered! Dangerous OCR typo '${word}' detected as an isolated word.`);
                    throw new Error("Safety Guard Exception");
                }
            }
            
            parsedData.amount_usdt = amount;
        } catch (parseError) {
            console.error(`\n[AnalyticalEngine] ❌ Data Extraction Failed: The AI or Safety Guard detected messy or unreadable OCR text.`);
            console.log(`\n=========================================`);
            console.log(`   👁️  VISION HEALTH CHECK               `);
            console.log(`=========================================`);
            
            if (parseError.message && parseError.message.startsWith("Invalid Network Exception:")) {
                const networkName = parseError.message.split(": ")[1];
                if (networkName === "Short/Unknown") {
                    console.log(`❌ Invalid Network: This looks like a non-Solana address. Only Solana addresses are supported.`);
                } else {
                    console.log(`❌ Invalid Network: This is a ${networkName} address. Sovereign Witness only supports the Solana Ecosystem.`);
                }
            } else if (parseError.message === "Ethereum Network Exception") {
                console.log(`❌ Invalid Network: Ethereum (0x) addresses are not supported. Please use a valid Solana address.`);
            } else {
                console.log(`The AI could not confidently read the text. If you are using handwriting, please check the following:`);
                console.log(`- 🌑 Shadows: Check if your phone's shadow is covering the text.`);
                console.log(`- 📝 Lined Paper: The lines on the paper might be confusing the AI.`);
                console.log(`- 🔠 Character Spacing: Ensure letters aren't touching each other.`);
                console.log(`- ✍️ Handwriting Style: Use clearer or bigger letters.`);
                console.log(`- 🖥️ UI Noise: Detected UI elements or software menus in the image which are confusing the AI.`);
            }
            
            console.log(`\n💡 PRO TIP: For 100% accuracy, use a computer print-out with clear fonts (like Arial or Helvetica), a minimum size of 12pt, and standard spacing on plain white HVS paper.`);
            console.log(`=========================================\n`);
            throw new Error("Vision Extraction Error");
        }

        console.log(`[AnalyticalEngine] ✅ Analysis complete! Extracted Data:`, parsedData);

        await unloadModel({ modelId: llmModelId });
        return parsedData;

    } catch (error) {
        if (llmModelId) {
            await unloadModel({ modelId: llmModelId }).catch(console.error);
        }
        throw error;
    }
}

/**
 * TANGAN (The Hands) - Real Solana WDK Integration
 */
async function ExecutionEngine(transactionData) {
    console.log(`\n[ExecutionEngine] 🖐️ Preparing to execute physical transaction on Solana...`);

    try {
        const { amount_usdt, purpose, recipient_address } = transactionData;

        console.log(`[ExecutionEngine] 🔗 Initializing local WDK instance and registering Solana Wallet...`);
        const mockSeedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

        // Register the Solana WalletManager into the WDK
        const wdk = new WDK(mockSeedPhrase)
            .registerWallet('solana', WalletManagerSolana, {
                rpcUrl: 'https://api.devnet.solana.com',
                commitment: 'confirmed',
            });

        // Derive the account
        const account = await wdk.getAccount('solana', 0);
        const address = await account.getAddress();

        console.log(`[ExecutionEngine] 📝 Derived Sender Address: ${address}`);
        console.log(`[ExecutionEngine] 📝 Drafting transaction...`);
        console.log(`[ExecutionEngine]    -> Blockchain: Solana (Devnet)`);
        console.log(`[ExecutionEngine]    -> Asset: USDT`);
        console.log(`[ExecutionEngine]    -> Amount: ${amount_usdt}`);
        console.log(`[ExecutionEngine]    -> Recipient: ${recipient_address || "Default/Demo Address"}`);
        console.log(`[ExecutionEngine]    -> Memo/Purpose: ${purpose}`);

        console.log(`[ExecutionEngine] ✅ Transaction draft prepared successfully! Pending signature.`);
        
        console.log(`\n=========================================`);
        console.log(`⚠️ NOTICE: AI-generated draft. Please double-check the`);
        console.log(`recipient address and amount. Sovereign Witness is a`);
        console.log(`witness, not an executor.`);
        console.log(`=========================================`);

        wdk.dispose();
    } catch (error) {
        console.error(`[ExecutionEngine] ❌ Transaction drafting failed:`, error);
        throw error;
    }
}

async function runSovereignWitness() {
    console.log("=========================================");
    console.log("   SOVEREIGN WITNESS INITIALIZATION      ");
    console.log("=========================================\n");

    try {
        const receiptPath = path.join(__dirname, 'receipt.jpg');

        const ocrText = await VisionEngine(receiptPath);
        const extractedData = await AnalyticalEngine(ocrText);
        await ExecutionEngine(extractedData);

        // Cleanly close the QVAC client connections
        await close();

        console.log("\n=========================================");
        console.log("   PIPELINE EXECUTED SUCCESSFULLY        ");
        console.log("=========================================\n");

    } catch (error) {
        console.error("\n❌ Pipeline encountered a critical error:", error);
        process.exit(1);
    }
}

runSovereignWitness();
