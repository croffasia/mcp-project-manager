import { z } from 'zod'

import { Idea, Priority, TaskStatus } from '../types.js'
import { BaseTool, ToolResult } from './base.js'

const createIdeaSchema = z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
})

/**
 * Tool for creating new high-level feature ideas that can contain multiple epics
 */
export class CreateIdeaTool extends BaseTool {
    /**
     * Creates a new instance of CreateIdeaTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'create_idea'
    }

    /**
     * Returns the description of the tool
     * @returns The tool description
     */
    getDescription(): string {
        return 'Create a new high-level feature idea that can contain multiple epics'
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Title of the idea' },
                description: {
                    type: 'string',
                    description: 'Description of the idea',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Priority of the idea',
                },
            },
            required: ['title', 'description'],
        }
    }

    /**
     * Executes the idea creation process
     * @param args - The tool arguments containing title, description, and optional priority
     * @returns The creation result with idea details and next steps
     */
    async execute(args: any): Promise<ToolResult> {
        // Check approval requirement first
        this.validateApproval(args)

        const validatedArgs = this.validate(createIdeaSchema, args)
        const storage = await this.getStorage()

        const idea: Idea = {
            id: await storage.getNextIdeaId(),
            title: validatedArgs.title,
            description: validatedArgs.description,
            status: 'pending' as TaskStatus,
            priority: (validatedArgs.priority as Priority) || 'medium',
            createdAt: new Date(),
            updatedAt: new Date(),
            epics: [],
        }

        await storage.saveIdea(idea)

        const responseText = `[OK] Idea created successfully!

[IDEA] ${idea.title}
├─ ID: \`${idea.id}\`
├─ Status: [WAIT] ${idea.status}
├─ Created: ${idea.createdAt.toLocaleDateString()}
└─ Description: ${idea.description}`
        const nextSteps = `

[START] Recommended next steps:
1. Break down into epics: \`pm create epic "${idea.title} - Phase 1"\`
2. Add more epics: \`pm create epic "${idea.title} - Phase 2"\`
3. View your ideas: \`pm list ideas\`
4. Get next task: \`pm next\`

[TIP] Pro tip: Break large ideas into 2-4 epics for better organization!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText + nextSteps,
                },
            ],
            metadata: {
                entityType: 'idea',
                entityId: idea.id,
                entityStatus: idea.status,
                entityPriority: idea.priority,
                operation: 'create',
                operationSuccess: true,
                suggestedCommands: [
                    `pm create epic "${idea.title} - Phase 1"`,
                    `pm create epic "${idea.title} - Phase 2"`,
                    `pm list ideas`,
                    `pm next`,
                ],
            },
        }
    }
}
