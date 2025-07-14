import { z } from 'zod'

import { Epic, Priority, TaskStatus } from '../types.js'
import { BaseTool, ToolResult } from './base.js'

const createEpicSchema = z.object({
    ideaId: z.string(),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
})

/**
 * Tool for creating new epics within ideas to group related tasks together
 */
export class CreateEpicTool extends BaseTool {
    /**
     * Creates a new instance of CreateEpicTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'create_epic'
    }

    /**
     * Returns the description of the tool
     * @returns The tool description
     */
    getDescription(): string {
        return 'Create a new epic within a specific idea - epics group related tasks together'
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                ideaId: {
                    type: 'string',
                    description: 'ID of the parent idea',
                },
                title: { type: 'string', description: 'Title of the epic' },
                description: {
                    type: 'string',
                    description: 'Description of the epic',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Priority of the epic',
                },
            },
            required: ['ideaId', 'title', 'description'],
        }
    }

    /**
     * Executes the epic creation process
     * @param args - The tool arguments containing ideaId, title, description, and optional priority
     * @returns The creation result with epic details and next steps
     */
    async execute(args: any): Promise<ToolResult> {
        // Check approval requirement first
        this.validateApproval(args)

        const validatedArgs = this.validate(createEpicSchema, args)
        const storage = await this.getStorage()

        const idea = await storage.loadIdea(validatedArgs.ideaId)
        if (!idea) {
            throw new Error(`Idea ${validatedArgs.ideaId} not found`)
        }

        const epic: Epic = {
            id: await storage.getNextEpicId(),
            title: validatedArgs.title,
            description: validatedArgs.description,
            status: 'pending' as TaskStatus,
            priority: (validatedArgs.priority as Priority) || 'medium',
            ideaId: validatedArgs.ideaId,
            tasks: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        await storage.saveEpic(epic)

        idea.epics.push(epic)
        await storage.saveIdea(idea)

        const responseText = `[OK] **Epic created successfully!**

[DOCS] **${epic.title}**
├─ ID: \`${epic.id}\`
├─ Status: [WAIT] ${epic.status}
├─ Created: ${epic.createdAt.toLocaleDateString()}
└─ Description: ${epic.description}`
        const nextSteps = `

[START] **Recommended next steps:**
1. **Add tasks to this epic**: \`pm create task "${epic.title} - Setup"\`
2. **Create more tasks**: \`pm create task "${epic.title} - Implementation"\`
3. **View epic progress**: \`pm list epics\`
4. **Get next task**: \`pm next\`

[TIP] **Pro tip**: Break epics into 3-8 specific, actionable tasks for better tracking!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText + nextSteps,
                },
            ],
            metadata: {
                entityType: 'epic',
                entityId: epic.id,
                entityStatus: epic.status,
                entityPriority: epic.priority,
                operation: 'create',
                operationSuccess: true,
                parentIdea: validatedArgs.ideaId,
                suggestedCommands: [
                    `pm create task "${epic.title} - Setup"`,
                    `pm create task "${epic.title} - Implementation"`,
                    `pm list epics`,
                    `pm next`,
                ],
            },
        }
    }
}
