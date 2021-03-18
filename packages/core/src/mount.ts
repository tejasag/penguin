import { GraphQLSchema, validateSchema } from 'graphql';
import { createServer, Server } from 'http';
import { Server as WsServer } from 'ws';
import * as url from 'url';
import { OrmOptions } from '@penguin/types';
import { IncomingMessage } from 'node:http';
import { Response } from './models/response';
import { BaseModule } from './module';
import { WebsocketRequestHandler } from './handlers/websocket';
import { getMetadataStorage } from './metadata/getMetadata';
import { HttpRequestHandler } from './handlers/http';

interface ContextPayload {
    ws?: WsServer;
    http?: Server;
    req?: IncomingMessage;
    res?: Response;
    route?: {
        param?: string;
        query?: {
            [key: string]: string;
        };
    };
}

interface GraphqlOptions {
    rootValue?: string;
    schema: GraphQLSchema;
    path?: string;
}

interface Options {
    graphql: GraphqlOptions;
    orm: OrmOptions | boolean;
    app: App;
}

interface App {
    context: (params: ContextPayload) => void;
    prefix: string;
    modules: any[];
}

export class Mount {
    server: Server;
    ws: WsServer;
    private schema: GraphQLSchema;
    private path: string;
    private context: any;
    private rootValue: string;
    private orm: OrmOptions | boolean;
    private modules: {
        [key: string]: {
            name: string;
            prefix: string;
            module: BaseModule;
        };
    } = {};
    private prefix: string;

    constructor(options: Options) {
        this.path = options.graphql.path || '/graphql';
        this.context = options.app.context;

        const schemaErrors = validateSchema(options.graphql.schema);

        if (schemaErrors.length > 0) {
            throw new Error(schemaErrors.toString());
        }

        this.schema = options.graphql.schema;

        if (options.orm) {
            this.orm = options.orm;
        } else {
            this.orm = false;
        }

        for (const rawModule of options.app.modules) {
            const module: BaseModule = new rawModule();
            const metadata = getMetadataStorage().getSingleModuleMetadata(
                rawModule.name
            );

            if (!metadata) {
                throw new Error(
                    `Module ${rawModule.name} is invalid, missing @Module() decorator`
                );
            }

            this.modules[metadata?.name!] = {
                module,
                prefix: metadata?.prefix!,
                name: metadata?.name!,
            };
        }

        this.prefix = options.app.prefix;

        if (options.graphql.rootValue) {
            this.rootValue = options.graphql.rootValue;
        }
    }

    async listen(port: number, cb: Function) {
        this.server = createServer();
        this.ws = new WsServer({ noServer: true });

        this.server.on('upgrade', (request: IncomingMessage, socket, head) => {
            const pathname = url.parse(request.url!).pathname;

            if (pathname === this.path || pathname === '/graphql') {
                this.ws.handleUpgrade(request, socket, head, (ws) => {
                    (ws as any).upgradeReq === request;
                    this.ws.emit('connection', ws, request);
                });
            } else {
                socket.destroy();
            }
        });

        this.server.listen(port);
        this.init();
        cb(this.ws, this.ws);
    }

    private async init() {
        const rawModules = Object.entries(this.modules);

        const modules = rawModules.map((m) => {
            return {
                prefix: m[1].prefix,
                module: m[1].module,
                name: m[1].name,
            };
        });

        new WebsocketRequestHandler({
            schema: this.schema,
            server: this.ws,
            context: this.context,
            modules,
        }).init();

        new HttpRequestHandler({
            schema: this.schema,
            server: this.server,
            prefix: this.prefix,
            modules,
            path: this.path,
            context: this.context,
        }).init();
    }
}
