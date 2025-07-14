import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const updateIdeaSchema = z.object({
    ideaId: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z
        .enum(['pending', 'in-progress', 'done', 'blocked', 'deferred'])
        .optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
})

/**
 * Tool for updating idea properties including status, priority, title, and description with comprehensive change tracking
 */
export class UpdateIdeaTool extends BaseTool {
    /**
     * Creates a new instance of UpdateIdeaTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'update_idea'
    }

    /**
     * Returns the description of the tool
     * @returns The tool description
     */
    getDescription(): string {
        return 'Update idea properties (title, description, status, priority) with automatic change tracking and timestamp updates'
    }

    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                ideaId: {
                    type: 'string',
                    description: 'ID of the idea to update',
                },
                title: { type: 'string', description: 'Update title' },
                description: {
                    type: 'string',
                    description: 'Update description',
                },
                status: {
                    type: 'string',
                    enum: [
                        'pending',
                        'in-progress',
                        'done',
                        'blocked',
                        'deferred',
                    ],
                    description: 'Update status',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Update priority',
                },
            },
            required: ['ideaId'],
        }
    }

    async execute(args: any): Promise<ToolResult> {
        // Check approval requirement first, except for status change to 'in-progress'
        const isStartingWork = args.status === 'in-progress'
        if (!isStartingWork) {
            this.validateApproval(args)
        }

        const validatedArgs = this.validate(updateIdeaSchema, args)
        const storage = await this.getStorage()

        // Load idea
        const idea = await storage.loadIdea(validatedArgs.ideaId)
        if (!idea) {
            throw new Error(`Idea ${validatedArgs.ideaId} not found`)
        }

        // Save old values for comparison
        const oldTitle = idea.title
        const oldDescription = idea.description
        const oldStatus = idea.status
        const oldPriority = idea.priority

        const changes = []

        // Update properties
        if (validatedArgs.title && validatedArgs.title !== oldTitle) {
            idea.title = validatedArgs.title
            changes.push(`Title: "${oldTitle}" → "${validatedArgs.title}"`)
        }

        if (
            validatedArgs.description &&
            validatedArgs.description !== oldDescription
        ) {
            idea.description = validatedArgs.description
            changes.push(`Description updated`)
        }

        if (validatedArgs.status && validatedArgs.status !== oldStatus) {
            idea.status = validatedArgs.status
            changes.push(`Status: ${oldStatus} → ${validatedArgs.status}`)
        }

        if (validatedArgs.priority && validatedArgs.priority !== oldPriority) {
            idea.priority = validatedArgs.priority
            changes.push(`Priority: ${oldPriority} → ${validatedArgs.priority}`)
        }

        // Mark update
        idea.updatedAt = new Date()

        // Save idea
        await storage.saveIdea(idea)

        if (changes.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `[WARN] **No changes made to idea: "${idea.title}"**

- **ID**: ${idea.id}
- **Current Status**: ${idea.status}
- **Current Priority**: ${idea.priority}

**Next Steps:**
- **View details**: \`pm get_idea ${idea.id}\`
- **Create epic**: \`pm create epic "New Epic for ${idea.title}"\`
- **View all ideas**: \`pm list ideas\``,
                    },
                ],
                metadata: {
                    entityType: 'idea',
                    entityId: idea.id,
                    operation: 'update',
                    operationSuccess: false,
                    reason: 'no_changes',
                    currentStatus: idea.status,
                    currentPriority: idea.priority,
                    updatedFields: [],
                    suggestedCommands: [
                        `pm get_idea ${idea.id}`,
                        `pm create epic "New Epic for ${idea.title}"`,
                        `pm list ideas`,
                    ],
                },
            }
        }

        // Get epics statistics for context
        const epics = idea.epics || []
        const completedEpics = epics.filter((e) => e.status === 'done').length
        const inProgressEpics = epics.filter(
            (e) => e.status === 'in-progress'
        ).length
        const blockedEpics = epics.filter((e) => e.status === 'blocked').length

        const statusIcon = this.getStatusIcon(idea.status)
        const progressIcon = this.getProgressIcon(idea.status, oldStatus)

        const responseText = `${statusIcon} **Idea Updated: "${idea.title}"**

**Changes Made:**
${changes.map((change) => `- ${change}`).join('\n')}

**Current Status:**
- **ID**: ${idea.id}
- **Status**: ${idea.status}
- **Priority**: ${idea.priority}
- **Updated**: ${idea.updatedAt.toLocaleDateString()}

${progressIcon} **Progress Summary:**
- **Total Epics**: ${epics.length}
- **Completed**: ${completedEpics} (${epics.length > 0 ? Math.round((completedEpics / epics.length) * 100) : 0}%)
- **In Progress**: ${inProgressEpics}
- **Blocked**: ${blockedEpics}

**Description:**
${idea.description}

**Next Steps:**
- **View full details**: \`pm get_idea ${idea.id}\`
- **Create new epic**: \`pm create epic "New Epic for ${idea.title}"\`
- **View all epics**: \`pm list epics\`

[TIP] **Pro tip**: Keep idea descriptions clear and update status as epics progress!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
                },
            ],
            metadata: {
                entityType: 'idea',
                entityId: idea.id,
                operation: 'update',
                operationSuccess: true,
                updatedFields: changes,
                oldStatus: oldStatus,
                newStatus: idea.status,
                oldPriority: oldPriority,
                newPriority: idea.priority,
                epicsCount: epics.length,
                completedEpics: completedEpics,
                progressPercent:
                    epics.length > 0
                        ? Math.round((completedEpics / epics.length) * 100)
                        : 0,
                suggestedCommands: [
                    `pm get_idea ${idea.id}`,
                    `pm create epic "New Epic for ${idea.title}"`,
                    `pm list epics`,
                ],
            },
        }
    }

    private getStatusIcon(status: string): string {
        switch (status) {
            case 'done':
                return '[OK]'
            case 'in-progress':
                return '[WAIT]'
            case 'blocked':
                return '[BLOCK]'
            case 'deferred':
                return '[DATE]'
            default:
                return '⏸️'
        }
    }

    private getProgressIcon(newStatus: string, oldStatus: string): string {
        if (newStatus === 'done' && oldStatus !== 'done') {
            return '[SUCCESS]'
        } else if (newStatus === 'in-progress' && oldStatus === 'pending') {
            return '[START]'
        } else if (newStatus === 'blocked') {
            return '[WARN]'
        }
        return '[NOTE]'
    }
}
