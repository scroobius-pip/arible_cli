import { Client, getUploadUrls } from '../api';
import fetch from 'node-fetch-native';

export const uploadFiles = async (filePaths: string[], client: Client): Promise<string[]> => {
    const exts = filePaths.filter(Boolean).map(paths => paths.split('.').pop() ?? '').filter(Boolean)
    const uploadUrls = (await getUploadUrls(client, exts))
    if (uploadUrls.error) {
        const errorMessage = `Failed To Get Upload URLs: ${uploadUrls.error}`
        throw errorMessage
    }




}

const getFileNameFromSignedUrl = (signedUrl: string) => {
    let fileName = signedUrl.split('?')[0].split('/').pop()
    return `https://s.arible.co/${fileName}`
}

const uploadFile = async (buffer: Buffer, name: string, uploadUrl: string) => {

    const result = (await fetch(uploadUrl, {
        method: 'PUT',
        body: buffer
    }))

    if (!result.ok) {
        throw new Error(`Failed to upload ${name}`)
    }
}