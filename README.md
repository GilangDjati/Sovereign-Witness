# Sovereign Witness 👁️
*Built for the Tether Frontier Hackathon 2026*

**A local-first digital notary and transaction pipeline exclusively for the Solana Ecosystem.**

Sovereign Witness transforms standard consumer hardware into a digital notary for financial intentions. By bridging the gap between physical receipts and cryptographic execution, the system processes handwritten or printed text using local AI and securely drafts them as high-fidelity Solana transactions.

## 🏆 Hackathon Judging Criteria

This project was built from the ground up to score highly across all judging categories:

### Technical Depth (40%)
Sovereign Witness demonstrates deep architectural logic, seamlessly bridging computer vision, local large language models, and blockchain RPCs. It does not simply pass strings between APIs; it utilizes rigorous prompt engineering (`history-based` instruction generation for strict JSON formatting) alongside multi-layered JavaScript validations (Base58 bounds, mathematical thresholds, network origins) to guarantee cryptographic safety before WDK execution.

### Innovation (20%)
**Democratizing Local Crypto AI:** Standard local AI requires expensive, high-end NVIDIA GPUs, pricing out the average user. Sovereign Witness innovates by overriding standard Vulkan constraints (`gpu_layers: 0`), proving that high-security, local-first transaction parsers can run entirely on **Pure CPU** hardware. It brings the power of AI-to-crypto bridging to standard consumer laptops.

### Meaningful Integration 
A simple demo relies on perfect handwriting; a meaningful integration anticipates chaos. Sovereign Witness deeply integrates the `@qvac/sdk` and Tether WDK by handling physical edge cases. Through the **Heuristic Engine**, the system intelligently self-heals OCR hallucinations (e.g., misreading `1` as `I`), turning unstructured, messy reality into deterministic cryptographic action. 

---

## Technical Architecture

The pipeline is split into three tightly integrated, sequential micro-engines:

### 1. `Mata` (The Eyes) - QVAC OCR
Powered by `@qvac/ocr-onnx`, this module physically scans the image buffer to extract raw bounding-box text. It operates securely in an air-gapped environment to protect user privacy.

### 2. `Otak` (The Brain) - QVAC LLM
Powered by a 1B lightweight LLM via `@qvac/llm-llamacpp`, the brain analyzes the raw text to extract three critical fields: `amount_usdt`, `purpose`, and `recipient_address`. It is constrained by strict prompt rules to ignore volatile currencies, sub-totals, and structural grammar. 

### 3. `Tangan` (The Hands) - Tether WDK Integration
The physical executor. `Tangan` dynamically instantiates the `WalletManagerSolana` within the local WDK instance. It pipes the sanitized data directly into the Devnet environment, drafting the transaction locally pending user review.

## The "Witness" Philosophy

In the world of decentralized finance, user sovereignty is paramount. Sovereign Witness operates strictly under the **"Witness" Philosophy**—it is a secure observer, not an autonomous executor. 

By design, the pipeline acts as an intermediary layer that parses intent, sanitizes data, and drafts the transaction on the blockchain without ever signing or executing it automatically. This ensures:
- **Fund Safety**: The user retains absolute, final authority over their private keys and assets.
- **Intent Verification**: The system provides a transparent `"Draft-Only"` review phase before any cryptographic commitments are made. 

## Security & Loyalty: Cross-Chain Detective Filter

Sovereign Witness is uncompromisingly loyal to the Solana ecosystem. The pipeline is hardened by a multi-layered security engine designed to prevent cross-chain contamination.

- **Strict Network Origin Check**: The engine aggressively scans the prefix of all extracted data. It immediately intercepts, blocks, and alerts on non-Solana topologies, including **Ethereum (`0x`)**, **Bitcoin (`bc1`)**, and **Tron (`T`)**. These strings are structurally rejected before any heuristics occur.
- **Intelligent Heuristic Correction**: For addresses that clear the origin check, the system utilizes a Base58 Heuristic Engine. If the local OCR misreads visually similar characters due to poor lighting or handwriting (e.g., `I` vs `1`, or `O` vs `o`), the pipeline programmatically auto-corrects these known hallucinations and runs a secondary Base58 verification pass.

## Focused Utility: Intentional Design Constraints

To maximize precision and eliminate ambiguous operations, Sovereign Witness enforces the following strict operational guidelines:
- **USDT Exclusivity**: The engine is trained to strictly extract USDT (Tether) totals. 
- **Mandatory Wallet Verification**: To prevent "black hole" transactions, the system demands a definitive cryptographic recipient address on the physical medium. Intentions without a clear destination are safely halted via the **Vision Health Check**.

## Getting Started

### Prerequisites
- Node.js (v18+)
- `@qvac/sdk` and `@tetherto/wdk-wallet-solana` dependencies
- Local compute environment (Pure CPU architecture enabled by default via `qvac.config.js`)

### Execution
Run the core pipeline to capture an image, perform local AI extraction, and draft the transaction to the local WDK instance:
```bash
node witness.js
```

Upon successful extraction and cross-chain validation, the system will prepare the draft and emit the final safety notice:
```text
=========================================
⚠️ NOTICE: AI-generated draft. Please double-check the
recipient address and amount. Sovereign Witness is a
witness, not an executor.
=========================================
```
