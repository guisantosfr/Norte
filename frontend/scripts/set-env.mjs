import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const envFilePath = resolve(rootDir, '.env');
const environmentsDir = resolve(rootDir, 'src', 'environments');

function parseDotEnv(filePath) {
  const result = {};
  if (!existsSync(filePath)) {
    return result;
  }

  const content = readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const fileVars = parseDotEnv(envFilePath);
const apiUrl = (process.env.API_URL || fileVars.API_URL || 'http://localhost:8080').replace(
  /\/+$/,
  ''
);

if (!existsSync(environmentsDir)) {
  mkdirSync(environmentsDir, { recursive: true });
}

const prodContent = `// Arquivo gerado automaticamente por scripts/set-env.mjs a partir do .env / variáveis de ambiente
export const environment = {
  production: true,
  apiUrl: ${JSON.stringify(apiUrl)},
};
`;

const devContent = `// Arquivo gerado automaticamente por scripts/set-env.mjs a partir do .env / variáveis de ambiente
export const environment = {
  production: false,
  apiUrl: ${JSON.stringify(apiUrl)},
};
`;

writeFileSync(resolve(environmentsDir, 'environment.ts'), prodContent, 'utf-8');
writeFileSync(resolve(environmentsDir, 'environment.development.ts'), devContent, 'utf-8');
