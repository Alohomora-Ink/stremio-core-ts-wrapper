export interface StreamingServerSettings {
    appPath?: string;
    cacheRoot?: string;
    serverVersion?: string;
    cacheSize?: number | null;
    btMaxConnections?: number;
    btHandshakeTimeout?: number;
    btHandshakeTimeoutHard?: number;
    btRequestTimeout?: number;
    btDownloadSpeedSoftLimit?: number;
    btDownloadSpeedHardLimit?: number;
    btMinPeersForStable?: number;
}

export type ActionStreamingServer =
    | "Reload"
    | { UpdateSettings: StreamingServerSettings };