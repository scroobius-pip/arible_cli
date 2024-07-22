import { readFileSync } from 'fs'
import sections from 'sections'
interface Texts {
    shortDescription: string
    description: string
    title: string
    dollarCost?: number
    tags?: number[]
}

export const getDescriptionTexts = (file_path: string): Texts => {
    const contents = readFileSync(file_path, {
        encoding: 'utf8',
        flag: 'r'
    })

    const obj = sections.parse(contents) as {
        sections: Array<{
            title: string,
            body: string,
            heading: string,
            string: string
        }>
    }

    return obj.sections.reduce((texts, currentSection) => {
        switch (currentSection.title.toLowerCase().replace('_', ' ')) {
            case 'app name':
                return {
                    ...texts,
                    title: currentSection.body.trim()
                }
            case 'cost dollars':
                return {
                    ...texts,
                    dollarCost: parseFloat(currentSection.body.trim())
                }
            case 'short description':
                return {
                    ...texts,
                    shortDescription: currentSection.body.trim()
                }
            case 'description':
                return {
                    ...texts,
                    description: currentSection.body
                }
            case 'tags':
                return {
                    ...texts,
                    tags: currentSection.body.split(',').map(parseInt).filter(Boolean)
                }
            default:
                // Assume it's part of description, also use the heading
                return {
                    ...texts,
                    description: `${texts['description'] ?? ''}${currentSection.string}`
                }
        }
    }, {
        shortDescription: '',
        description: '',
        title: '',

    })
}