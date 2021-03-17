import cluster from 'cluster';

let lastSnowflake: string;
let inc = 0;
const epoch = 1621252800;

export const generateSnowflake = () => {
    const msSince = (new Date().getTime() - epoch)
        .toString(2)
        .padStart(42, '0');

    const pid = process.pid.toString(2).slice(0, 5).padStart(5, '0');
    const wid = (cluster.worker?.id ?? 0)
        .toString(2)
        .slice(0, 5)
        .padStart(5, '0');
    const getInc = (add: number) => (inc + add).toString(2).padStart(12, '0');

    let snowflake = `0b${msSince}${wid}${pid}${getInc(0)}`;
    snowflake === lastSnowflake
        ? (snowflake = `0b${msSince}${wid}${pid}${getInc(1)}`)
        : (inc = 0);

    lastSnowflake = snowflake;
    return parseInt(BigInt(snowflake).toString());
};
