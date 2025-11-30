import baseConfig from '../../eslint.config';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...baseConfig,

  {
    rules: {
      'import/no-unresolved': [
        'error',
        {
          ignore: ['firebase-functions/params'],
        },
      ],
    },
  },
]);
