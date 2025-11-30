import { staticBootstrap } from '@sapphire-cms/bundle';
import { BootstrapError, CmsConfig, CmsLoader } from '@sapphire-cms/core';
import { PlatformBuilder } from '@sapphire-cms/tsed';
import { SyncOutcome } from 'defectless';
import * as functions from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import FirebasePlatformLayer from './firebase-platform.layer';

const envVarRegex = /\${\s*env.([A-Za-z_$][A-Za-z0-9_$]*)\s*}/;
let secrets: string[] = [];

(staticBootstrap.getCmsConfig() as SyncOutcome<CmsConfig, BootstrapError>).matchSync(
  (cmsConfig) => {
    secrets = findSecrets(cmsConfig);
  },
  (err) => {
    console.error('Unexpected error', err);
  },
);

for (const secret of secrets) {
  defineSecret(secret);
}

const cmsLoader = new CmsLoader(staticBootstrap);
let platform: PlatformBuilder | undefined;

functions.onInit(async () => {
  await cmsLoader
    .loadSapphireCms()
    .through((sapphireCms) => sapphireCms.run())
    .match(
      (sapphireCms) => {
        platform = (sapphireCms.platformLayer as FirebasePlatformLayer).platform!;
      },
      (err) => {
        console.error('Failed to load Sapphire CMS', err);
      },
      (defect) => {
        console.error('Sapphire CMS loader defect', defect);
      },
    );
});

export const sapphire = functions.https.onRequest({ secrets }, (req, res) => {
  platform!.callback(req, res);
});

function findSecrets(cmsConfig: CmsConfig): string[] {
  const secrets: string[] = [];

  for (const moduleConfig of Object.values(cmsConfig.config.modules)) {
    for (const value of Object.values(moduleConfig.config)) {
      if (typeof value === 'string') {
        const match = value.match(envVarRegex);
        if (match) {
          secrets.push(match[1]);
        }
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') {
            const match = item.match(envVarRegex);
            if (match) {
              secrets.push(match[1]);
            }
          }
        }
      }
    }
  }

  return secrets;
}
