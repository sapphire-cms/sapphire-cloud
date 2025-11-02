import { staticBootstrap } from '@sapphire-cms/bundle';
import {
  BootstrapError,
  CmsLoader,
  CoreCmsError,
  PlatformError,
  PortError,
  SapphireCms,
} from '@sapphire-cms/core';
import { Outcome } from 'defectless';
import * as functions from 'firebase-functions';
import FirebasePlatformLayer from './firebase-platform.layer';

const cmsLoader = new CmsLoader(staticBootstrap);

let sapphireCmsLoading:
  | Outcome<SapphireCms, CoreCmsError | BootstrapError | PlatformError | PortError>
  | undefined = undefined;

export const sapphire = functions.https.onRequest(async (req, res) => {
  if (!sapphireCmsLoading) {
    sapphireCmsLoading = cmsLoader.loadSapphireCms().through((sapphireCms) => sapphireCms.run());
  }

  await sapphireCmsLoading!.match(
    (sapphireCms) => {
      // For @Romain Lenzotti: after sapphireCms.run(), platform is fully initialized
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
