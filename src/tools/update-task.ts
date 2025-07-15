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
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Update task properties (status, progress, priority, title, description) with automatic change tracking and progress notes.
        
        WHEN TO USE:
        - Starting work on a task (status → in-progress)
        - Adding progress notes during development
        - Updating task priority or requirements
        - Marking tasks as done or blocked
        - Modifying task dependencies
        
        PARAMETERS:
        - taskId: Required ID of the task to update
        - status: Change task status (pending, in-progress, done, blocked, deferred)
        - progressNote: Add progress note with timestamp
        - progressType: Type of progress note (update, comment, blocker, completion)
        - priority: Update task priority (low, medium, high)
        - title: Update task title
        - description: Update task description
        - dependencies: Update task dependencies array
        
        USAGE CONTEXT:
        - Critical for AI agents to track development progress
        - Essential for maintaining task state and visibility
        - Used for workflow management and progress reporting
        - Supports detailed change logging and audit trail
        
        EXPECTED OUTCOMES:
        - Task properties updated with change tracking
        - Progress notes logged with timestamps
        - Automatic metadata updates and validation
        - Clear feedback on changes made and next steps`
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
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

    /**
     * Executes the task update process with change tracking
     * @param args - The tool arguments containing taskId and optional update fields
     * @returns The update result with change summary and next steps
     */
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
                        text: JSON.stringify(
                            {
                                result: {
                                    task: {
                                        id: task.id,
                                        title: task.title,
                                        status: task.status,
                                        priority: task.priority,
                                        parentEpicTitle: epicTitle,
                                        parentIdeaTitle: ideaTitle,
                                    },
                                    changes: [],
                                    reason: 'no_changes',
                                },
                                status: 'warning',
                                guidance: {
                                    next_steps: [
                                        'Specify different values to make changes',
                                        'Add progress notes to track work',
                                        'Update status to reflect current state',
                                    ],
                                    context: `No changes made to task "${task.title}"`,
                                    recommendations: [
                                        'Use get_task to view current task details',
                                        'Add progress notes regularly for visibility',
                                        'Update status when starting or completing work',
                                    ],
                                    suggested_commands: [
                                        `pm get_task ${task.id}`,
                                        `pm update_task ${task.id} progressNote "Progress update"`,
                                        `pm update_task ${task.id} status in-progress`,
                                    ],
                                },
                            },
                            null,
                            2
                        ),
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
                },
            }
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                task: {
                                    id: task.id,
                                    title: task.title,
                                    status: task.status,
                                    priority: task.priority,
                                    updatedAt: task.updatedAt.toISOString(),
                                    parentEpicTitle: epicTitle,
                                    parentIdeaTitle: ideaTitle,
                                },
                                changes: changes,
                                progressNotes: {
                                    total: (task.progressNotes || []).length,
                                    recent: (task.progressNotes || [])
                                        .slice(-2)
                                        .map((note) => ({
                                            content: note.content,
                                            type: note.type,
                                            timestamp: note.timestamp,
                                        })),
                                },
                                statusTransition: {
                                    from: oldStatus,
                                    to: task.status,
                                    isProgression: this.isProgression(
                                        oldStatus,
                                        task.status
                                    ),
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    task,
                                    oldStatus,
                                    validatedArgs
                                ),
                                context: `Task "${task.title}" updated with ${changes.length} changes`,
                                recommendations: this.getRecommendations(
                                    task,
                                    oldStatus,
                                    validatedArgs
                                ),
                                suggested_commands: [
                                    `pm get_task ${task.id}`,
                                    `pm update_task ${task.id} progressNote "Additional update"`,
                                    `pm next_task`,
                                    `pm get_epic ${task.epicId}`,
                                ],
                            },
                        },
                        null,
                        2
                    ),
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
            },
        }
    }

    private isProgression(oldStatus: string, newStatus: string): boolean {
        const progressionOrder = ['pending', 'in-progress', 'done']
        const oldIndex = progressionOrder.indexOf(oldStatus)
        const newIndex = progressionOrder.indexOf(newStatus)
        return oldIndex >= 0 && newIndex >= 0 && newIndex > oldIndex
    }

    private getNextSteps(
        task: any,
        oldStatus: string,
        validatedArgs: any
    ): string[] {
        const nextSteps = []

        if (task.status === 'in-progress' && oldStatus === 'pending') {
            nextSteps.push('Add progress notes regularly as you work')
            nextSteps.push('Update status to done when task is complete')
        } else if (task.status === 'done' && oldStatus !== 'done') {
            nextSteps.push('Task completed successfully')
            nextSteps.push('Use next_task to get next work item')
        } else if (task.status === 'blocked') {
            nextSteps.push('Identify and resolve blocking issues')
            nextSteps.push('Add progress notes explaining the blocker')
        }

        if (validatedArgs.progressNote) {
            nextSteps.push('Continue adding progress notes for visibility')
        }

        nextSteps.push('Review task progress and update as needed')
        nextSteps.push('Check epic progress to see overall completion')

        return nextSteps
    }

    private getRecommendations(
        task: any,
        oldStatus: string,
        validatedArgs: any
    ): string[] {
        const recommendations = []

        if (task.status === 'in-progress') {
            recommendations.push('Add progress notes at key milestones')
            recommendations.push(
                'Update status regularly to reflect current state'
            )
        }

        if (task.status === 'done') {
            recommendations.push(
                'Ensure all Definition of Done criteria are met'
            )
            recommendations.push('Review task completion and lessons learned')
        }

        if (task.status === 'blocked') {
            recommendations.push(
                'Document blocking issues clearly in progress notes'
            )
            recommendations.push(
                'Focus on resolving blockers before continuing'
            )
        }

        if (validatedArgs.progressNote) {
            recommendations.push(
                'Regular progress updates improve team visibility'
            )
        }

        recommendations.push(
            'Keep task information up to date for team coordination'
        )
        recommendations.push(
            'Use progress notes to capture important decisions and context'
        )

        return recommendations
    }
}
