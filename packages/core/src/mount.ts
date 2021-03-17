import { GraphQLSchema, validateSchema } from 'graphql';
import { createServer, Server } from 'http';
import { Server as WsServer } from 'ws';
import * as url from 'url';
import { OrmOptions } from '@penguin/types';
import { RequestHandler } from './request';
import { IncomingMessage } from 'node:http';
import { Response } from './models/response';
import { BaseModule } from './module';

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
    modules?: any[];
}

export class Mount {
    http: Server;
    ws: WsServer;
    private schema: GraphQLSchema;
    private path: string;
    private context: any;
    private handler: RequestHandler;
    private rootValue: string;
    private orm: OrmOptions | boolean;
    private modules: any[];
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

        this.modules = options.app.modules!;
        this.prefix = options.app.prefix;

        if (options.graphql.rootValue) {
            this.rootValue = options.graphql.rootValue;
        }
    }

    async listen(port: number, cb: Function) {
        this.http = createServer();
        this.ws = new WsServer({ noServer: true });

        this.http.on('upgrade', (request: IncomingMessage, socket, head) => {
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

        if (this.orm) {
            // @ts-ignore
            const orm = await import('@penguin/orm');
            console.log(orm);
        }

        this.handler = new RequestHandler({
            schema: this.schema,
            ws: this.ws,
            http: this.http,
            context: this.context,
            path: this.path,
            rootValue: this.rootValue ? this.rootValue : '',
            modules: this.modules,
            prefix: this.prefix,
        });
        this.http.listen(port);
        this.handler.onReq();
        cb(this.ws, this.ws);
    }
}
