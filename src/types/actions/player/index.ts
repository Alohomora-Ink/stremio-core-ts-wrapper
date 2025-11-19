export type ActionPlayer =
    | { UpdateStats: { hash: string; size: number } }
    | { TimeChanged: { time: number; duration: number; device: string } }
    | { Ended: { time: number; duration: number; device: string } }
    | "Paused"
    | "Playing";