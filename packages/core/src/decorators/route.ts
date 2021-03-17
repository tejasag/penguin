import 'reflect-metadata';
import { RouteOptions } from '@penguin/types';
import { ModuleMap } from '../metadata/module';
import { RouteMap } from '../metadata/route';
import { getMetadataStorage } from '../metadata/getMetadata';

export function Route(options: RouteOptions): MethodDecorator {
    return (prototype, methodName) => {
        const endpoint = options.endpoint
            ? `${options.endpoint.toLowerCase()}`
            : '';

        getMetadataStorage().collectRouteMetadata({
            endpoint,
            methodName: methodName as string,
            method: options.method,
            parent: prototype.constructor.name,
        });
    };
}
