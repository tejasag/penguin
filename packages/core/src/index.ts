import { Mount } from "./mount";
import gql from "graphql-tag";
import { inputFieldToFieldConfig, makeExecutableSchema } from "graphql-tools";

const typeDefs = gql`
    type Response {
        ok: Boolean!
        message: String!
        description: String!
    }

    type Query {
        hello(message: String!): Response!
    }
`;

const resolvers = {
    Response: {
        description: (parent: any) => {
            return `${parent.message} is hopefully a verb`;
        },
    },
    Query: {
        hello: (_: any, input: any) => {
            return {
                ok: true,
                message: input.message,
            };
        },
    },
};

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

const app = new Mount({
    path: "/graphql",
    graphql: {
        schema,
        context: ({ ws, http }) => ({ ws, http }),
    },
});

app.listen(9000, () => console.log("Server started on port 5000"));
