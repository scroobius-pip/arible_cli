import { program } from 'commander';
import ConfigStore from 'conf'

import 'dotenv/config'

import { getAppInput } from './app';
import { getClient } from './api/client';
import { jwtDecode } from 'jwt-decode';
import { createApp, ErrorType, responseCallback } from './api';

const showLoginPrompt = async (): Promise<string> => {
    //enter your email
    // POST: /auth/email?email=<EMAIL>
    //we've sent a verification token to your email
    //type your verification token here
    /// POST /auth/verify?email=<EMAIL>&token=<TOKEN>
    /// login successful
    /// RETURN authorization from body
    return 'ß'
}

interface Store {
    token?: string
    appId?: string
}

const DEFAULT_APP_DIR_PATH = "./arible_assets";
class Project {
    store: ConfigStore<Store>
    constructor() {
        const store = new ConfigStore<Store>({
            projectName: 'arible',
            cwd: './.arible',
            configName: 'project'
        })

        this.store = store
    }


    public set token(v: string) {
        this.store.set('token', v)
    }

    public set appId(appId: string) {
        this.store.set('appId', appId)
    }


    public get token(): string | undefined {
        const token = this.store.get('token')
        if (token && jwtValid(token)) {
            return token
        }
    }

    public get appId(): string | undefined {
        return this.store.get('appId')
    }

    public async login(): Promise<Project> {
        const newAuthToken = await showLoginPrompt()
        this.store.set('token', newAuthToken)
        return this
    }

    public async requestAdminApproval() {
        if (!this.appId) {
            console.error('App Not Submitted, Submit this App, and then request approval')
            process.exit()
        }

    }

    public async submitApp(app_dir_path = DEFAULT_APP_DIR_PATH, visible = false) {
        if (visible) {
            console.info('This app would be immediately visible')
        }

        if (this.token) {
            const client = getClient(this.token)
            const appInput = await getAppInput(app_dir_path, client)
            const result = await createApp(client, { ...appInput, visible }, this.appId)
            responseCallback(result, (app) => {
                this.appId = app.id
            }, (error) => {
                if (error === ErrorType.Auth) {
                    (await this.login()).submitApp(app_dir_path, visible)
                } else {
                    console.error(error)
                }
            })
        } else {
            //you're not authenticated, we'll have to log you in.
            (await this.login()).submitApp(app_dir_path, visible)
        }
    }
}


const jwtValid = (token: string): boolean {
    const { exp } = jwtDecode(token)
    const currentTime = new Date().getTime() / 1000
    return !!exp && currentTime > exp
}



const entry = async () => {
    const project = new Project()
    const isVisible = false;
    await project.submitApp(DEFAULT_APP_DIR_PATH, isVisible)
}



await entry()