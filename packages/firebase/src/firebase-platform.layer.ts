import {
  Env,
  Framework,
  HttpLayer,
  PlatformError,
  PlatformLayer,
  WebModule,
} from '@sapphire-cms/core';
import { classOf } from '@tsed/core';
import type { TokenProvider } from '@tsed/di';
import { PlatformExpress } from '@tsed/platform-express';
import { PlatformBuilder, PlatformBuilderSettings } from '@tsed/platform-http';
import cors from 'cors';
import { Outcome, success } from 'defectless';
import * as express from 'express';

export default class FirebasePlatformLayer implements PlatformLayer {
  public readonly supportedFrameworks = [Framework.TSED];
  public readonly controllers: HttpLayer[] = [];
  public platform: PlatformBuilder | undefined;

  public getEnv(): Outcome<Env, PlatformError> {
    return success({});
  }

  public addRestController(controller: HttpLayer): void {
    this.controllers.push(controller);
  }

  public addWebModule(_webModule: WebModule): void {
    // Web modules are not supported on Firebase. Hosting should be used instead
  }

  public start(): Outcome<void, PlatformError> {
    const controllerClasses: TokenProvider[] = this.controllers.map(classOf);

    console.log('===>', controllerClasses); // check if it's TokenProvider: ex MyController {}

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
    };

    return Outcome.fromFunction(
      PlatformExpress.bootstrap,
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
