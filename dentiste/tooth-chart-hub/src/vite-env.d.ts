/// <reference types="vite/client" />

interface Window {
    desktop: {
        log: {
            info: (message: string, ...args: any[]) => void;
            warn: (message: string, ...args: any[]) => void;
            error: (message: string, ...args: any[]) => void;
            debug: (message: string, ...args: any[]) => void;
        };
        [key: string]: any; // Allow other properties for now
    };
}

