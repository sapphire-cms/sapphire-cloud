import * as rollup from 'rollup';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

const config: rollup.RollupOptions[] = [
  {
    input: 'src/firebase.module.ts',
    output: [
      {
        file: 'dist/firebase.module.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        experimentalDecorators: true,
      }),
      json(),
    ],
    external: [
      '@sapphire-cms/core',
      '@sapphire-cms/tsed',
      'cors',
      'express',
      'defectless',
      'node:process',
      'firebase-functions/params',
      'firebase-admin/app',
      'firebase-admin/firestore',
    ],
  },
  {
    input: 'src/sapphire.firebase.ts',
    output: [
      {
        file: 'dist/sapphire.firebase.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        experimentalDecorators: true,
      }),
      json(),
    ],
    external: [
      'firebase-functions',
      'firebase-functions/params',
      '@sapphire-cms/core',
      '@sapphire-cms/bundle',
    ],
  },
];

export default config;
