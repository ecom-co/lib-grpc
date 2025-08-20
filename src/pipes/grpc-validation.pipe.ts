import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

import { validate, ValidationError } from 'class-validator';

import { plainToClass } from 'class-transformer';

import { set } from 'lodash';

import { GrpcValidationException } from '../exceptions/grpc-validation.exception';

@Injectable()
export class GrpcValidationPipe implements PipeTransform<unknown> {
    async transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown> {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        const object = plainToClass(metatype, value);
        const errors = await validate(object as object);

        if (errors.length > 0) {
            const validationErrors: string[] = [];
            const fieldErrors: Record<string, Record<string, string>> = {};

            errors.forEach((error: ValidationError) => {
                if (error.constraints) {
                    const fieldName = error.property;

                    set(fieldErrors, fieldName, error.constraints);

                    Object.values(error.constraints).forEach((message) => {
                        validationErrors.push(`${fieldName}: ${message}`);
                    });
                }
            });

            throw new GrpcValidationException(validationErrors, fieldErrors);
        }

        return object;
    }

    private toValidate(metatype: unknown): metatype is new (...args: unknown[]) => unknown {
        const types: unknown[] = [String, Boolean, Number, Array, Object];

        return !types.includes(metatype);
    }
}
