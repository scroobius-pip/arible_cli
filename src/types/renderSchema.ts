
export interface RenderSchema {
    title: string
    description: string
    endpoint?: string
    fields: Field[]
}

export interface Field {
    name: string
    description?: string
    title?: string
    value?: any
    defaultValue?: any
    errorMessage?: string
    type: FieldType
    max?: number
    min?: number
}

export interface Text extends Field {
    value?: string
    [key: string]: any
}

export interface File extends Field {
    value?: string[]
    mimeTypes?: string[]
    disableDelete?: boolean

}

export interface Switch extends Field {
    value?: boolean
}

export interface Option extends Field {
    value?: any[]
    items?: OptionItem[]
}

export interface NumberInput extends Field {
    value?: number
    slider_step?: number
}

export interface Progress extends Field {
    value?: number
}

export interface Image extends Field {
    value?: string[]
}

export interface PDF extends Field {
    value?: string[]
}

interface OptionItem {
    title: string;
    description: string;
    value: string;
    previewImage?: string;
}

export type FieldType = 'Text' | 'File' | 'FileOutput' | 'Constant' | 'Number' | 'Switch' | 'Image' | 'Option' | 'Progress' | 'PDF' | '_'
export const STATIC_FIELDS = ['_', 'Constant', 'Progress', 'PDF', 'FileOutput', 'Image']
