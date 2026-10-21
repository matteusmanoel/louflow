import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['components/**', 'app/**/page.tsx', 'app/**/layout.tsx'],
    ignores: ['app/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: '@/lib/db', message: 'Componentes e páginas não acessam o banco; use consultas em features/<modulo>.' }] },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'demandas-edits/**',
    'demandas-edits-web/**',
  ]),
]);
