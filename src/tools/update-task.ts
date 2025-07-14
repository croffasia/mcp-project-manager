import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const updateTaskSchema = z.object({
    taskId: z.string(),
    status: z
        .enum(['pending', 'in-progress', 'done', 'blocked', 'deferred'])
        .optional(),
    progressNote: z.string().optional(),
    progressType: z
        .enum(['update', 'comment', 'blocker', 'completion'])
        .optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
})

/**
 * Tool for updating task properties and tracking progress with detailed change logging and validation
 */
export class UpdateTaskTool extends BaseTool {
    /**
     * Creates a new instance of UpdateTaskTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'update_task'
    }

    /**
     * Returns the description of the tool
     * @returns The tool description
     */
    getDescription(): string {
        return 'Update task properties (status, progress, priority, title, description) with automatic change tracking and progress notes'
    }

    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'ID of the task to update',
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
                    description: 'New status',
                },
                progressNote: {
                    type: 'string',
                    description: 'Progress note to log',
                },
                progressType: {
                    type: 'string',
                    enum: ['update', 'comment', 'blocker', 'completion'],
                    description: 'Type of progress note',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Update priority',
                },
                title: {
                    type: 'string',
                    description: 'Update task title',
                },
                description: {
                    type: 'string',
                    description: 'Update task description',
                },
                dependencies: {
                    type: 'array',
                    items: { type: 'string' },
                    description:
                        'Update task dependencies - array of task IDs that this task depends on (e.g., ["TSK-1", "BUG-2"]). Dependencies must exist.',
                },
            },
            required: ['taskId'],
        }
    }

    async execute(args: any): Promise<ToolResult> {
        // Check approval requirement first, except for status change to 'in-progress'
        const isStartingWork = args.status === 'in-progress'
        if (!isStartingWork) {
            this.validateApproval(args)
        }

        const validatedArgs = this.validate(updateTaskSchema, args)
        const storage = await this.getStorage()

        // Load task
        const task = await storage.loadTask(validatedArgs.taskId)
        if (!task) {
            throw new Error(`Task ${validatedArgs.taskId} not found`)
        }

        // Load context
        const parentEpic = await storage.loadEpic(task.epicId)
        const epicTitle = parentEpic ? parentEpic.title : 'Unknown Epic'

        let ideaTitle = 'Unknown Idea'
        if (parentEpic) {
            const parentIdea = await storage.loadIdea(parentEpic.ideaId)
            ideaTitle = parentIdea ? parentIdea.title : 'Unknown Idea'
        }

        // Save old values for comparison
        const oldStatus = task.status
        const oldPriority = task.priority
        const oldTitle = task.title
        const oldDescription = task.description
        const oldDependencies = [...(task.dependencies || [])]

        const changes = []

        // Validate dependencies if provided
        if (validatedArgs.dependencies) {
            for (const depId of validatedArgs.dependencies) {
                const depTask = await storage.loadTask(depId)
                if (!depTask) {
                    throw new Error(
                        `Dependency task with ID ${depId} not found`
                    )
                }
            }
        }

        // Update properties
        if (validatedArgs.status && validatedArgs.status !== oldStatus) {
            task.status = validatedArgs.status
            changes.push(`Status: ${oldStatus} → ${validatedArgs.status}`)
        }

        if (validatedArgs.priority && validatedArgs.priority !== oldPriority) {
            task.priority = validatedArgs.priority
            changes.push(`Priority: ${oldPriority} → ${validatedArgs.priority}`)
        }

        if (validatedArgs.title && validatedArgs.title !== oldTitle) {
            task.title = validatedArgs.title
            changes.push(`Title: "${oldTitle}" → "${validatedArgs.title}"`)
        }

        if (
            validatedArgs.description &&
            validatedArgs.description !== oldDescription
        ) {
            task.description = validatedArgs.description
            changes.push(`Description updated`)
        }

        if (validatedArgs.dependencies !== undefined) {
            const newDependencies = validatedArgs.dependencies || []
            const oldDepsSet = new Set(oldDependencies)
            const newDepsSet = new Set(newDependencies)

            const removed = oldDependencies.filter(
                (dep) => !newDepsSet.has(dep)
            )
            const added = newDependencies.filter((dep) => !oldDepsSet.has(dep))

            if (removed.length > 0 || added.length > 0) {
                task.dependencies = newDependencies
                if (added.length > 0) {
                    changes.push(`Added dependencies: ${added.join(', ')}`)
                }
                if (removed.length > 0) {
                    changes.push(`Removed dependencies: ${removed.join(', ')}`)
                }
            }
        }

        // Add progress note
        if (validatedArgs.progressNote) {
            const progressNote = {
                id: `PRG-${Date.now()}`,
                taskId: task.id,
                content: validatedArgs.progressNote,
                type: validatedArgs.progressType || 'update',
                timestamp: new Date(),
            }

            task.progressNotes = task.progressNotes || []
            task.progressNotes.push(progressNote)

            changes.push(`Added progress note: "${validatedArgs.progressNote}"`)
        }

        // Mark as updated
        task.updatedAt = new Date()

        // Save task
        await storage.saveTask(task)

        if (changes.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `[WARN] **No changes made to task: "${task.title}"**\n\n- **ID**: ${task.id}\n- **Current Status**: ${task.status}\n- **Current Priority**: ${task.priority}\n\n**Next Steps:**\n- **View details**: \`pm get_task ${task.id}\`\n- **Add progress**: \`pm update_task ${task.id} progressNote "Progress update"\`\n- **Change status**: \`pm update_task ${task.id} status in-progress\``,
                    },
                ],
                metadata: {
                    entityType: 'task',
                    entityId: task.id,
                    operation: 'update',
                    operationSuccess: false,
                    reason: 'no_changes',
                    currentStatus: task.status,
                    currentPriority: task.priority,
                    updatedFields: [],
                    suggestedCommands: [
                        `pm get_task ${task.id}`,
                        `pm update_task ${task.id} progressNote "Progress update"`,
                        `pm update_task ${task.id} status in-progress`,
                    ],
                },
            }
        }

        const statusIcon = this.getStatusIcon(task.status)
        const progressIcon = this.getProgressIcon(task.status, oldStatus)

        const responseText = `${statusIcon} **Task Updated: "${task.title}"**\n\n**Task Context:**\n- **ID**: ${task.id}\n- **Idea**: ${ideaTitle}\n- **Epic**: ${epicTitle}\n\n**Changes Made:**\n${changes.map((change) => `- ${change}`).join('\n')}\n\n**Current Status:**\n- **Status**: ${task.status}\n- **Priority**: ${task.priority}\n- **Updated**: ${task.updatedAt.toLocaleDateString()}\n\n${progressIcon} **Progress Summary:**\n${this.getProgressSummary(task)}\n\n**Next Steps:**\n- **View full details**: \`pm get_task ${task.id}\`\n- **Add more progress**: \`pm update_task ${task.id} progressNote "Additional update"\`\n- **Get next task**: \`pm next\`\n- **View epic progress**: \`pm get_epic ${task.epicId}\`\n\n[TIP] **Pro tip**: Regular updates help track progress and identify blockers early!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
                },
            ],
            metadata: {
                entityType: 'task',
                entityId: task.id,
                operation: 'update',
                operationSuccess: true,
                updatedFields: changes,
                oldStatus: oldStatus,
                newStatus: task.status,
                oldPriority: oldPriority,
                newPriority: task.priority,
                hasProgressNote: !!validatedArgs.progressNote,
                progressNotesCount: (task.progressNotes || []).length,
                parentEpicId: task.epicId,
                suggestedCommands: [
                    `pm get_task ${task.id}`,
                    `pm update_task ${task.id} progressNote "Additional update"`,
                    `pm next`,
                    `pm get_epic ${task.epicId}`,
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

    private getProgressSummary(task: any): string {
        const progressNotes = task.progressNotes || []

        if (progressNotes.length === 0) {
            return '- No progress notes yet\n- [NOTE] **Suggestion**: Add notes to track your work'
        }

        const recentNotes = progressNotes
            .sort(
                (a: any, b: any) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
            )
            .slice(0, 2)

        const summary = recentNotes
            .map(
                (note: any) =>
                    `- **${new Date(note.timestamp).toLocaleDateString()}**: ${note.content}`
            )
            .join('\n')

        if (progressNotes.length > 2) {
            return (
                summary +
                `\n- *${progressNotes.length - 2} older notes - use get_task for full history*`
            )
        }

        return summary
    }
}
