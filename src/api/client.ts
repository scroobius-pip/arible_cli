import { Client, ClientMapper, ErrorType, handleResponse } from '.';
import fetch from 'node-fetch-native'

const API_ENDPOINT = 'https://api.arible.co'

export const getClient = (token?: string): Client => {
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }

    return async <T, U>(method: string, path: string, mapper?: ClientMapper<T, U>, body?: string) => {
        try {
            const response = await fetch(`${API_ENDPOINT}/${path}`, {
                method,
                body,
                headers,
                cache: 'no-cache',
            })

            if (mapper) {
                return handleResponse<T>(response)
                    .then((data) => data.data ? mapper(data.data) : { error: data.error })
            } else {
                return handleResponse<T>(response, false)
                    .then((data) => ({ data: null } as any))
            }
        } catch (error) {
            return {
                error: error
            }
        }
    }

}

