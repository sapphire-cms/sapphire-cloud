import {
  Env,
  Framework,
  HttpLayer,
  PlatformError,
  PlatformLayer,
  WebModule,
} from '@sapphire-cms/core';
import { inject, PlatformApplication, PlatformBuilder } from '@tsed/common';
import { PlatformServerlessHttp } from '@tsed/platform-serverless-http';
import cors from 'cors';
import { Outcome, success } from 'defectless';
import * as express from 'express';
import { PlatformBuilderSettings } from '@tsed/platform-http';
import { PlatformExpress } from '@tsed/platform-express';

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
    const controllerClasses = this.controllers.map((controller) => controller.constructor);

    const settings: PlatformBuilderSettings<any> = {
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
      adapter: PlatformExpress,
    };

    return Outcome.fromFunction(
      // For @Romain Lenzotti: platform is bootstrapped with provided settings
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

  protected $afterInit(): void {
    const app = inject(PlatformApplication);

    // Add middleware
    // Important: don't define middlewares in settings because they are not bundled
    app.use(cors({ origin: true })).use(express.json());
  }
}
