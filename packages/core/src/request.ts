import WebSocket, { Server as WsServer } from 'ws';
import { Server } from 'http';
import { GraphQLSchema, parse, specifiedRules, validate } from 'graphql';
import { compileQuery } from 'graphql-jit';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Response } from './models/response';
import { Request } from './models/request';
import { BaseModule } from './module';
import { getMetadataStorage } from './metadata/getMetadata';
import { RouteOptions } from './metadata/declarations/Route-metadata';
import { EventMetadataOptions } from './metadata/declarations/Event-metadata';
import { Util } from './utils/request';
import { Logger } from './utils/logger';

interface Context {
    ws: WsServer;
    req?: Request;
    res?: Response;
}

interface RequestPayload {
    operation: string;
    body: string;
    opcode: string | undefined;
    variables: {
        [key: string]: string;
    };
}

interface Options {
    schema: GraphQLSchema;
    ws: WsServer;
    http: Server;
    context: (params: any) => void;
    path: string;
    rootValue: string | undefined | null;
    modules: any[];
    prefix: string;
}

export const METHOD = {
    GET: 'get',
    POST: 'post',
    DELETE: 'delete',
    PUT: 'put',
    OPTIONS: 'options',
    PATCH: 'patch',
    ALL: 'all',
};

export class RequestHandler {
    private ws: WsServer;
    private schema: GraphQLSchema;
    private context: Function;
    private http: Server;
    private path: String;
    private rawModules: any[];
    private prefix: string;
    private rootValue: string = '';

    private queryCache: {
        [key: string]: any;
    } = {};

    private routes: any;

    private events: {
        [key: string]: {
            name: string;
            parent: string;
            methodName: string;
        };
    } = {};

    private modules: {
        [key: string]: BaseModule;
    } = {};

    constructor(options: Options) {
        this.schema = options.schema;
        this.ws = options.ws;
        this.context = options.context;
        this.http = options.http;
        this.path = options.path;
        if (options.rootValue) {
            this.rootValue = options.rootValue;
        }

        this.rawModules = options.modules;
        this.prefix = options.prefix;

        this.routes = {};
        for (const i in METHOD) {
            this.routes[(METHOD as any)[i]] = [];
        }

        this.buildModules();
    }

    private async graphql(
        data: RequestPayload,
        request?: Request,
        response?: Response
    ) {
        return new Promise(async (res, rej) => {
            const documentAST = parse(data.body);

            const validationErrors = validate(this.schema, documentAST, [
                ...specifiedRules,
            ]);

            if (validationErrors.length > 0) {
                return res(validationErrors);
            }

            const contextPayload: Context = {
                ws: this.ws,
            };

            if (request && response) {
                contextPayload.req = request;
                contextPayload.res = response;
            }

            if (!(data.body in this.queryCache)) {
                this.queryCache[data.body] = compileQuery(
                    this.schema,
                    documentAST,
                    data.operation,
                    {
                        customJSONSerializer: true,
                    }
                );
            }

            const result = this.queryCache[data.body].query(
                this.rootValue,
                this.context(contextPayload),
                data.variables
            );

            res(result.data);
        });
    }

    private getParams(payload: any) {
        let opcode;
        let operation;
        let body;
        let variables;

        if (payload.query) {
            const tempOperataion = payload.query.split(' ')[0];
            switch (tempOperataion) {
                case 'query':
                    opcode = 0;
                    break;
                case 'mutation':
                    opcode = 1;
                    break;
                case 'subscription':
                    opcode = 2;
                    break;
                default:
                    opcode = 0;
                    break;
            }

            body = payload.query;
            operation = payload.operation;
            variables = payload.variables;
        } else {
            opcode = payload.opcode;
            operation = payload.operation;
            body = payload.data.body;
            variables = payload.data.variables;
        }

        return { operation, body, variables, opcode };
    }

    async onReq() {
        this.ws.on('connection', (websocket: WebSocket) => {
            websocket.on('message', async (payload: any) => {
                const body = JSON.parse(payload);

                if (body.opcode) {
                    const data: RequestPayload = this.getParams(body);

                    const response = await this.graphql(data);

                    return websocket.send(JSON.stringify(response));
                }

                const eventname = body.e;

                if (eventname in this.events) {
                    const event = this.events[eventname];
                    const module = this.modules[event.parent];

                    // @ts-ignore
                    const execute = module[event.methodName];

                    console.log('event');

                    execute({ websocket, data: body.data });
                } else {
                    return websocket.send(
                        JSON.stringify({
                            code: 404,
                            error: 'Event does not exist',
                            iat: new Date().getTime(),
                        })
                    );
                }
            });
        });
        this.rest();
    }

    private rest() {
        this.http.on(
            'request',
            async (req: IncomingMessage, res: ServerResponse) => {
                const start = process.hrtime();
                const request = new Request(req);
                const response = new Response(res);

                if (
                    (req.url === this.path &&
                        (req.method === 'POST' || req.method === 'post')) ||
                    (req.url === '/graphql' &&
                        (req.method === 'POST' || req.method === 'post'))
                ) {
                    const body = await request.rawbody();

                    const payload = this.getParams(body);

                    const executed = await this.graphql(
                        payload,
                        request,
                        response
                    );
                    response.json(executed);
                    response.execute();
                } else {
                    const match = this.find(req);
                    if (match.map && match.m) {
                        const module = this.modules[match.map.parent];

                        const body = await request.rawbody();
                        request.body = body;

                        if (match.map.param.length > 0) {
                            const params: {
                                [key: string]: string;
                            } = {};

                            let count = 1;
                            match.map.param.forEach((p: string) => {
                                params[p] = match.m[count];
                                count++;
                            });

                            request.params = params;
                        }

                        const contextPayload: any = {
                            ws: this.ws,
                            res: response,
                            req: request,
                        };

                        // @ts-ignore
                        const executionFunction = module[match.map.methodName];
                        await executionFunction(this.context(contextPayload));
                        const end = process.hrtime(start);

                        Logger.success({
                            method: req.method!,
                            endpoint: match.map.path,
                            time: (end[0] * 1e9 + end[1]) / 1e6,
                        });

                        response.execute();
                    } else {
                        response.status(404);
                        response.json({
                            error: {
                                path: 'http',
                                endpoint: `${req.url}`,
                                message: 'Route does not exist.',
                            },
                            iat: new Date().getTime(),
                        });
                        return response.execute();
                    }
                }
            }
        );
    }

    buildModules() {
        for (const rawModule of this.rawModules) {
            const module: BaseModule = new rawModule();
            const moduleMetadata = (getMetadataStorage() as any).getModuleMetadata(
                rawModule.name
            );
            getMetadataStorage()
                .getRouteMetadata()
                .forEach((r: RouteOptions) => {
                    if (r.parent === rawModule.name) {
                        const endpoint = r.endpoint
                            .replace('prefix', this.prefix)
                            .replace('mPrefix', moduleMetadata?.prefix!);

                        if (endpoint === this.path) {
                            throw new Error(
                                `Endpoint is reserved for graphql. ${endpoint}`
                            );
                        }

                        this.routes[r.method].push({
                            methodName: r.methodName,
                            reg: Util.pathToReg(
                                this.prefix,
                                moduleMetadata.prefix,
                                r.endpoint
                            ),
                            path: Util.pathJoin(
                                this.prefix,
                                moduleMetadata.prefix,
                                r.endpoint
                            ).replace(/:(\w+)/g, '{$1}'),
                            param: (r.endpoint.match(/:\w+/g) || []).map((a) =>
                                a.substr(1)
                            ),
                            parent: rawModule.name,
                        });
                    }
                });
            (getMetadataStorage().getEventMetadata() as any).forEach(
                (e: EventMetadataOptions) => {
                    if (e.parent === rawModule.name) {
                        this.events[e.name] = {
                            ...e,
                        };
                    }
                }
            );

            this.modules[rawModule.name] = module;
        }
    }

    find(req: any): any | void {
        const method = req.method.toLowerCase();
        for (const i in this.routes[method]) {
            const m = req.url.match(this.routes[method][i].reg);
            if (m) {
                const matches = [];
                for (let i = 0; i < m.length; i++) {
                    matches[i] = decodeURIComponent(m[i]);
                }
                return { m: matches, map: this.routes[method][i] };
            }
        }
        return { m: null, map: null };
    }
}
