export const logger = {
    info: (message: string, ...args: any[]) => {
        console.log(message, ...args);
        window.desktop?.log?.info(message, ...args);
    },
    warn: (message: string, ...args: any[]) => {
        console.warn(message, ...args);
        window.desktop?.log?.warn(message, ...args);
    },
    error: (message: string, ...args: any[]) => {
        console.error(message, ...args);
        window.desktop?.log?.error(message, ...args);
    },
    debug: (message: string, ...args: any[]) => {
        console.debug(message, ...args);
        window.desktop?.log?.debug(message, ...args);
    }
};
