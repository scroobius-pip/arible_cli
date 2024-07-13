import { RenderSchema } from './renderSchema'

export interface App {
    id: string
    slug: string
    owner: {
        id: string
        name: string
    }
    name: string
    description: string
    shortDescription: string
    iconUrl?: string
    inputSchema: RenderSchema
    rating?: {
        average: number
        count: number
    }
    creditCost: number
    backgroundImage: string
    previews: Preview[],
    lastModified: number
    visible: boolean
}

export interface Preview {
    url: string
    type: 'image' | 'video' | 'audio' | 'document'
}
