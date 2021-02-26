import Websocket from "ws";

const myws = new Websocket("http://localhost:9000/graphql", {
    headers: { hey: "Hey" },
});

(async () => {
    const time = "TIME";
    myws.on("open", (ws: any) => {
        console.log("Connection", ws);

        console.time(time);
        myws.send(
            JSON.stringify({
                opcode: 0,
                operation: "Hello",
                data: {
                    body: `
                        query Hello($message: String!) {
                            hello(message: $message) {
                                ok
                               
                            }
                        }
                    `,
                    variables: {
                        message: "Hope",
                    },
                },
            })
        );
    });

    myws.on("message", (result: any) => {
        const data = JSON.parse(result);

        console.log(data.data.result.hello);
        console.timeLog(time);
    });
})();
