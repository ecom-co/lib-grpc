// Updated main.ts using @ecom-co/grpc bootstrapper

/* eslint-disable no-console */
import { GrpcExceptionFilter, GrpcValidationPipe, GrpcBootstrapper } from '@ecom-co/grpc';
import { ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { NestApplication, NestFactory, Reflector } from '@nestjs/core';

import { ConfigServiceApp } from '@/modules/config/config.service';

import { AppModule } from '@/app.module';
import { ServiceManager } from '@/services';

/**
 * Bootstrap the NestJS application
 */
const bootstrap = async (): Promise<void> => {
    const app: NestApplication = await NestFactory.create(AppModule, {
        snapshot: true,
        logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Get config service
    const configService = app.get(ConfigServiceApp);
    const logger = new Logger('Bootstrap');

    // Use custom gRPC validation pipe
    app.useGlobalPipes(new GrpcValidationPipe());

    // Global class serializer interceptor
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    // Add GrpcExceptionFilter to handle exceptions globally
    const filter = new GrpcExceptionFilter({
        isDevelopment: configService.nodeEnv === 'development',
        enableLogging: true,
        enableMetrics: true,
        enableAsyncLogging: true,
        maxDetailsSize: 1000,
        errorRateLimit: 10,
        rateLimitWindowMs: 60000,
    });

    app.useGlobalFilters(filter);

    // Setup and start multiple gRPC microservices using GrpcBootstrapper
    const serviceManager = app.get(ServiceManager);

    await GrpcBootstrapper.bootstrap(app, serviceManager, {
        appModule: AppModule,
        logger,
        logEnvironment: true,
        getEnvironment: () => configService.nodeEnv,
        maxConcurrency: 3,
    });
};

void bootstrap();
