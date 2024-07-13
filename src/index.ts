import 'dotenv/config'
import { createEmailToken, responseCallback, verifyEmailToken } from './api';
import { delay, Listr } from 'listr2';
import { DEFAULT_APP_DIR_PATH, jwtValid, Project } from './project';
import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer';
import { getClient } from './api/client';
import { parseArgs } from 'util';


interface Ctx {
    project: Project
    email?: string
}
const entry = async () => {

    // const project = new Project()
    // const isVisible = false;
    const { positionals } = parseArgs({
        allowPositionals: true,
    })
    const isVisible = positionals.includes('publish')
    const requestAdmin = positionals.includes('approve')

    const tasks = new Listr<Ctx>(
        [
            {
                title: 'Checking existing project',
                async task(ctx, task) {
                    ctx.project = new Project()
                }
            },
            {
                title: 'Authenticating',
                async task(ctx, task) {
                    if (ctx.project.token) {
                        task.skip("You're in.")
                        return
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
                async task(ctx, task) {
                    task.title = ctx.project.appId ? 'Submitting App Update' : 'Creating App'

                    if (!isVisible) {
                        task.output = `App will not be accessible publicly, set it public with "arible publish"`
                    }

                    await delay(3000)

                    // await ctx.project.submitApp(DEFAULT_APP_DIR_PATH, visible)
                }
            }
        ],
        { concurrent: false }
    )

    await tasks.run()

}



await entry()