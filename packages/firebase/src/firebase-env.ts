import * as process from 'node:process';
import { declaredParams } from 'firebase-functions/params';

export class FirebaseEnv {
  constructor() {
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }

        if (typeof prop !== 'string') {
          return Reflect.get(target, prop, receiver);
        }

        return target.get(prop);
      },
    });
  }

  private get(key: string): string {
    const secret = declaredParams.find((param) => param.name === key);
    return secret?.value() || process.env[key] || '';
  }
}
