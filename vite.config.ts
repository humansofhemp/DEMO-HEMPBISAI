import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // Load .env files if any (though Coolify provides env vars directly)
    const loadedEnv = loadEnv(mode, process.cwd(), '');

    // Get GEMINI_API_KEY directly from the build process environment first,
    // then fall back to what loadEnv found (if anything).
    const coolifyProvidedApiKey = process.env.GEMINI_API_KEY;
    const apiKeyFromLoadEnv = loadedEnv.GEMINI_API_KEY;

    const apiKeyToUse = coolifyProvidedApiKey || apiKeyFromLoadEnv;

    // Log for debugging during Coolify build
    console.log(`[vite.config.ts] Debugging GEMINI_API_KEY:`);
    console.log(`  - Directly from process.env.GEMINI_API_KEY: ${coolifyProvidedApiKey ? '****** (exists)' : 'Not found'}`);
    console.log(`  - From loadEnv().GEMINI_API_KEY: ${apiKeyFromLoadEnv ? '****** (exists)' : 'Not found'}`);
    console.log(`  - API Key being used for define: ${apiKeyToUse ? '****** (exists)' : 'Not found / Undefined'}`);
    if (coolifyProvidedApiKey) {
      console.log(`    Direct process.env.GEMINI_API_KEY length: ${coolifyProvidedApiKey.length}`);
    }
    if (apiKeyFromLoadEnv) {
      console.log(`    loadEnv().GEMINI_API_KEY length: ${apiKeyFromLoadEnv.length}`);
    }


    return {
      define: {
        // The key 'process.env.API_KEY' is what geminiService.ts uses
        'process.env.API_KEY': JSON.stringify(apiKeyToUse),
        // Also defining 'process.env.GEMINI_API_KEY' for completeness, though not directly used by geminiService.ts
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKeyToUse)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
