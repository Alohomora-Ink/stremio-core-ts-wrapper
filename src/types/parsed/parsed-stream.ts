import type { Stream } from "../models/stream";

// We group tags by category for coloring and filtering
export interface StreamTags {
    quality: string | null;      // 4k, 1080p
    hdr: string[];               // HDR, DV, HDR10+
    audio: string[];             // Atmos, 5.1, 7.1, TrueHD, DTS
    codec: string[];             // HEVC, x265, AV1, 10bit
    source: string | null;       // Bluray, WEB-DL, REMUX, CAM
    languages: string[];         // English, Italian, Russian...
}

export interface ParsedStream extends Stream {
    _parsed: {
        filename: string;
        tags: StreamTags;
        seeders: number;
        size: number; // bytes
        sizeDisplay: string;
        provider: string;
        uniqueHash: string;
        score: number;
    };
}