import 'dotenv/config'
import { createApp, createEmailToken, EAppInput, getMe, responseCallback, verifyEmailToken } from './api';
import { delay, Listr, ListrDefaultRendererLogLevels } from 'listr2';
import { DEFAULT_APP_DIR_PATH, jwtValid, Project } from './project';
import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer';
import { getClient } from './api/client';
import { parseArgs } from 'util';
import path from 'path';
import { getDescriptionTexts } from './app/description';
import { readFile } from 'fs/promises';
import { RenderSchema } from './types/renderSchema';
import { glob } from 'glob';
import { uploadFiles } from './app/previews';


interface Ctx {
    project: Project
    appUrl?: string
    email?: string
    appInput: EAppInput
}

const entry = async () => {

    const { positionals } = parseArgs({
        allowPositionals: true,
    })
    const visible = positionals.includes('publish')
    const requestAdmin = positionals.includes('approve')
    const defaultAppInput = { description: {}, visible } as EAppInput

    const tasks = new Listr<Ctx>(
        [

            {
                title: 'Authenticating',
                async task(ctx, task) {
                    if (ctx.project.token) {
                        task.output = 'Retrieving your profile'
                        const client = getClient(ctx.project.token)
                        const { error, data } = await getMe(client)

                        if (data && !error) {
                            task.skip("You're in.")
                            return
                        }
                    }

                    return task.newListr([
                        {
                            title: `Send Verification Code`,
                            async task(_, task) {
                                const email = await task.prompt(ListrEnquirerPromptAdapter).run<string>({
                                    type: 'Input',
                                    message: "What's your email ?",
                                    initial: "me@me.com",
                                    required: true
                                })
                                const client = getClient()
                                const { error } = await createEmailToken(client, email)
                                if (error) {
                                    throw new Error(error)
                                }
                                task.output = `Success: Check ${email} for a verification code`
                                ctx.email = email
                            },
                            exitOnError: true,
                            retry: 3
                        },
                        {
                            title: `Verify Code`,

                            async task(ctx, task) {
                                if (!ctx.email) throw new Error('Email where art thou ?')
                                const client = getClient()
                                const token = await task.prompt(ListrEnquirerPromptAdapter).run<string>({
                                    type: 'Password',
                                    message: "What's the verification code ?",
                                    required: true
                                })
                                const { data, error } = await verifyEmailToken(client, ctx.email, token)
                                if (!data || error) {
                                    throw new Error('Invalid verification code')
                                }
                                ctx.project.token = data
                                task.output = `Login Success!`
                                await delay(500)
                            }
                        }
                    ], { concurrent: false })
                }
            },
            {
                title: 'Retrieving App Info',
                async task(ctx, task) {


                    return task.newListr(
                        [
                            {
                                title: 'Retrieving Arible Environment Variables',
                                async task(ctx, task) {
                                    const authorization = process.env.ARIBLE_APP_AUTH
                                    const allowedDomain = process.env.ARIBLE_ALLOWED_DOMAIN

                                    if (authorization) {
                                        task.output = `ARIBLE_APP_AUTH found: ${authorization.slice(0, 3)}...${authorization.slice(-3)}`
                                    }

                                    if (allowedDomain) {
                                        task.output = `ARIBLE_ALLOWED_DOMAIN found: ${allowedDomain}`
                                    }

                                    await delay(1000)

                                    ctx.appInput = {
                                        ...ctx.appInput,
                                        authorization,
                                        allowed_domain: allowedDomain
                                    }
                                }

                            },
                            {
                                title: 'Reading description.md',
                                async task(ctx, task) {
                                    const DESCRIPTION_MARKDOWN_PATH = path.join(DEFAULT_APP_DIR_PATH, 'description.md')
                                    const { shortDescription, description, title, dollarCost } = getDescriptionTexts(DESCRIPTION_MARKDOWN_PATH)
                                    task.output = `${title} - Great Name!`
                                    ctx.appInput = {
                                        ...ctx.appInput,
                                        name: title,
                                        description: {
                                            ...ctx.appInput.description,
                                            description,
                                            short_description: shortDescription,
                                            title
                                        },
                                        dollar_cost: dollarCost
                                    }
                                }
                            },
                            {
                                title: 'Parsing schema.json',
                                async task(ctx, task) {
                                    const SCHEMA_PATH = path.join(DEFAULT_APP_DIR_PATH, 'schema.json')
                                    const jsonContent = await readFile(SCHEMA_PATH, {
                                        encoding: 'utf8',
                                        flag: 'r'
                                    })
                                    const jsonSchema = JSON.parse(jsonContent) as RenderSchema

                                    ctx.appInput = {
                                        ...ctx.appInput,
                                        input_schema: jsonSchema
                                    }
                                }
                            },
                            {
                                title: 'Uploading Assets',
                                async task(ctx, task) {


                                    const [previewPaths, iconPath] = await Promise.all([
                                        glob(path.join(DEFAULT_APP_DIR_PATH, 'preview*.{jpg,jpeg,png,mp3,pdf}')),
                                        glob(path.join(DEFAULT_APP_DIR_PATH, 'icon*.{jpg,jpeg,png,svg}')).then(f => f.pop())
                                    ])

                                    const client = getClient(ctx.project.token)

                                    return task.newListr([
                                        {
                                            title: 'Uploading icon',
                                            async task(ctx, task) {
                                                if (!iconPath) {
                                                    task.skip('Icon not found, skipping')
                                                    return
                                                }
                                                const iconUrl = (await uploadFiles([iconPath], client)).pop()

                                                ctx.appInput = {
                                                    ...ctx.appInput,
                                                    description: {
                                                        ...ctx.appInput.description,
                                                        icon_url: iconUrl
                                                    }
                                                }
                                            },
                                            retry: 3
                                        },
                                        {
                                            title: 'Uploading previews',
                                            async task(ctx, task) {
                                                if (!previewPaths.length) {
                                                    task.skip('Preview files not found, skipping')
                                                    return
                                                }
                                                const previews = (await uploadFiles(previewPaths, client))

                                                ctx.appInput = {
                                                    ...ctx.appInput,
                                                    description: {
                                                        ...ctx.appInput.description,
                                                        previews
                                                    }
                                                }

                                            },
                                            retry: 3
                                        }
                                    ], { concurrent: true })

                                }
                            }

                        ],
                        {
                            concurrent: true,
                        })

                }
            },
            {

                async task(ctx, task) {
                    task.title = `${ctx.project.appId ? 'Submitting App Update' : 'Creating App'}: ${ctx.appInput.name}`
                    if (!visible) {
                        task.output = `App will not be accessible publicly, set it public with "arible publish"`
                    }
                    ctx.appInput.visible = visible
                    const client = getClient(ctx.project.token)
                    task.output = 'Submitting App'
                    const { data: app, error } = await createApp(client, ctx.appInput, ctx.project.appId)
                    if (!app || error) {
                        throw new Error(`Failed to Create App: ${error}`)
                    }
                    ctx.project.appId = app.id
                    ctx.appUrl = `https://www.arible.co/app/${app.slug}`
                }
            }
        ],
        {
            concurrent: false, ctx: {
                project: new Project(),
                appInput: defaultAppInput
            }
        }
    )

    const ctx = await tasks.run()
    console.log(`Your app url: ${ctx.appUrl}`)
}


await entry()