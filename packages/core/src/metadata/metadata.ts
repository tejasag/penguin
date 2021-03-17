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

    collectModuleMetadata(options: ModuleOptions) {
        this.moduleMetadata.push(options);
    }

    getModuleMetadata(identifyer?: string) {
        if (identifyer) {
            return this.moduleMetadata.find((v) => v.name === identifyer);
        }
        return this.moduleMetadata;
    }

    collectEventMetadata(options: EventMetadataOptions) {
        this.eventMetadata.push(options);
    }

    getEventMetadata(identifyer?: string) {
        if (identifyer) {
            return this.eventMetadata.find((v) => v.name === identifyer);
        }
        return this.eventMetadata;
    }
}
