import chalk from 'chalk';

interface SuccessOptions {
    time: number;
    method: string;
    endpoint: string;
    description?: string;
}

export class Logger {
    static success(options: SuccessOptions) {
        console.log(
            `${chalk.magenta(options.time, 'ms')} / ${chalk.blueBright(
                options.method
            )} / ${chalk.blue(options.endpoint)} ${
                options.description ? `/ ${options.description}` : ''
            }`
        );
    }
}
