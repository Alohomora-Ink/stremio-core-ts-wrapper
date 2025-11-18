import type { MetaItem } from '../types/common/meta-item';
import type { AddonDescriptor } from '../types/common/addon';
import type { Action, ActionLoad } from '../types/actions';

/**
 * Type-safe action builder
 * Constructs JSON strings for dispatching to Stremio Core
 */
export class ActionBuilder {
    /**
     * Load a model
     */
    static load(model: ActionLoad): string {
        return JSON.stringify({ Load: model });
    }

    /**
     * Unload current model
     */
    static unload(): string {
        return JSON.stringify('Unload');
    }

    /**
     * Add item to library
     */
    static addToLibrary(item: MetaItem): string {
        return JSON.stringify({
            Ctx: { AddToLibrary: item }
        });
    }

    /**
     * Remove item from library by ID
     */
    static removeFromLibrary(id: string): string {
        return JSON.stringify({
            Ctx: { RemoveFromLibrary: id }
        });
    }

    /**
     * Toggle notifications for a library item
     */
    static toggleNotifications(id: string): string {
        return JSON.stringify({
            Ctx: { ToggleNotifications: id }
        });
    }

    /**
     * Install an addon
     */
    static installAddon(descriptor: AddonDescriptor): string {
        return JSON.stringify({
            Ctx: { InstallAddon: descriptor }
        });
    }

    /**
     * Uninstall addon by transport URL
     */
    static uninstallAddon(transportUrl: string): string {
        return JSON.stringify({
            Ctx: { UninstallAddon: transportUrl }
        });
    }

    /**
     * Login
     */
    static login(email: string, password: string): string {
        return JSON.stringify({
            Ctx: {
                Authenticate: {
                    type: 'Login',
                    email,
                    password
                }
            }
        });
    }

    /**
     * Logout
     */
    static logout(): string {
        return JSON.stringify({
            Ctx: { Logout: null }
        });
    }

    /**
     * Load meta details for specific content
     */
    static loadMetaDetails(type: string, id: string): string {
        return JSON.stringify({
            Load: {
                MetaDetails: { type, id }
            }
        });
    }

    /**
     * Load streams for specific content
     */
    static loadStreams(type: string, id: string): string {
        return JSON.stringify({
            Load: {
                Streams: { type, id }
            }
        });
    }
}