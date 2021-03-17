export type OrmDatabases = "psql" | "cassandra";
export interface OrmCredentials {
    name: string;
    password: string;
    username: string;
}

export interface OrmOptions {
    type: OrmDatabases;
    credentials: OrmCredentials;
}
