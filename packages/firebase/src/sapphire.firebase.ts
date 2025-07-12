import { staticBootstrap } from '@sapphire-cms/bundle';
import { BootstrapError, CmsLoader, SapphireCms } from '@sapphire-cms/core';
import { Outcome } from 'defectless';
import * as functions from 'firebase-functions';
import FirebasePlatformLayer from './firebase-platform.layer';

const cmsLoader = new CmsLoader(staticBootstrap);

let sapphireCmsLoading: Outcome<SapphireCms, BootstrapError> | undefined = undefined;

export const app = functions.https.onRequest(async (req, res) => {
  if (!sapphireCmsLoading) {
    sapphireCmsLoading = cmsLoader.loadSapphireCms();
  }

  await cmsLoader.loadSapphireCms().match(
    (sapphireCms) => {
      (sapphireCms.platformLayer as FirebasePlatformLayer).platform!.callback(req, res);
    },
    (err) => {
      console.error('Failed to load Sapphire CMS', err);
    },
    (defect) => {
      console.error('Sapphire CMS loader defect', defect);
    },
  );
});
