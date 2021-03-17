import 'reflect-metadata';
import { ModuleOptions } from '@penguin/types';
import { ModuleMap } from '../metadata/module';
import { getMetadataStorage } from '../metadata/getMetadata';

export function Module(options: ModuleOptions): ClassDecorator {
    return (target) => {
        if (typeof options === 'object') {
            getMetadataStorage().collectModuleMetadata({
                prefix: options.prefix,
                name: target.name,
            });
        }
    };
}
