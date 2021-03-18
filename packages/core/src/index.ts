import 'reflect-metadata';

import { Mount } from './mount';
import gql from 'graphql-tag';
import { makeExecutableSchema } from 'graphql-tools';
import { IncomingMessage, ServerResponse } from 'node:http';
import './tests';
import { generateSnowflake } from './utils/snowflake';
import { Controller, Controller2 } from './tests';

type MyContext = {
    req: IncomingMessage;
    res: ServerResponse;
};

const typeDefs = gql`
    type Response {
        ok: Boolean!
        message: String!
        description: String!
    }

    type Query {
        hello(message: String!): Response!
    }

    type Mutation {
        setValues(message: String!): Response!
    }
`;

const resolvers = {
    Response: {
        description: (parent: any) => {
            return `${parent.message} is hopefully a verb`;
        },
    },
    Query: {
        hello: (_: any, input: any, ctx: MyContext) => {
            return {
                ok: true,
                message: input.message,
            };
        },
    },
    Mutation: {
        setValues: (_: any, input: any) => ({
            ok: true,
            message: input.message,
        }),
    },
};

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

const app = new Mount({
    graphql: {
        path: '/graphql',
        schema,
    },
    app: {
        context: ({ ws, req, res, route }) => ({ ws, req, res, route }),
        modules: [Controller, Controller2],
        prefix: 'api',
    },
    orm: false,
});

app.listen(3000, () => console.log('Server started on port 5000'));
