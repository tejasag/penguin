import { ServerResponse } from 'node:http';
import { CookieOptions, ResponseHeaders } from '@penguin/types';
import cookie from 'cookie';

export class Response {
    private res: ServerResponse;

    constructor(res: ServerResponse) {
        this.res = res;
    }

    json(values: object | any | string) {
        values = JSON.stringify(values);
        this.res.write(values);
    }

    status(status: number) {
        this.res.statusCode = status;
    }

    redirect(url: string) {
        this.res.statusCode = 302;
        this.res.setHeader('Location', url || '/');
    }

    append(header: ResponseHeaders, value: string | string[] | number | any) {
        this.res.setHeader(header, value);
    }

    get raw(): ServerResponse {
        return this.res;
    }

    cookie(options: CookieOptions) {
        this.res.setHeader(
            'Set-Cookie',
            cookie.serialize(options.name, options.value, {
                ...(options as any),
            })
        );
    }

    execute() {
        this.res.end();
    }
}
