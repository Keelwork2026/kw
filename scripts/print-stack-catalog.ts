/**
 * Prints the Kimi + DeepSeek catalogue for AI_MODEL_CATALOG.
 *   pnpm tsx scripts/print-stack-catalog.ts          # global Kimi endpoint
 *   pnpm tsx scripts/print-stack-catalog.ts china    # https://api.moonshot.cn/v1
 */
import { keelworkStackCatalog } from "../src/lib/ai/presets";

const region = process.argv[2] === "china" ? "china" : "global";
process.stdout.write(JSON.stringify(keelworkStackCatalog({ kimiRegion: region })) + "\n");
