import { SapphireModule } from '@sapphire-cms/core';
import FirebasePlatformLayer from './firebase-platform.layer';

@SapphireModule({
  name: 'firebase',
  params: [] as const,
  layers: {
    platform: FirebasePlatformLayer,
  },
})
export default class FirebaseModule {}
