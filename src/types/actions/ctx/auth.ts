export interface GDPRConsent {
    tos: boolean;
    privacy: boolean;
    marketing: boolean;
    from: string;
}

export type AuthRequest =
    | { type: "Login"; email: string; password: string; facebookId?: string }
    | { type: "Register"; email: string; password: string; gdpr_consent: GDPRConsent }
    | { type: "Googlev2"; token: string };