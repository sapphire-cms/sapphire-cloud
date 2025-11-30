import {
  Env,
  Framework,
  HttpLayer,
  PlatformError,
  PlatformLayer,
  WebModule,
} from '@sapphire-cms/core';
import type { TokenProvider } from '@sapphire-cms/tsed';
import {
  PlatformBuilder,
  PlatformBuilderSettings,
  PlatformExpress,
  PlatformServerlessHttp,
} from '@sapphire-cms/tsed';
import cors from 'cors';
import { Outcome, success } from 'defectless';
import * as express from 'express';
import { FirebaseEnv } from './firebase-env';

export default class FirebasePlatformLayer implements PlatformLayer {
  public readonly supportedFrameworks = [Framework.TSED];
  public readonly controllers: HttpLayer[] = [];
  public platform: PlatformBuilder | undefined;

  public getEnv(): Outcome<Env, PlatformError> {
    return success(new FirebaseEnv() as unknown as Env);
  }

  public addRestController(controller: HttpLayer): void {
    this.controllers.push(controller);
  }

  public addWebModule(_webModule: WebModule): void {
    // Web modules are not supported on Firebase. Hosting should be used instead
  }

  public start(): Outcome<void, PlatformError> {
    const controllerClasses: TokenProvider[] = this.controllers.map(
      (controller) => controller.constructor,
    );

    const settings: PlatformBuilderSettings = {
      acceptMimes: ['application/json'],
      express: {
        bodyParser: {
          json: {},
        },
      },
      mount: {
        '/rest': controllerClasses,
      },
      statics: {},
      middlewares: [cors({ origin: true }), express.json()],
      imports: [
        {
          token: FirebasePlatformLayer,
          use: this,
        },
      ],
      adapter: PlatformExpress,
    };

    return Outcome.fromFunction(
      PlatformServerlessHttp.bootstrap,
      (err) => new PlatformError('Failed to bootstrap Express platform', err),
    )(FirebasePlatformLayer, settings).map((platform) => {
      this.platform = platform;
    });
  }

  public halt(): Outcome<void, PlatformError> {
    // DO NOTHING
    return success();
  }
}
