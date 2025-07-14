import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const updateEpicSchema = z.object({
    epicId: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z
        .enum(['pending', 'in-progress', 'done', 'blocked', 'deferred'])
        .optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
})

/**
 * Tool for updating epic properties including status, priority, title, and description with change tracking
 */
export class UpdateEpicTool extends BaseTool {
    /**
     * Creates a new instance of UpdateEpicTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'update_epic'
    }

    /**
     * Returns the description of the tool
     * @returns The tool description
     */
    getDescription(): string {
        return 'Update epic properties (title, description, status, priority) with automatic change tracking and timestamp updates'
    }

    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                epicId: {
                    type: 'string',
                    description: 'ID of the epic to update',
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
            required: ['epicId'],
        }
    }

    async execute(args: any): Promise<ToolResult> {
        // Check approval requirement first, except for status change to 'in-progress'
        const isStartingWork = args.status === 'in-progress'
        if (!isStartingWork) {
            this.validateApproval(args)
        }

        const validatedArgs = this.validate(updateEpicSchema, args)
        const storage = await this.getStorage()

        // Load epic
        const epic = await storage.loadEpic(validatedArgs.epicId)
        if (!epic) {
            throw new Error(`Epic ${validatedArgs.epicId} not found`)
        }

        // Load parent idea for context
        const parentIdea = await storage.loadIdea(epic.ideaId)
        const ideaTitle = parentIdea ? parentIdea.title : 'Unknown Idea'

        // Save old values for comparison
        const oldTitle = epic.title
        const oldDescription = epic.description
        const oldStatus = epic.status
        const oldPriority = epic.priority

        const changes = []

        // Update properties
        if (validatedArgs.title && validatedArgs.title !== oldTitle) {
            epic.title = validatedArgs.title
            changes.push(`Title: "${oldTitle}" → "${validatedArgs.title}"`)
        }

        if (
            validatedArgs.description &&
            validatedArgs.description !== oldDescription
        ) {
            epic.description = validatedArgs.description
            changes.push(`Description updated`)
        }

        if (validatedArgs.status && validatedArgs.status !== oldStatus) {
            epic.status = validatedArgs.status
            changes.push(`Status: ${oldStatus} → ${validatedArgs.status}`)
        }

        if (validatedArgs.priority && validatedArgs.priority !== oldPriority) {
            epic.priority = validatedArgs.priority
            changes.push(`Priority: ${oldPriority} → ${validatedArgs.priority}`)
        }

        // Mark as updated
        epic.updatedAt = new Date()

        // Save epic
        await storage.saveEpic(epic)

        if (changes.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `[WARN] **No changes made to epic: "${epic.title}"**

- **ID**: ${epic.id}
- **Parent Idea**: ${ideaTitle}
- **Current Status**: ${epic.status}
- **Current Priority**: ${epic.priority}

**Next Steps:**
- **View details**: \`pm get_epic ${epic.id}\`
- **Create task**: \`pm create task "New Task for ${epic.title}"\`
- **View all epics**: \`pm list epics\``,
                    },
                ],
                metadata: {
                    entityType: 'epic',
                    entityId: epic.id,
                    operation: 'update',
                    operationSuccess: false,
                    reason: 'no_changes',
                    currentStatus: epic.status,
                    currentPriority: epic.priority,
                    updatedFields: [],
                    suggestedCommands: [
                        `pm get_epic ${epic.id}`,
                        `pm create task "New Task for ${epic.title}"`,
                        `pm list epics`,
                    ],
                },
            }
        }

        // Get task statistics for context
        const allTasks = await storage.loadAllTasks()
        const epicTasks = allTasks.filter((task) => task.epicId === epic.id)
        const completedTasks = epicTasks.filter(
            (t) => t.status === 'done'
        ).length
        const inProgressTasks = epicTasks.filter(
            (t) => t.status === 'in-progress'
        ).length
        const blockedTasks = epicTasks.filter(
            (t) => t.status === 'blocked'
        ).length
        const pendingTasks = epicTasks.filter(
            (t) => t.status === 'pending'
        ).length

        const statusIcon = this.getStatusIcon(epic.status)
        const progressIcon = this.getProgressIcon(epic.status, oldStatus)

        const responseText = `${statusIcon} **Epic Updated: "${epic.title}"**

**Epic Context:**
- **ID**: ${epic.id}
- **Parent Idea**: ${ideaTitle}

**Changes Made:**
${changes.map((change) => `- ${change}`).join('\n')}

**Current Status:**
- **Status**: ${epic.status}
- **Priority**: ${epic.priority}
- **Updated**: ${epic.updatedAt.toLocaleDateString()}

${progressIcon} **Task Progress Summary:**
- **Total Tasks**: ${epicTasks.length}
- **Completed**: ${completedTasks} (${epicTasks.length > 0 ? Math.round((completedTasks / epicTasks.length) * 100) : 0}%)
- **In Progress**: ${inProgressTasks}
- **Blocked**: ${blockedTasks}
- **Pending**: ${pendingTasks}

**Description:**
${epic.description}

**Next Steps:**
- **View full details**: \`pm get_epic ${epic.id}\`
- **Create new task**: \`pm create task "New Task for ${epic.title}"\`
- **View parent idea**: \`pm get_idea ${epic.ideaId}\`
- **View all tasks**: \`pm list tasks\`

[TIP] **Pro tip**: Update epic status as tasks progress to track overall completion!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
                },
            ],
            metadata: {
                entityType: 'epic',
                entityId: epic.id,
                operation: 'update',
                operationSuccess: true,
                updatedFields: changes,
                oldStatus: oldStatus,
                newStatus: epic.status,
                oldPriority: oldPriority,
                newPriority: epic.priority,
                tasksCount: epicTasks.length,
                completedTasks: completedTasks,
                progressPercent:
                    epicTasks.length > 0
                        ? Math.round((completedTasks / epicTasks.length) * 100)
                        : 0,
                parentIdeaId: epic.ideaId,
                suggestedCommands: [
                    `pm get_epic ${epic.id}`,
                    `pm create task "New Task for ${epic.title}"`,
                    `pm list tasks`,
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
