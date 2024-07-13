
export interface Deployment {
    createdAt: number
    updatedAt: number
    id: string
    name: string
    status: 'deploying' | 'success' | 'error'
    error?: string
}