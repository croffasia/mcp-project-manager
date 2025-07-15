import { BaseTool, ToolResult } from './base.js'

/**
 * Tool for listing all ideas in the project with comprehensive statistics and progress tracking
 */
export class ListAllIdeasTool extends BaseTool {
    /**
     * Creates a new instance of ListAllIdeasTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'list_all_ideas'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `List all ideas in the project with epic counts, task progress statistics, priority distribution, and status breakdown.
        
        WHEN TO USE:
        - Need high-level overview of all project ideas
        - Planning strategic project direction and priorities
        - Tracking progress at the idea level across multiple epics
        - Understanding overall project structure and organization
        
        PARAMETERS:
        - No parameters required - returns all ideas
        
        USAGE CONTEXT:
        - Essential for project managers and stakeholders reviewing progress
        - Provides strategic view of project implementation status
        - Helps identify high-level bottlenecks and priority areas
        - Used for executive reporting and project planning
        
        EXPECTED OUTCOMES:
        - Complete overview of all ideas with comprehensive statistics
        - Progress tracking across epic and task levels
        - Priority and status distribution analysis
        - Strategic insights for project direction and resource allocation`
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {},
        }
    }

    /**
     * Executes the idea listing with comprehensive statistics
     * @param _args - The tool arguments (empty for this tool)
     * @returns The listing result with idea details and statistics
     */
    async execute(_args?: any): Promise<ToolResult> {
        const storage = await this.getStorage()

        const allIdeas = await storage.loadAllIdeas()

        if (allIdeas.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                result: {
                                    ideas: [],
                                    summary: {
                                        totalCount: 0,
                                        completedCount: 0,
                                        inProgressCount: 0,
                                        blockedCount: 0,
                                        totalEpics: 0,
                                        totalTasks: 0,
                                        completedTasks: 0,
                                    },
                                },
                                status: 'warning',
                                guidance: {
                                    next_steps: [
                                        'Create your first idea to organize project work',
                                        'Initialize project structure if not done yet',
                                        'Start with high-level feature concepts',
                                    ],
                                    context: 'No ideas found in the project',
                                    recommendations: [
                                        'Ideas are high-level features or concepts that contain epics and tasks',
                                        'Start with 1-2 main ideas for better organization',
                                        'Use hierarchical structure: Ideas → Epics → Tasks',
                                    ],
                                    suggested_commands: [
                                        'pm create_idea "My First Idea"',
                                        'pm init_project',
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
                    operation: 'list',
                    operationSuccess: true,
                    totalCount: 0,
                    completedCount: 0,
                    inProgressCount: 0,
                    blockedCount: 0,
                    totalEpics: 0,
                    totalTasks: 0,
                },
            }
        }

        const allEpics = await storage.loadAllEpics()
        const allTasks = await storage.loadAllTasks()

        const ideasWithStats = []
        for (const idea of allIdeas) {
            const ideaEpics = allEpics.filter((epic) => epic.ideaId === idea.id)
            const ideaTasks = allTasks.filter((task) =>
                ideaEpics.some((epic) => epic.id === task.epicId)
            )

            const completedTasks = ideaTasks.filter(
                (t) => t.status === 'done'
            ).length
            const inProgressTasks = ideaTasks.filter(
                (t) => t.status === 'in-progress'
            ).length
            const blockedTasks = ideaTasks.filter(
                (t) => t.status === 'blocked'
            ).length
            const completedEpics = ideaEpics.filter(
                (e) => e.status === 'done'
            ).length

            ideasWithStats.push({
                ...idea,
                epicCount: ideaEpics.length,
                taskCount: ideaTasks.length,
                completedTasks,
                inProgressTasks,
                blockedTasks,
                completedEpics,
                taskProgressPercent:
                    ideaTasks.length > 0
                        ? Math.round((completedTasks / ideaTasks.length) * 100)
                        : 0,
                epicProgressPercent:
                    ideaEpics.length > 0
                        ? Math.round((completedEpics / ideaEpics.length) * 100)
                        : 0,
            })
        }

        ideasWithStats.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 }
            const priorityDiff =
                priorityOrder[b.priority] - priorityOrder[a.priority]
            if (priorityDiff !== 0) return priorityDiff
            return b.createdAt.getTime() - a.createdAt.getTime()
        })

        const totalEpics = allEpics.length
        const totalTasks = allTasks.length
        const completedTasksTotal = allTasks.filter(
            (t) => t.status === 'done'
        ).length
        const inProgressTasksTotal = allTasks.filter(
            (t) => t.status === 'in-progress'
        ).length
        const blockedTasksTotal = allTasks.filter(
            (t) => t.status === 'blocked'
        ).length

        const statusCounts = this.getStatusCounts(allIdeas)
        const priorityCounts = this.getPriorityCounts(allIdeas)

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                ideas: ideasWithStats.map((idea) => ({
                                    id: idea.id,
                                    title: idea.title,
                                    description: idea.description,
                                    status: idea.status,
                                    priority: idea.priority,
                                    createdAt: idea.createdAt.toISOString(),
                                    epicCount: idea.epicCount,
                                    taskCount: idea.taskCount,
                                    completedEpics: idea.completedEpics,
                                    completedTasks: idea.completedTasks,
                                    inProgressTasks: idea.inProgressTasks,
                                    blockedTasks: idea.blockedTasks,
                                    epicProgressPercent:
                                        idea.epicProgressPercent,
                                    taskProgressPercent:
                                        idea.taskProgressPercent,
                                })),
                                summary: {
                                    totalCount: allIdeas.length,
                                    completedCount: allIdeas.filter(
                                        (i) => i.status === 'done'
                                    ).length,
                                    inProgressCount: allIdeas.filter(
                                        (i) => i.status === 'in-progress'
                                    ).length,
                                    blockedCount: allIdeas.filter(
                                        (i) => i.status === 'blocked'
                                    ).length,
                                    totalEpics: totalEpics,
                                    totalTasks: totalTasks,
                                    completedTasks: completedTasksTotal,
                                    taskProgressPercent:
                                        totalTasks > 0
                                            ? Math.round(
                                                  (completedTasksTotal /
                                                      totalTasks) *
                                                      100
                                              )
                                            : 0,
                                },
                                distributions: {
                                    status: statusCounts,
                                    priority: priorityCounts,
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    allIdeas,
                                    ideasWithStats
                                ),
                                context: `Found ${allIdeas.length} ideas with ${totalEpics} epics and ${totalTasks} tasks (${completedTasksTotal} completed)`,
                                recommendations:
                                    this.getRecommendations(ideasWithStats),
                                suggested_commands: [
                                    'pm create_idea "Idea Title"',
                                    'pm get_idea [IDEA-ID]',
                                    'pm list_all_epics',
                                    'pm next_task',
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
                operation: 'list',
                operationSuccess: true,
                totalCount: allIdeas.length,
                completedCount: allIdeas.filter((i) => i.status === 'done')
                    .length,
                inProgressCount: allIdeas.filter(
                    (i) => i.status === 'in-progress'
                ).length,
                blockedCount: allIdeas.filter((i) => i.status === 'blocked')
                    .length,
                totalEpics: totalEpics,
                totalTasks: totalTasks,
                completedTasks: completedTasksTotal,
                taskProgressPercent:
                    totalTasks > 0
                        ? Math.round((completedTasksTotal / totalTasks) * 100)
                        : 0,
            },
        }
    }

    private getNextSteps(allIdeas: any[], ideasWithStats: any[]): string[] {
        const nextSteps = []

        if (allIdeas.length === 0) {
            nextSteps.push('Create your first idea to organize project work')
            nextSteps.push('Start with high-level feature concepts')
        } else {
            const blockedIdeas = ideasWithStats.filter(
                (i) => i.blockedTasks > 0
            )
            const inProgressIdeas = ideasWithStats.filter(
                (i) => i.status === 'in-progress'
            )
            const highPriorityIdeas = ideasWithStats.filter(
                (i) => i.priority === 'high'
            )

            if (blockedIdeas.length > 0) {
                nextSteps.push(
                    `Address ${blockedIdeas.length} ideas with blocked tasks`
                )
            }

            if (inProgressIdeas.length > 0) {
                nextSteps.push(
                    `Continue work on ${inProgressIdeas.length} in-progress ideas`
                )
            }

            if (highPriorityIdeas.length > 0) {
                nextSteps.push(
                    `Focus on ${highPriorityIdeas.length} high-priority ideas`
                )
            }
        }

        nextSteps.push('Use next_task to get optimal work recommendations')
        nextSteps.push('Review idea progress and strategic alignment')

        return nextSteps
    }

    private getRecommendations(ideasWithStats: any[]): string[] {
        const recommendations = []

        if (ideasWithStats.length === 0) {
            recommendations.push(
                'Start with 1-2 main ideas for better organization'
            )
            recommendations.push(
                'Use hierarchical structure: Ideas → Epics → Tasks'
            )
        } else {
            const blockedIdeas = ideasWithStats.filter(
                (i) => i.blockedTasks > 0
            )
            const lowProgressIdeas = ideasWithStats.filter(
                (i) => i.taskProgressPercent < 25
            )
            const nearCompleteIdeas = ideasWithStats.filter(
                (i) => i.taskProgressPercent > 80
            )

            if (blockedIdeas.length > 0) {
                recommendations.push(
                    'Focus on unblocking tasks in blocked ideas'
                )
            }

            if (nearCompleteIdeas.length > 0) {
                recommendations.push(
                    'Push to complete ideas that are near completion'
                )
            }

            if (lowProgressIdeas.length > 0) {
                recommendations.push(
                    'Break down low-progress ideas into more actionable epics'
                )
            }
        }

        recommendations.push('Monitor strategic alignment and priority balance')
        recommendations.push('Adjust idea priorities based on business value')

        return recommendations
    }

    /**
     * Calculates status distribution counts for ideas
     * @param ideas - Array of ideas
     * @returns Object with status counts
     */
    private getStatusCounts(ideas: any[]): { [key: string]: number } {
        const counts: { [key: string]: number } = {}
        ideas.forEach((idea) => {
            counts[idea.status] = (counts[idea.status] || 0) + 1
        })
        return counts
    }

    /**
     * Calculates priority distribution counts for ideas
     * @param ideas - Array of ideas
     * @returns Object with priority counts
     */
    private getPriorityCounts(ideas: any[]): { [key: string]: number } {
        const counts: { [key: string]: number } = {}
        ideas.forEach((idea) => {
            counts[idea.priority] = (counts[idea.priority] || 0) + 1
        })
        return counts
    }
}
