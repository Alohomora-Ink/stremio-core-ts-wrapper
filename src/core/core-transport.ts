import Bridge from "@stremio/stremio-core-web/bridge";
import EventEmitter from "eventemitter3";

export class CoreTransport {
    private worker: Worker | null = null;
    private bridge: any = null;
    public events = new EventEmitter();

    constructor(private config: { appVersion: string; shellVersion: string }) { }

    public async init(): Promise<void> {
        if (typeof window === "undefined") return;
        this.destroy();
        this.worker = new Worker("/worker.js");
        this.bridge = new Bridge(window, this.worker);
        (window as any).onCoreEvent = ({ name, args }: { name: string; args: any }) => {
            console.log(`[CoreTransport] ⬅️ Event: ${name}`, args);
            this.events.emit(name, args);
        };
        try {
            await this.bridge.call(["init"], [this.config]);
            console.log("✅ CoreTransport initialized via Worker");
        } catch (error) {
            console.error("❌ CoreTransport init failed:", error);
            throw error;
        }
    }

    public destroy() {
        if (this.worker) {
            console.log("🛑 Terminating Stremio Core Worker");
            this.worker.terminate();
            this.worker = null;
        }
        this.events.removeAllListeners();
    }

    public async dispatch(action: any, modelField?: string) {
        if (!this.bridge) throw new Error("Bridge not initialized");
        return this.bridge.call(["dispatch"], [action, modelField, window.location.hash]);
    }

    public async getState(modelField: string) {
        if (!this.bridge) throw new Error("Bridge not initialized");
        return this.bridge.call(["getState"], [modelField]);
    }

    // this is not doing anyting right now i tested nothign happens
    // public async decodeStream(stream: any) {
    //     if (!this.bridge) throw new Error("Bridge not initialized");
    //     return this.bridge.call(["decodeStream"], [stream]);
    // }

    public async analytics(event: any) {
        if (!this.bridge) throw new Error("Bridge not initialized");
        return this.bridge.call(["analytics"], [event, window.location.hash]);
    }
}