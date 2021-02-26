import EventEmitter from "events";
import {
    execute,
    GraphQLSchema,
    parse,
    Source,
    specifiedRules,
    validate,
} from "graphql";
import { createServer, Server } from "http";
import type { Server as WsServerType } from "ws";
import { Server as WsServer } from "ws";
import * as url from "url";

interface GraphqlOptions {
    schema: GraphQLSchema;
    context: (params: any) => void;
}

interface Options {
    graphql: GraphqlOptions;
    path: string;
}

export class Mount extends EventEmitter {
    private http: Server;
    private ws: WsServerType;
    private schema: GraphQLSchema;
    private path: string;
    private context: any;

    constructor(options: Options) {
        super();
        this.path = options.path;
        this.context = options.graphql.context;
        this.schema = options.graphql.schema;
    }

    async listen(port: number, cb: Function) {
        this.http = createServer();
        this.ws = new WsServer({ noServer: true });

        this.http.on("upgrade", (request, socket, head) => {
            const pathname = url.parse(request.url).pathname;

            if (pathname === this.path || pathname === "/graphql") {
                this.ws.handleUpgrade(request, socket, head, (ws) => {
                    (ws as any).upgradeReq === request;
                    this.ws.emit("connection", ws, request);
                });
            } else {
                socket.destroy();
            }
        });

        this.http.listen(port);
        this.handler();
        this.rest();
        cb(this.ws, this.ws);
    }

    async handler() {
        this.ws.on("connection", (websocket: any, request: any) => {
            websocket.on("message", (payload: any, test: any) => {
                this.graphql(JSON.parse(payload));
            });

            console.log(websocket.upgradeReq);

            websocket.on("data", (payload: any) => {
                console.log(payload);
            });

            this.on("response", (result: any, optype: string, opcode: number) =>
                websocket.send(
                    JSON.stringify({ optype, opcode, data: { result } })
                )
            );
        });
    }

    private async graphql(payload: any) {
        const data: any = await this.getParams(payload);
        let documentAST;
        try {
            documentAST = parse(new Source(data.body, "GraphQL request"));
        } catch (syntaxError: unknown) {}

        const validationErrors = validate(this.schema, documentAST as any, [
            ...specifiedRules,
        ]);

        if (validationErrors) {
        }

        const result = await execute({
            schema: this.schema,
            document: documentAST as any,
            variableValues: data.variables,
            operationName: data.operation,
            contextValue: this.context({ ws: this.ws, http: this.http }),
        });

        this.emit("response", result.data, data.optype, data.opcode);
    }

    private async getParams(payload: any) {
        const opcode = payload.opcode;
        const operation = payload.operation;
        const body = payload.data.body;
        const variables = payload.data.variables;

        let optype;
        switch (opcode) {
            case 0:
                optype = "query";
                break;
            case 2:
                optype = "mutation";
                break;
            case 3:
                optype = "subscription";
                break;
        }

        return { operation, body: body.toString(), variables, optype, opcode };
    }

    private async rest() {
        this.http.on("request", (req, res) => {
            if (
                (req.url === this.path &&
                    (req.method === "GET" || req.method === "get")) ||
                (req.url === "/graphql" &&
                    (req.method === "GET" || req.method === "get"))
            ) {
                console.log(req.headers);
            }
        });
    }
}
