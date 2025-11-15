import { staticBootstrap } from '@sapphire-cms/bundle';
import { CmsLoader } from '@sapphire-cms/core';
import * as functions from 'firebase-functions';
import FirebasePlatformLayer from './firebase-platform.layer';

const cmsLoader = new CmsLoader(staticBootstrap);
const sapphireCmsLoading = cmsLoader.loadSapphireCms().through((sapphireCms) => sapphireCms.run());

export const sapphire = functions.https.onRequest(async (req, res) => {
  await sapphireCmsLoading.match(
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
