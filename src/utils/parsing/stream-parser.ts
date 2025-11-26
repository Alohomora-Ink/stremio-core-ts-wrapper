import type { Stream } from "../../types/models/stream";
import type { ParsedStream, StreamTags } from "../../types/parsed/parsed-stream";

export class StreamParser {
    // --- REGEX PATTERNS (Same as before) ---
    private static PATTERNS = {
        "4k": /\b(4k|2160p|uhd)\b/i,
        "1080p": /\b(1080p|fhd)\b/i,
        "720p": /\b(720p|hd)\b/i,
        "480p": /\b(480p|sd)\b/i,
        "Cam": /\b(cam|hdcam|ts|tc)\b/i,
        "Remux": /\b(remux)\b/i,
        "Bluray": /\b(bluray|bdrip|brrip|bd)\b/i,
        "Web": /\b(web-dl|webrip|web)\b/i,
        "HDTV": /\b(hdtv)\b/i,
        "DVD": /\b(dvd|dvdrip)\b/i,
        "HEVC": /\b(hevc)\b/i,
        "x265": /\b(x265)\b/i,
        "x264": /\b(x264)\b/i,
        "AVC": /\b(avc)\b/i,
        "10bit": /\b(10.?bit)\b/i,
        "3D": /\b(3d|sbs|hsbs)\b/i,
        "DV": /\b(dv|dolby.?vision)\b/i,
        "HDR10+": /\b(hdr10\+)\b/i,
        "HDR": /\b(hdr)\b/i,
        "Atmos": /\b(atmos)\b/i,
        "TrueHD": /\b(truehd)\b/i,
        "DTS-HD": /\b(dts.?hd)\b/i,
        "DTS": /\b(dts)\b/i,
        "DD+": /\b(dd\+|ddp|eac3)\b/i,
        "5.1": /\b(5\.1)\b/i,
        "7.1": /\b(7\.1)\b/i,
        "AAC": /\b(aac)\b/i,
        "Dubbed": /\b(dubbed|dual.?audio|multi.?audio)\b/i,
        "Eng": /\b(eng|english)\b/i,
        "Ita": /\b(ita|italian)\b/i,
        "Rus": /\b(rus|russian)\b/i,
        "Fre": /\b(fre|fra|french|vff)\b/i,
        "Ger": /\b(ger|german)\b/i,
        "Spa": /\b(spa|spanish)\b/i,
        "Hin": /\b(hin|hindi)\b/i,
        "Jpn": /\b(jpn|japanese)\b/i,
        "Por": /\b(por|portuguese)\b/i,
        "Lat": /\b(lat|latino)\b/i,
    };

    static parseStreams(streams: Stream[]): ParsedStream[] {
        // 1. Initial Parse
        const parsed = streams.map(s => this.parseSingle(s));

        // 2. Deduplicate by Content Fingerprint
        // We use a "fingerprint" to detect identical content, but we don't use this as the final Key.
        const uniqueMap = new Map<string, ParsedStream>();

        parsed.forEach(p => {
            // Fingerprint = Addon + Hash + FileIdx
            // This ensures we don't show the exact same file twice.
            if (!uniqueMap.has(p._parsed.uniqueHash)) {
                uniqueMap.set(p._parsed.uniqueHash, p);
            }
        });

        const uniqueStreams = Array.from(uniqueMap.values());

        // 3. Generate React-Safe Keys
        // Even after deduplication, if our hash logic has a flaw, React crashes.
        // We will force uniqueness by appending a counter to any collision.
        const finalStreams: ParsedStream[] = [];
        const keyCounts = new Map<string, number>();

        uniqueStreams.forEach(stream => {
            let key = stream._parsed.uniqueHash;

            // If this key has been seen in this specific render pass, increment it
            if (keyCounts.has(key)) {
                const count = keyCounts.get(key)! + 1;
                keyCounts.set(key, count);
                key = `${key}_${count}`; // e.g., "addon_hash_0_slug_1"
            } else {
                keyCounts.set(key, 0);
            }

            // Re-assign the truly unique key back to the object
            stream._parsed.uniqueHash = key;
            finalStreams.push(stream);
        });

        return finalStreams.sort((a, b) => b._parsed.score - a._parsed.score);
    }

    private static parseSingle(stream: Stream): ParsedStream {
        const binge = stream.behaviorHints?.bingeGroup || "";
        const rawTitle = stream.title || "";
        const cleanName = stream.name || "";
        const fullText = `${binge} ${rawTitle} ${cleanName}`.toLowerCase();

        const tags: StreamTags = {
            quality: this.extractQuality(fullText),
            source: this.extractSource(fullText),
            codec: this.extractMatches(fullText, ["HEVC", "x265", "x264", "AVC", "10bit", "3D"]),
            audio: this.extractMatches(fullText, ["Atmos", "TrueHD", "DTS-HD", "DTS", "DD+", "5.1", "7.1", "Dubbed"]),
            hdr: this.extractMatches(fullText, ["DV", "HDR10+", "HDR"]),
            languages: this.extractLanguages(fullText),
        };

        const meta = this.extractMeta(rawTitle);
        const filename = stream.behaviorHints?.filename || rawTitle.split('\n')[0] || "Unknown";
        const score = this.calculateScore(tags, meta.seeds, meta.size);

        // --- FINGERPRINT GENERATION ---
        const addonId = (stream as any)._sourceAddon || "unknown";
        const baseHash = stream.infoHash || stream.url || "nohash";
        const fileIdx = stream.fileIdx !== undefined ? stream.fileIdx : "main";
        // Slugify title to differentiate identical hashes with different filenames
        const titleSlug = filename.substring(0, 15).replace(/[^a-z0-9]/gi, '');

        // Base Fingerprint
        const uniqueHash = `${addonId}_${baseHash}_${fileIdx}_${titleSlug}`;

        return {
            ...stream,
            _parsed: {
                filename,
                tags,
                seeders: meta.seeds,
                size: meta.size,
                sizeDisplay: meta.sizeDisplay,
                provider: meta.provider,
                uniqueHash,
                score
            }
        };
    }

    // ... (Extract methods remain identical to previous version)
    private static extractQuality(text: string): string | null {
        if (this.PATTERNS["4k"].test(text)) return "4k";
        if (this.PATTERNS["1080p"].test(text)) return "1080p";
        if (this.PATTERNS["720p"].test(text)) return "720p";
        if (this.PATTERNS["480p"].test(text)) return "480p";
        if (this.PATTERNS["Cam"].test(text)) return "Cam";
        return null;
    }

    private static extractSource(text: string): string | null {
        if (this.PATTERNS["Remux"].test(text)) return "Remux";
        if (this.PATTERNS["Bluray"].test(text)) return "BluRay";
        if (this.PATTERNS["Web"].test(text)) return "WEB-DL";
        if (this.PATTERNS["HDTV"].test(text)) return "HDTV";
        if (this.PATTERNS["DVD"].test(text)) return "DVD";
        return null;
    }

    private static extractMatches(text: string, keys: string[]): string[] {
        const matches: string[] = [];
        keys.forEach(key => {
            if (this.PATTERNS[key as keyof typeof this.PATTERNS]?.test(text)) {
                matches.push(key);
            }
        });
        return matches;
    }

    private static extractLanguages(text: string): string[] {
        const langs: string[] = [];
        const map: Record<string, string> = {
            "Eng": "English", "Ita": "Italian", "Rus": "Russian",
            "Fre": "French", "Ger": "German", "Spa": "Spanish",
            "Hin": "Hindi", "Jpn": "Japanese", "Por": "Portuguese",
            "Lat": "Latino"
        };
        Object.keys(map).forEach(key => {
            if (this.PATTERNS[key as keyof typeof this.PATTERNS]?.test(text)) {
                langs.push(map[key]);
            }
        });
        return langs;
    }

    private static extractMeta(title: string) {
        const seedsMatch = title.match(/👤 ?(\d+)/);
        const sizeMatch = title.match(/💾 ?(\d+(\.\d+)?) ?([KMG]B)/i);
        const provMatch = title.match(/⚙️ ?(.+)/);

        const seeds = seedsMatch ? parseInt(seedsMatch[1]) : 0;
        let size = 0;
        let sizeDisplay = "";

        if (sizeMatch) {
            sizeDisplay = sizeMatch[0].replace('💾', '').trim();
            const val = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[3].toUpperCase();
            if (unit === 'GB') size = val * 1024 * 1024 * 1024;
            else if (unit === 'MB') size = val * 1024 * 1024;
        }

        let provider = "Unknown";
        if (provMatch) {
            provider = provMatch[1].split('\n')[0].trim();
        }

        return { seeds, size, sizeDisplay, provider };
    }

    private static calculateScore(tags: StreamTags, seeds: number, size: number): number {
        let score = 0;
        if (tags.quality === '4k') score += 5000;
        if (tags.quality === '1080p') score += 3000;
        if (tags.quality === '720p') score += 1000;
        if (tags.source === 'Remux') score += 500;
        if (tags.source === 'BluRay') score += 400;
        if (tags.source === 'WEB-DL') score += 300;
        if (tags.hdr.includes('DV')) score += 200;
        if (tags.hdr.includes('HDR')) score += 100;
        if (tags.audio.includes('Atmos')) score += 100;
        score += Math.log(seeds + 1) * 50;
        score += Math.min(size / (1024 * 1024 * 1024), 50) * 20;
        return score;
    }
}