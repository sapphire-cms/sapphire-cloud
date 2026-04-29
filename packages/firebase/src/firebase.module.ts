import { getBuildParamsType, SapphireModule } from '@sapphire-cms/core';
import FirebasePlatformLayer from './firebase-platform.layer';
import FirestorePersistenceLayer from './firestore-persistence.layer';

const moduleParamsDef = [
  {
    name: 'projectId',
    type: 'string',
    required: false,
    description: 'The ID of the Google Cloud project associated with the App.',
  },
  {
    name: 'clientEmail',
    type: 'string',
    required: false,
    description: 'Service Account email.',
  },
  {
    name: 'privateKey',
    type: 'string',
    required: false,
    description: 'Service Account private key.',
  },
] as const;

const _params = getBuildParamsType(moduleParamsDef);
export type FirebaseModuleParams = typeof _params;

@SapphireModule({
  name: 'firebase',
  params: moduleParamsDef,
  layers: {
    platform: FirebasePlatformLayer,
    persistence: FirestorePersistenceLayer,
  },
})
export default class FirebaseModule {}
