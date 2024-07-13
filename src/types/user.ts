export interface User {
    id: string
    createdAt: string
    email: string
    credits?: number
    developerAccount?: DeveloperAccount

}

interface DeveloperAccount {

    billing_account?: {
        Stripe?: string
    }

    name: string,
    description: string,
    icon_url?: string,
    image?: string
}