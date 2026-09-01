import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "coverage/**",
    "next-env.d.ts",
    "integrations/p2p-payment-integrator/**",
    "tools/fondo-integrator-deployer/**",
  ]),
]);
