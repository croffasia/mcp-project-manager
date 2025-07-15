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
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Update epic properties (title, description, status, priority) with automatic change tracking and progress analysis.
        
        WHEN TO USE:
        - Starting work on an epic (status → in-progress)
        - Updating epic title or description for clarity
        - Changing epic priority based on business needs
        - Marking epic as done when all tasks are complete
        - Blocking epic when dependencies are not met
        
        PARAMETERS:
        - epicId: Required ID of the epic to update
        - title: Update epic title
        - description: Update epic description
        - status: Change epic status (pending, in-progress, done, blocked, deferred)
        - priority: Update epic priority (low, medium, high)
        
        USAGE CONTEXT:
        - Critical for AI agents to track epic-level progress
        - Essential for maintaining epic state and visibility
        - Used for strategic planning and resource allocation
        - Supports detailed change logging and audit trail
        
        EXPECTED OUTCOMES:
        - Epic properties updated with change tracking
        - Task progress analysis and completion statistics
        - Automatic metadata updates and validation
        - Clear feedback on changes made and strategic next steps`
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
                        text: JSON.stringify({
                            result: {
                                epic: {
                                    id: epic.id,
                                    title: epic.title,
                                    status: epic.status,
                                    priority: epic.priority,
                                    parentIdeaTitle: ideaTitle
                                },
                                changes: [],
                                reason: 'no_changes'
                            },
                            status: "warning",
                            guidance: {
                                next_steps: [
                                    'Specify different values to make changes',
                                    'Create tasks within this epic to organize work',
                                    'Review epic progress and adjust priorities as needed'
                                ],
                                context: `No changes made to epic "${epic.title}"`,
                                recommendations: [
                                    'Use get_epic to view current epic details',
                                    'Create tasks to break down epic into actionable items',
                                    'Update status when starting or completing epic work'
                                ],
                                suggested_commands: [
                                    `pm get_epic ${epic.id}`,
                                    `pm create_task "Task for ${epic.title}"`,
                                    `pm list_all_epics`,
                                    `pm get_idea ${epic.ideaId}`
                                ]
                            }
                        }, null, 2)
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

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        result: {
                            epic: {
                                id: epic.id,
                                title: epic.title,
                                status: epic.status,
                                priority: epic.priority,
                                updatedAt: epic.updatedAt.toISOString(),
                                parentIdeaTitle: ideaTitle
                            },
                            changes: changes,
                            taskProgress: {
                                totalTasks: epicTasks.length,
                                completedTasks: completedTasks,
                                inProgressTasks: inProgressTasks,
                                blockedTasks: blockedTasks,
                                pendingTasks: pendingTasks,
                                completionPercent: epicTasks.length > 0 ? Math.round((completedTasks / epicTasks.length) * 100) : 0
                            },
                            statusTransition: {
                                from: oldStatus,
                                to: epic.status,
                                isProgression: this.isProgression(oldStatus, epic.status)
                            }
                        },
                        status: "success",
                        guidance: {
                            next_steps: this.getNextSteps(epic, oldStatus, validatedArgs),
                            context: `Epic "${epic.title}" updated with ${changes.length} changes`,
                            recommendations: this.getRecommendations(epic, oldStatus, validatedArgs),
                            suggested_commands: [
                                `pm get_epic ${epic.id}`,
                                `pm create_task "Task for ${epic.title}"`,
                                `pm list_all_tasks`,
                                `pm get_idea ${epic.ideaId}`
                            ]
                        }
                    }, null, 2)
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
            },
        }
    }

    private isProgression(oldStatus: string, newStatus: string): boolean {
        const progressionOrder = ['pending', 'in-progress', 'done']
        const oldIndex = progressionOrder.indexOf(oldStatus)
        const newIndex = progressionOrder.indexOf(newStatus)
        return oldIndex >= 0 && newIndex >= 0 && newIndex > oldIndex
    }

    private getNextSteps(epic: any, oldStatus: string, validatedArgs: any): string[] {
        const nextSteps = []
        
        if (epic.status === 'in-progress' && oldStatus === 'pending') {
            nextSteps.push('Create tasks within this epic to organize work')
            nextSteps.push('Monitor task progress and update epic status accordingly')
        } else if (epic.status === 'done' && oldStatus !== 'done') {
            nextSteps.push('Epic completed successfully')
            nextSteps.push('Review epic outcomes and lessons learned')
        } else if (epic.status === 'blocked') {
            nextSteps.push('Identify and resolve blocking issues')
            nextSteps.push('Focus on unblocking dependent tasks')
        }
        
        if (validatedArgs.priority) {
            nextSteps.push('Adjust task priorities within epic accordingly')
        }
        
        nextSteps.push('Review epic progress and task completion rates')
        nextSteps.push('Check parent idea progress to see overall alignment')
        
        return nextSteps
    }

    private getRecommendations(epic: any, oldStatus: string, validatedArgs: any): string[] {
        const recommendations = []
        
        if (epic.status === 'in-progress') {
            recommendations.push('Break down epic into specific, actionable tasks')
            recommendations.push('Track task completion to monitor epic progress')
        }
        
        if (epic.status === 'done') {
            recommendations.push('Ensure all tasks within epic are completed')
            recommendations.push('Review epic deliverables and impact')
        }
        
        if (epic.status === 'blocked') {
            recommendations.push('Identify specific blockers and create action plan')
            recommendations.push('Focus on resolving dependencies before continuing')
        }
        
        if (validatedArgs.priority === 'high') {
            recommendations.push('High priority epic - ensure adequate resources')
        }
        
        recommendations.push('Keep epic information up to date for team coordination')
        recommendations.push('Align epic progress with strategic objectives')
        
        return recommendations
    }
}
