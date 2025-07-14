import { BasePrompt } from './base.js'
import { Decompose } from './decompose.js'
import { StartTask } from './start-task.js'

export class PromptRegistry {
    private prompts: Map<string, BasePrompt> = new Map()

    constructor() {
        const promptInstances = [new Decompose(), new StartTask()]

        for (const prompt of promptInstances) {
            this.prompts.set(prompt.getName(), prompt)
        }
    }

    getPrompt(name: string): BasePrompt | undefined {
        return this.prompts.get(name)
    }

    getAllPrompts(): BasePrompt[] {
        return Array.from(this.prompts.values())
    }

    getPromptDefinitions(): Array<{
        name: string
        description: string
        arguments: Array<{
            name: string
            description: string
            required: boolean
        }>
    }> {
        return this.getAllPrompts().map((prompt) => ({
            name: prompt.getName(),
            description: prompt.getDescription(),
            arguments: prompt.getArguments(),
        }))
    }
}
