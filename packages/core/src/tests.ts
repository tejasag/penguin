import { Module } from './decorators/module';
import { Route } from './decorators/route';
import { Event } from './decorators/event';
import { BaseModule } from './module';

@Module({
    prefix: 'test',
})
export class Controller extends BaseModule {
    @Route({ method: 'post' })
    async hello(ctx: any) {
        const body = ctx.req.body;
        ctx.res.json(body);
    }

    @Route({ endpoint: 'jesus', method: 'get' })
    async jesus(ctx: any) {
        ctx.res.json({ jesus: 'christ' });
    }

    @Route({ endpoint: ':id/', method: 'get' })
    async levi(ctx: any) {
        console.log(ctx.req.params);
        ctx.res.json({ levi: 'levi er sexy', params: { ...ctx.req.params } });
    }

    @Event({ name: 'uwu' })
    async coco(ctx: any) {
        ctx.websocket.send(JSON.stringify({ uwu: 'uwu' }));
    }

    @Event({ name: 'owo' })
    async banana(ctx: any) {
        ctx.websocket.send(JSON.stringify({ uwu: 'uwu' }));
    }
}

@Module({
    prefix: 'test2',
})
export class Controller2 extends BaseModule {
    @Route({ method: 'post' })
    async hello(ctx: any) {
        const body = ctx.req.body;
        ctx.res.json(body);
    }
}
