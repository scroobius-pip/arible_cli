import { readFile } from 'fs/promises';
import { Client, getUploadUrls } from '../api';
import fetch from 'node-fetch-native';

export const uploadFiles = async (filePaths: string[], client: Client): Promise<string[]> => {
    const exts = filePaths.filter(Boolean).map(paths => paths.split('.').pop() ?? '').filter(Boolean)
    const { data: presignedUrls, error } = (await getUploadUrls(client, exts))

    if (!presignedUrls || error) {
        const errorMessage = `Failed To Get Upload URLs: ${error}`
        throw errorMessage
    }

    const fileUploads = presignedUrls.map((url, index) =>
        readFile(filePaths[index]).then((buffer) =>
            uploadFile(buffer, url)
        )
    )

    return Promise.all(fileUploads)
}

const getFileNameFromSignedUrl = (signedUrl: string) => {
    let fileName = signedUrl.split('?')[0].split('/').pop()
    return `https://s.arible.co/${fileName}`
}

const uploadFile = async (buffer: Buffer, uploadUrl: string) => {
    const name = getFileNameFromSignedUrl(uploadUrl)

    const result = (await fetch(uploadUrl, {
        method: 'PUT',
        body: buffer
    }))

    if (!result.ok) {
        throw new Error(`Failed to upload ${name}`)
    }

    return name
}