declare module '@stremio/stremio-core-web/bridge' {
    export default class Bridge {
        constructor(globalScope: any, worker: Worker);
        call(path: string[], args: any[]): Promise<any>;
    }
}