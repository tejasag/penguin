import Websocket from 'ws';
import ReconnectingWebSocket from 'reconnecting-websocket';
import axios from 'axios';

const ws = new ReconnectingWebSocket('ws://localhost:3000/graphql', [], {
    WebSocket: Websocket,
});

const body = {
    opcode: '0',
    operation: 'Hello',
    data: {
        body: `
            query Hello($message: String!) {
                hello(message: $message) {
                    ok

                }
            }
        `,
        variables: {
            message: 'Hope',
        },
    },
};

const withws = () => {
    ws.addEventListener('open', () => {
        console.log('Connection');
        console.time('time');
        ws.send(JSON.stringify(body));
    });
};

const withRest = async () => {
    console.time('time');
    const data = await axios({
        url: 'http://localhost:7000/graphql',
        method: 'POST',
        data: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer 123',
        },
        withCredentials: true,
    });
    console.timeEnd('time');
    console.log(data.data);
};

const customWsEvent = () => {
    ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ e: 'uwu', data: { jesus: 'christ' } }));
    });
};

// withRest();
customWsEvent();

ws.addEventListener('message', (result: any) => {
    const data = JSON.parse(result.data);
    console.log(data);
});
