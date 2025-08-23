import { ArgumentMetadata, Injectable, Logger, PipeTransform, Type } from '@nestjs/common';

import { validate, ValidationError, ValidationOptions } from 'class-validator';

import { ClassTransformOptions, plainToClass } from 'class-transformer';

import { assign, forEach, includes, map, set, values } from 'lodash';

import { BaseGrpcException, GrpcValidationException } from '../exceptions';

export interface GrpcValidationPipeOptions {
    /** Custom data serializer function */
    dataSerializer?: <T>(data: T) => T;
    /** Whether to enable detailed error logging */
    enableErrorLogging?: boolean;
    /** Custom error message prefix */
    errorMessagePrefix?: string;
    /** Custom error serializer function */
    errorSerializer?: (errors: ValidationError[]) => ValidationErrorInfo[];
    /** Custom exception factory function */
    exceptionFactory?: (message: string, errors: ValidationErrorInfo[]) => BaseGrpcException;
    /** Whether to strip unknown properties */
    stripUnknownProperties?: boolean;
    /** Custom transform options for class-transformer */
    transformOptions?: ClassTransformOptions;
    /** Custom validation groups */
    validationGroups?: string[];
    /** Custom validation options for class-validator */
    validationOptions?: ValidationOptions;
}

export interface ValidationErrorInfo {
    children?: ValidationErrorInfo[];
    constraints: Record<string, string>;
    property: string;
    value: unknown;
}

@Injectable()
export class GrpcValidationPipe implements PipeTransform<unknown> {
    private readonly logger: Logger;
    private readonly options: Required<GrpcValidationPipeOptions>;

    constructor(options: GrpcValidationPipeOptions = {}) {
        this.logger = new Logger(GrpcValidationPipe.name);
        this.options = {
            dataSerializer: options.dataSerializer || (<T>(data: T): T => data),
            enableErrorLogging: options.enableErrorLogging ?? false,
            errorMessagePrefix: options.errorMessagePrefix || 'Validation failed',
            errorSerializer:
                options.errorSerializer || ((errors: ValidationError[]) => this.defaultErrorSerializer(errors)),
            exceptionFactory:
                options.exceptionFactory ||
                ((message: string, errors: ValidationErrorInfo[]) => this.defaultExceptionFactory(message, errors)),
            stripUnknownProperties: options.stripUnknownProperties ?? true,
            transformOptions: {
                enableImplicitConversion: true,
                excludeExtraneousValues: false,
                ...options.transformOptions,
            },
            validationGroups: options.validationGroups || [],
            validationOptions: {
                ...options.validationOptions,
            },
        };
    }

    /**
     * Set custom data serializer
     */
    setDataSerializer(serializer: <T>(data: T) => T): this {
        this.options.dataSerializer = serializer;

        return this;
    }

    /**
     * Enable/disable error logging
     */
    setErrorLogging(enabled: boolean): this {
        this.options.enableErrorLogging = enabled;

        return this;
    }

    /**
     * Set custom error serializer
     */
    setErrorSerializer(serializer: (errors: ValidationError[]) => ValidationErrorInfo[]): this {
        this.options.errorSerializer = serializer;

        return this;
    }

    /**
     * Set custom exception factory
     */
    setExceptionFactory(factory: (message: string, errors: ValidationErrorInfo[]) => BaseGrpcException): this {
        this.options.exceptionFactory = factory;

        return this;
    }

    /**
     * Set validation groups
     */
    setValidationGroups(groups: string[]): this {
        this.options.validationGroups = groups;

        return this;
    }

    /**
     * Update pipe options at runtime
     */
    updateOptions(newOptions: Partial<GrpcValidationPipeOptions>): void {
        assign(this.options, newOptions);
    }

    async transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown> {
        if (!metatype || !this.toValidate(metatype)) {
            return this.options.dataSerializer(value);
        }

        // Transform input data using class-transformer
        const object = plainToClass(metatype, value, this.options.transformOptions) as Record<string, unknown>;

        // Prepare validation options
        const validationOptions: ValidationOptions = {
            ...this.options.validationOptions,
            groups: this.options.validationGroups.length > 0 ? this.options.validationGroups : undefined,
        };

        // Validate the object
        const errors = await validate(object, validationOptions);

        if (errors.length > 0) {
            // Serialize errors using custom or default serializer
            const errorMessages = this.options.errorSerializer(errors);

            // Log errors if enabled
            if (this.options.enableErrorLogging) {
                this.logger.error('Validation errors:', JSON.stringify(errorMessages, null, 2));
            }

            // Create exception using custom or default factory
            throw this.options.exceptionFactory(this.options.errorMessagePrefix, errorMessages);
        }

        // Apply final data serialization
        return this.options.dataSerializer(object);
    }

    /**
     * Create a new pipe instance with merged options
     */
    withOptions(additionalOptions: Partial<GrpcValidationPipeOptions>): GrpcValidationPipe {
        return new GrpcValidationPipe({
            ...this.options,
            ...additionalOptions,
        });
    }

    private defaultDataSerializer<T>(data: T): T {
        return data;
    }

    private defaultErrorSerializer(errors: ValidationError[]): ValidationErrorInfo[] {
        return map(
            errors,
            (error: ValidationError): ValidationErrorInfo => ({
                constraints: error.constraints || {},
                property: error.property,
                value: error.value,
                ...(error.children &&
                    error.children.length > 0 && {
                        children: this.defaultErrorSerializer(error.children),
                    }),
            }),
        );
    }

    private defaultExceptionFactory(message: string, errors: ValidationErrorInfo[]): BaseGrpcException {
        const allErrors: string[] = [];
        const fieldErrors: Record<string, Record<string, string>> = {};

        forEach(errors, (error) => {
            const constraints = error.constraints || {};
            const { property } = error;

            set(fieldErrors, property, constraints);

            forEach(values(constraints), (message) => {
                allErrors.push(message);
            });
        });

        const validationDetails = {
            errors: allErrors,
            fieldErrors: fieldErrors,
            message: 'Validation failed',
            timestamp: new Date().toISOString(),
        };

        const jsonMessage = JSON.stringify(validationDetails, null, 2);

        return new GrpcValidationException(jsonMessage, errors);
    }

    private toValidate(metatype: Type<unknown>): boolean {
        const types: Type<unknown>[] = [String, Boolean, Number, Array, Object];

        return !includes(types, metatype);
    }
}
