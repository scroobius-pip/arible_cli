import path from 'path'
import { getDescriptionTexts } from './description'
import { globSync as glob, } from 'glob'
import { uploadFiles } from './previews'
import { Client, EAppInput } from '../api'
import { readFileSync } from 'fs'
import { RenderSchema } from '../types/renderSchema'


export const getAppInput = async (app_dir_path: string, client: Client): Promise<EAppInput> => {
    const authorization = process.env.ARIBLE_APP_AUTH
    const allowedDomain = process.env.ARIBLE_ALLOWED_DOMAIN
    //GIVE FEEDBACK THAT AUTHORIZATION AND/OR ALLOWED DOMAINS WHERE FOUND

    const DESCRIPTION_MARKDOWN_PATH = path.join(app_dir_path, 'description.md')
    const SCHEMA_PATH = path.join(app_dir_path, 'abl.json')

    const jsonSchema = JSON.parse(readFileSync(SCHEMA_PATH, {
        encoding: 'utf8',
        flag: 'r'
    })) as RenderSchema

    const PREVIEW_PATHS = glob(path.join(app_dir_path, 'preview*.{jpg,jpeg,png,mp3,pdf}'))
    const ICON_PATH = glob(path.join(app_dir_path, 'icon*.{jpg,jpeg,png,svg}'))
    //GIVE FEEDBACK ON PREVIEWS AND ICONS FOUND

    const { shortDescription, description, title, dollarCost } = getDescriptionTexts(DESCRIPTION_MARKDOWN_PATH)

    const [previewUrls, iconUrl] = await Promise.all([uploadFiles(PREVIEW_PATHS, client), uploadFiles(ICON_PATH, client).then(f => f.pop())])

    return {
        description: {
            description,
            short_description: shortDescription,
            title,
            icon_url: iconUrl,
            previews: previewUrls
        },
        visible: false,
        dollar_cost: dollarCost,
        input_schema: jsonSchema,
        allowed_domain: allowedDomain,
        authorization,
        name: title,
    }
}