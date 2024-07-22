import { App } from '../types/app';
import { RenderSchema } from '../types/renderSchema';
import { User } from '../types/user'

interface EUser {
    id: string
    created_at: string
    email: string
    credits?: number
    developer_account?: {
        billing_account?: {
            Stripe?: string
        }
        name: string
        description: string
        icon_url?: string
        image?: string
    }
}


interface EApp {
    id: string
    name: string
    slug: string
    visible: boolean
    owner_id: string
    owner_name: string
    input_schema: string
    description: EAppDescription
    allowed_domain?: string
    stat: EAppStat
    deleted: boolean
    tags?: number[]
}

interface EAppStat {
    created_at: number
    task_count: number
    credit_cost: number
    duration: number

}



interface EAppDescription {
    title: string
    description: string
    short_description: string
    icon_url?: string
    previews?: string[]
}




export interface RequestResult<T> {
    data?: T
    error?: ErrorType
}

export enum ErrorType {
    Unknown = 'Unknown',
    Network = 'Network',
    NotFound = 'NotFound',
    Server = 'Server',
    Auth = 'Auth',
    Credits = 'Credits'
}


export type ClientMapper<T, U> = (data: T) => RequestResult<U>;
export type StreamingClientCallback<T> = (data: T) => void
export type Client = <T, U>(method: string, path: string, mapper?: ClientMapper<T, U>, body?: string,) => Promise<RequestResult<U>>
export type StreamingClient = <T>(method: string, path: string, callback: StreamingClientCallback<T>, error: (message: string) => void, body?: string) => Promise<RequestResult<T>>



export const handleResponse = async <T>(response: Response, isJson = true): Promise<RequestResult<T>> => {
    try {
        if (response.status >= 400) {
            switch (response.status) {
                case 401:
                    return { error: ErrorType.Auth }
                case 402:
                    return { error: ErrorType.Credits }
                case 404:
                    return { error: ErrorType.NotFound }
                default:
                    //@ts-ignore
                    return { error: `Status Code: ${response.status}, ${await response.text()}` }
            }
        }

        const data = isJson ? await response.json() : response.text()

        if (!data.error)
            return { data }

        switch (data.error) {
            case 'NOT_ENOUGH_CREDITS':
                return { error: ErrorType.Credits };
            case 'NOT_SUBSCRIBED':
                return { error: ErrorType.Credits };
            case 'INVALID_TOKEN':
                return { error: ErrorType.Auth };
            default:
                return { error: data.error };
        }
    } catch (error) {
        return {
            error: error
        }
    }
}

export function getMe(client: Client) {
    return client<EUser, User>('GET', 'me', (user) => {
        return {
            data: toUser(user)
        }
    })
}

const getBackgroundImage = (app: EApp) => {
    return app.description.icon_url ?? app.description.previews?.filter(url => getFileTypeFromFormat(getFormatFromUrl(url)) === 'image')?.[0] ?? ''
}

function toUser(user: EUser): User {
    return {
        createdAt: user.created_at,
        credits: user.credits,
        email: user.email,
        id: user.id,
        developerAccount: user.developer_account,
    };
}

function toApp(app: EApp): App {
    return {
        backgroundImage: getBackgroundImage(app),
        creditCost: app.stat.credit_cost,
        description: app.description.description,
        shortDescription: app.description.short_description,
        id: app.id,
        inputSchema: JSON.parse(app.input_schema),
        owner: {
            id: app.owner_id,
            name: app.owner_name
        },
        name: app.name,
        previews: (app.description.previews ?? [])?.map(url => ({
            url,
            type: getFileTypeFromFormat(getFormatFromUrl(url))
        })),
        slug: app.slug,
        iconUrl: app.description.icon_url,
        lastModified: app.stat.created_at,
        visible: app.visible
    }
}

const getFormatFromUrl = (url: string) => url.split('.').pop() as 'png' | 'jpeg' | 'jpg' | 'text' | 'mp3' | 'wav' | 'webm' | 'mp4'
const getFileTypeFromFormat = (format: string): 'image' | 'audio' | 'video' | 'document' => {
    switch (format) {
        case 'png':
        case 'jpeg':
        case 'jpg':
            return 'image'
        case 'mp3':
        case 'wav':
            return 'audio'
        case 'webm':
        case 'mp4':
            return 'video'
        default:
            return 'document'
    }
}


export function getMyApps(client: Client) {
    return client<{ list: EApp[] }, App[]>('GET', 'me/apps', ({ list }) => ({
        data: list.map(toApp)
    }))
}



export function getAllApps(client: Client) {
    return client<{ list: EApp[] }, App[]>('GET', 'app/list', ({ list }) => ({
        data: list.map(toApp)
    }))
}

export function getUploadUrls(client: Client, fileExts: string[], disable_delete = false) {
    return client<string[], string[]>('POST', 'task/upload_url', data => ({ data }), JSON.stringify({ disable_delete, file_exts: fileExts }))
}

export async function createTask(client: StreamingClient, appId: string, input: object, onData: (data: RenderSchema) => void, onError: (message: string) => void) {
    return await client<RenderSchema>('POST', `task/${appId}`, onData, onError, JSON.stringify({
        input
    }))
}

export interface EAppInput {
    input_schema: RenderSchema,
    name: string,
    description: EAppDescription
    dollar_cost?: number
    authorization?: string
    allowed_domain?: string
    visible: boolean
    tags?: number[]
}

export function createApp(client: Client, input: EAppInput, appId?: string) {
    return client<EApp, App>('POST', `app?${appId ? `app_id=${appId}` : ''}`, data => ({ data: toApp(data) }), JSON.stringify(input))
}

export function getAppById(client: Client, appId: string) {
    return client<{ app: EApp }, App>('GET', `app/${appId}`, ({ app }) => ({ data: toApp(app) }))
}

export function getAppBySlug(client: Client, slug: string) {
    return client<{ app: EApp }, App>('GET', `app/slug/${slug}`, ({ app }) => {
        return ({ data: toApp(app) })
    })
}

// export function getStripeDashboard

export function createDeveloper(client: Client, input: { name: string, description: string, icon_url?: string, image?: string }) {
    return client<EUser, User>('POST', 'developer/create', (data) => ({ data: toUser(data) }), JSON.stringify(input))
}

export function getPaymentSession(client: Client, input: { mode: 'payment' | 'subscription', quantity: number, id: string, couponId?: string, trial?: boolean }) {
    const getRefID = () => {
        const refId = (document.cookie.match(/(^| )partnero_partner=([^;]+)/) || [])[2];
        return refId?.length ? refId : null;
    }
    const refId = getRefID()
    const url = `payment/session?mode=${input.mode}&quantity=${input.quantity}&id=${input.id}${refId ? `&ref_id=${refId}` : ''}${input.couponId ? `&coupon_id=${input.couponId}` : ''}${input.trial ? `&trial=true` : ''}`
    return client<{ checkout_session_url: string }, string>('GET', url, (data) => ({ data: data.checkout_session_url }))
}

export function createEmailToken(client: Client, email: string) {
    return client<null, null>('POST', `auth/email?email=${email}`,)
}

export function verifyEmailToken(client: Client, email: string, token: string) {
    return client<{ token: string }, string>('POST', `auth/verify?email=${email}&token=${token}`, (data) => ({ data: data.token }))
}


interface ETaskOutput {
    data: string //base64 encoded
    format: 'png' | 'jpeg' | 'jpg' | 'text'
}

export interface TaskOutput {
    data: string //base64 encoded
    format: 'png' | 'jpeg' | 'jpg' | 'text' | 'mp3' | 'wav' | 'webm' | 'mp4' | 'pdf' | 'txt'
}


type onProgress = (progress: number) => void

export function downloadTaskOutput(output_url: string, onProgress?: onProgress): Promise<TaskOutput[]> {


    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', output_url)
        xhr.responseType = 'json'
        xhr.onprogress = (e) => {
            if (e.lengthComputable) {
                const progress = e.loaded / e.total
                const roundedProgressPercentage = Math.round(progress * 100)
                onProgress?.(roundedProgressPercentage)
            }
        }

        xhr.onload = () => {
            if (xhr.status === 200) {
                resolve(xhr.response as TaskOutput[])
            } else {
                reject(new Error('Failed to download task output'))
            }
        }

        xhr.onabort = () => {
            reject(new Error('Task output download aborted'))
        }

        xhr.onerror = () => {
            reject(new Error('Failed to download task output'))
        }
        xhr.send()

    })
}



export function responseCallback<T, R>(
    requestResult: RequestResult<T>,
    onSuccess: (data: T) => R, onError: (error: ErrorType) => R): R {
    // const { data, error } = requestResult

    if (requestResult.data === undefined || requestResult.error) {
        return onError(requestResult.error || ErrorType.Unknown)
    } else {
        return onSuccess(requestResult.data)
    }
}

