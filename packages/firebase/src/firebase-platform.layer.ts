import {
  Frameworks,
  PlatformLayer,
  WebModule,
  HttpLayer,
  Env,
  PlatformError,
} from '@sapphire-cms/core';
import { inject, PlatformApplication, PlatformBuilder } from '@tsed/common';
import { PlatformServerlessHttp } from '@tsed/platform-serverless-http';
import cors from 'cors';
import { Outcome, success } from 'defectless';
import * as express from 'express';

export default class FirebasePlatformLayer implements PlatformLayer {
  public readonly supportedFrameworks = [Frameworks.TSED];
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
    const controllerClasses = this.controllers.map((controller) => controller.constructor);

    const settings: Partial<TsED.Configuration> = {
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
      imports: [
        {
          token: FirebasePlatformLayer,
          use: this,
        },
      ],
    };

    return Outcome.fromFunction(
      PlatformServerlessHttp.bootstrap,
      (err) => new PlatformError('Failed to bootstrap Express platform', err),
    )(FirebasePlatformLayer, settings).map((platform) => {
      this.platform = platform;
      return;
    });
  }

  public halt(): Outcome<void, PlatformError> {
    // DO NOTHING
    return success();
  }

  protected $afterRoutesInit(): void {
    const app = inject(PlatformApplication);

    // Add middleware
    // Important: don't define middlewares in settings because they are not bundled
    app.use(cors({ origin: true })).use(express.json());
  }
}
