import ConfigStore from 'conf';
import { jwtDecode } from 'jwt-decode';
import { showLoginPrompt } from '.';
import { createApp, EAppInput, ErrorType } from './api';
import { getClient } from './api/client';
import { getAppInput } from './app';

interface Store {
    token?: string;
    appId?: string;
}
export const DEFAULT_APP_DIR_PATH = "./arible_assets";
export class Project {
    store: ConfigStore<Store>;
    constructor() {
        const store = new ConfigStore<Store>({
            projectName: 'arible',
            cwd: './.arible',
            configName: 'project'
        });

        this.store = store;
    }


    public set token(v: string) {
        this.store.set('token', v);
    }

    public set appId(appId: string) {
        this.store.set('appId', appId);
    }


    public get token(): string | undefined {
        const token = this.store.get('token');
        try {
            if (token && jwtValid(token)) {
                return token;
            }
        } catch (error) {
            this.store.delete('token')
        }
    }

    public get appId(): string | undefined {
        return this.store.get('appId');
    }

}
export const jwtValid = (token: string): boolean => {
    const { exp } = jwtDecode(token);
    const currentTime = new Date().getTime() / 1000;
    return !!exp && currentTime < exp;
};
