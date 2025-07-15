import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const getIdeaSchema = z.object({
    ideaId: z.string(),
})

export class GetIdeaTool extends BaseTool {
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'get_idea'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Retrieve detailed information about a specific idea including all epics, task counts, progress statistics, and current status.
        
        WHEN TO USE:
        - Need high-level overview of idea implementation
        - Planning epic breakdown and task distribution
        - Tracking overall progress across multiple epics
        - Understanding idea scope and current development state
        
        PARAMETERS:
        - ideaId: String identifier of the idea (format: IDEA-N)
        
        USAGE CONTEXT:
        - Use at start of work on idea to understand scope
        - Helpful for project planning and resource allocation
        - Provides strategic view of development progress
        
        EXPECTED OUTCOMES:
        - Complete idea overview with epic and task statistics
        - Progress tracking across all components
        - Strategic recommendations for idea completion
        - Actionable next steps for continued development`
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                ideaId: { type: 'string', description: 'ID of the idea' },
            },
            required: ['ideaId'],
        }
    }

    /**
     * Executes the idea retrieval process
     * @param args - The tool arguments containing ideaId
     * @returns The idea details with epics and task statistics
     */
    async execute(args: any): Promise<ToolResult> {
        const validatedArgs = this.validate(getIdeaSchema, args)
        const storage = await this.getStorage()

        // Load idea
        const idea = await storage.loadIdea(validatedArgs.ideaId)
        if (!idea) {
            throw new Error(`Idea ${validatedArgs.ideaId} not found`)
        }

        // Get epics and tasks
        const allEpics = await storage.loadAllEpics()
        const epics = allEpics.filter((epic) => epic.ideaId === idea.id)
        const allTasks = await storage.loadAllTasks()
        const ideaTasks = allTasks.filter((task) =>
            epics.some((epic) => epic.id === task.epicId)
        )

        // Prepare JSON response with guidance structure
        const completedTasks = ideaTasks.filter(
            (t) => t.status === 'done'
        ).length
        const inProgressTasks = ideaTasks.filter(
            (t) => t.status === 'in-progress'
        ).length
        const blockedTasks = ideaTasks.filter(
            (t) => t.status === 'blocked'
        ).length
        const progressPercent =
            ideaTasks.length > 0
                ? Math.round((completedTasks / ideaTasks.length) * 100)
                : 0

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                idea: {
                                    id: idea.id,
                                    title: idea.title,
                                    description: idea.description,
                                    status: idea.status,
                                    priority: idea.priority,
                                },
                                epics: epics.map((epic) => ({
                                    id: epic.id,
                                    title: epic.title,
                                    status: epic.status,
                                    priority: epic.priority,
                                })),
                                statistics: {
                                    totalEpics: epics.length,
                                    totalTasks: ideaTasks.length,
                                    completedTasks,
                                    inProgressTasks,
                                    blockedTasks,
                                    progressPercent,
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    idea,
                                    epics,
                                    ideaTasks
                                ),
                                context: `Idea "${idea.title}" has ${epics.length} epics and ${ideaTasks.length} total tasks with ${progressPercent}% completion`,
                                recommendations: this.getRecommendations(
                                    epics,
                                    ideaTasks,
                                    progressPercent
                                ),
                                suggested_commands: [
                                    `pm create epic "New Epic for ${idea.title}"`,
                                    `pm list epics`,
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
                entityType: 'idea',
                entityId: idea.id,
                operation: 'get',
                operationSuccess: true,
                progressPercent,
            },
        }
    }

    private getNextSteps(_idea: any, epics: any[], tasks: any[]): string[] {
        const nextSteps = []

        if (epics.length === 0) {
            nextSteps.push('Create first epic to structure the idea')
            nextSteps.push('Define major components or phases')
        } else {
            const incompleteEpics = epics.filter((e) => e.status !== 'done')
            const blockedTasks = tasks.filter((t) => t.status === 'blocked')

            if (blockedTasks.length > 0) {
                nextSteps.push(`Resolve ${blockedTasks.length} blocked tasks`)
            }

            if (incompleteEpics.length > 0) {
                nextSteps.push(
                    `Continue work on ${incompleteEpics.length} active epics`
                )
            }
        }

        nextSteps.push('Use "pm next" to get optimal next task')
        nextSteps.push('Review epic progress regularly')

        return nextSteps
    }

    private getRecommendations(
        epics: any[],
        tasks: any[],
        progressPercent: number
    ): string[] {
        const recommendations = []

        if (epics.length === 0) {
            recommendations.push(
                'Start by creating 2-4 epics to organize the work'
            )
        } else if (epics.length > 6) {
            recommendations.push(
                'Consider consolidating epics - too many may complicate management'
            )
        }

        if (progressPercent === 0) {
            recommendations.push('Begin with highest priority epic')
        } else if (progressPercent < 30) {
            recommendations.push(
                'Focus on completing started epics before beginning new ones'
            )
        } else if (progressPercent > 80) {
            recommendations.push(
                "Push for completion - you're in the final stretch"
            )
        }

        const blockedTasks = tasks.filter((t) => t.status === 'blocked')
        if (blockedTasks.length > 0) {
            recommendations.push('Address blocked tasks to maintain momentum')
        }

        return recommendations
    }
}
