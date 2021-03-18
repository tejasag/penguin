import { EventMetadataOptions } from './declarations/Event-metadata';
import { ModuleOptions } from './declarations/Module-metadata';
import { RouteOptions } from './declarations/Route-metadata';

export class Metadata {
    private routeMetadata: RouteOptions[] = [];
    private moduleMetadata: ModuleOptions[] = [];
    private eventMetadata: EventMetadataOptions[] = [];

    collectRouteMetadata(options: RouteOptions) {
        this.routeMetadata.push(options);
    }

    getRouteMetadata() {
        return this.routeMetadata;
    }

    getGroupRouteMetadata(module: string) {
        return this.routeMetadata.filter((r) => r.parent === module);
    }

    collectModuleMetadata(options: ModuleOptions) {
        this.moduleMetadata.push(options);
    }

    getModuleMetadata(identifyer?: string) {
        if (identifyer) {
            return this.moduleMetadata.find((v) => v.name === identifyer);
        }
        return this.moduleMetadata;
    }

    getSingleModuleMetadata(module: string) {
        return this.moduleMetadata.find((m) => m.name === module);
    }

    collectEventMetadata(options: EventMetadataOptions) {
        this.eventMetadata.push(options);
    }

    getGroupEventMetadata(module: string) {
        return this.eventMetadata.filter((e) => e.parent === module);
    }
}
