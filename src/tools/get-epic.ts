import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const getEpicSchema = z.object({
    epicId: z.string(),
})

export class GetEpicTool extends BaseTool {
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'get_epic'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Retrieve detailed information about a specific epic including all tasks, progress statistics, parent idea, and completion status.
        
        WHEN TO USE:
        - Need overview of epic progress and task breakdown
        - Planning work on tasks within an epic
        - Understanding dependencies between tasks in epic
        - Reviewing epic completion status
        
        PARAMETERS:
        - epicId: String identifier of the epic (format: EPIC-N)
        
        USAGE CONTEXT:
        - Use before starting work on epic tasks
        - Helpful for understanding task dependencies
        - Provides actionable next steps for epic completion
        
        EXPECTED OUTCOMES:
        - Complete epic overview with task statistics
        - Dependency analysis for all tasks
        - Specific next step recommendations
        - Progress indicators and completion status`
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                epicId: { type: 'string', description: 'ID of the epic' },
            },
            required: ['epicId'],
        }
    }

    /**
     * Executes the epic retrieval process
     * @param args - The tool arguments containing epicId
     * @returns The epic details with task statistics and progress
     */
    async execute(args: any): Promise<ToolResult> {
        const validatedArgs = this.validate(getEpicSchema, args)
        const storage = await this.getStorage()

        // Load epic
        const epic = await storage.loadEpic(validatedArgs.epicId)
        if (!epic) {
            throw new Error(`Epic ${validatedArgs.epicId} not found`)
        }

        // Load parent idea
        const parentIdea = await storage.loadIdea(epic.ideaId)
        const ideaTitle = parentIdea ? parentIdea.title : 'Unknown Idea'

        // Get tasks for this epic
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
        const progressPercent =
            epicTasks.length > 0
                ? Math.round((completedTasks / epicTasks.length) * 100)
                : 0

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                epic: {
                                    id: epic.id,
                                    title: epic.title,
                                    description: epic.description,
                                    status: epic.status,
                                    priority: epic.priority,
                                    parentIdeaId: epic.ideaId,
                                    parentIdeaTitle: ideaTitle,
                                },
                                tasks: epicTasks.map((task) => ({
                                    id: task.id,
                                    title: task.title,
                                    status: task.status,
                                    priority: task.priority,
                                    type: task.type,
                                    dependencies: task.dependencies || [],
                                })),
                                statistics: {
                                    totalTasks: epicTasks.length,
                                    completedTasks,
                                    inProgressTasks,
                                    blockedTasks,
                                    progressPercent,
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    epic,
                                    epicTasks,
                                    progressPercent
                                ),
                                context: `Epic "${epic.title}" has ${epicTasks.length} tasks with ${progressPercent}% completion rate`,
                                recommendations: this.getRecommendations(
                                    epicTasks,
                                    progressPercent
                                ),
                                suggested_commands: [
                                    `pm create task "New Task for ${epic.title}"`,
                                    `pm get_idea ${epic.ideaId}`,
                                    `pm next`,
                                ],
                            },
                        },
                        null,
                        2
                    ),
                },
            ],
            metadata: {
                entityType: 'epic',
                entityId: epic.id,
                operation: 'get',
                operationSuccess: true,
                progressPercent,
            },
        }
    }

    private getNextSteps(
        _epic: any,
        tasks: any[],
        progressPercent: number
    ): string[] {
        const nextSteps = []

        if (tasks.length === 0) {
            nextSteps.push('Create first task for this epic')
            nextSteps.push('Define specific deliverables and requirements')
        } else {
            const blockedTasks = tasks.filter((t) => t.status === 'blocked')
            const pendingTasks = tasks.filter((t) => t.status === 'pending')

            if (blockedTasks.length > 0) {
                nextSteps.push(`Unblock ${blockedTasks.length} blocked tasks`)
            }

            if (pendingTasks.length > 0) {
                nextSteps.push(
                    `Start work on ${pendingTasks.length} pending tasks`
                )
            }

            if (progressPercent < 100) {
                nextSteps.push('Continue working on in-progress tasks')
            }
        }

        nextSteps.push('Use "pm next" to get optimal next task')
        return nextSteps
    }

    private getRecommendations(
        tasks: any[],
        progressPercent: number
    ): string[] {
        const recommendations = []

        if (progressPercent === 0) {
            recommendations.push('Start with high-priority tasks first')
        } else if (progressPercent < 25) {
            recommendations.push(
                'Focus on completing current tasks before starting new ones'
            )
        } else if (progressPercent < 75) {
            recommendations.push('Maintain steady progress on remaining tasks')
        } else {
            recommendations.push(
                'Push to complete remaining tasks for epic closure'
            )
        }

        const blockedTasks = tasks.filter((t) => t.status === 'blocked')
        if (blockedTasks.length > 0) {
            recommendations.push('Address blocked tasks to prevent bottlenecks')
        }

        return recommendations
    }
}
