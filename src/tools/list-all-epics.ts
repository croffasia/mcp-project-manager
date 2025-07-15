import { BaseTool, ToolResult } from './base.js'

/**
 * Tool for listing all epics in the project with detailed statistics and parent idea context
 */
export class ListAllEpicsTool extends BaseTool {
    /**
     * Creates a new instance of ListAllEpicsTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'list_all_epics'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `List all epics in the project with parent idea context, task progress, completion rates, and status distribution.
        
        WHEN TO USE:
        - Need overview of all epics across the project
        - Planning epic prioritization and resource allocation
        - Tracking progress at the epic level
        - Understanding project structure and epic relationships
        
        PARAMETERS:
        - No parameters required - returns all epics
        
        USAGE CONTEXT:
        - Essential for project managers and AI agents managing multiple epics
        - Provides comprehensive view of epic progress and status
        - Helps identify bottlenecks and blocked epics
        - Used for strategic planning and progress reporting
        
        EXPECTED OUTCOMES:
        - Complete list of all epics with detailed statistics
        - Progress tracking with completion percentages
        - Status distribution and priority analysis
        - Actionable insights for epic management`
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
     * Executes the epic listing with detailed statistics
     * @param _args - The tool arguments (empty for this tool)
     * @returns The listing result with epic details and statistics
     */
    async execute(_args: any): Promise<ToolResult> {
        const storage = await this.getStorage()

        const allEpics = await storage.loadAllEpics()

        if (allEpics.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                result: {
                                    epics: [],
                                    summary: {
                                        totalCount: 0,
                                        completedCount: 0,
                                        inProgressCount: 0,
                                        blockedCount: 0,
                                        totalTasks: 0,
                                        completedTasks: 0,
                                    },
                                },
                                status: 'warning',
                                guidance: {
                                    next_steps: [
                                        'Create your first epic to organize work',
                                        'View existing ideas to understand project structure',
                                        'Initialize project if not done yet',
                                    ],
                                    context: 'No epics found in the project',
                                    recommendations: [
                                        'Epics organize related tasks into logical implementation phases',
                                        'Start by creating epics within existing ideas',
                                        'Use hierarchical structure: Ideas → Epics → Tasks',
                                    ],
                                    suggested_commands: [
                                        'pm create_epic "My First Epic"',
                                        'pm list_all_ideas',
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
                    entityType: 'epic',
                    operation: 'list',
                    operationSuccess: true,
                    totalCount: 0,
                    completedCount: 0,
                    inProgressCount: 0,
                    blockedCount: 0,
                },
            }
        }

        const allTasks = await storage.loadAllTasks()

        const epicsWithStats = []
        for (const epic of allEpics) {
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

            const parentIdea = await storage.loadIdea(epic.ideaId)
            const ideaTitle = parentIdea ? parentIdea.title : 'Unknown Idea'

            epicsWithStats.push({
                ...epic,
                ideaTitle,
                taskCount: epicTasks.length,
                completedTasks,
                inProgressTasks,
                blockedTasks,
                progressPercent:
                    epicTasks.length > 0
                        ? Math.round((completedTasks / epicTasks.length) * 100)
                        : 0,
            })
        }

        epicsWithStats.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 }
            const priorityDiff =
                priorityOrder[b.priority] - priorityOrder[a.priority]
            if (priorityDiff !== 0) return priorityDiff
            return b.createdAt.getTime() - a.createdAt.getTime()
        })

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

        const statusCounts = this.getStatusCounts(allEpics)
        const priorityCounts = this.getPriorityCounts(allEpics)

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                epics: epicsWithStats.map((epic) => ({
                                    id: epic.id,
                                    title: epic.title,
                                    description: epic.description,
                                    status: epic.status,
                                    priority: epic.priority,
                                    createdAt: epic.createdAt.toISOString(),
                                    parentIdeaTitle: epic.ideaTitle,
                                    taskCount: epic.taskCount,
                                    completedTasks: epic.completedTasks,
                                    inProgressTasks: epic.inProgressTasks,
                                    blockedTasks: epic.blockedTasks,
                                    progressPercent: epic.progressPercent,
                                })),
                                summary: {
                                    totalCount: allEpics.length,
                                    completedCount: allEpics.filter(
                                        (e) => e.status === 'done'
                                    ).length,
                                    inProgressCount: allEpics.filter(
                                        (e) => e.status === 'in-progress'
                                    ).length,
                                    blockedCount: allEpics.filter(
                                        (e) => e.status === 'blocked'
                                    ).length,
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
                                    allEpics,
                                    epicsWithStats
                                ),
                                context: `Found ${allEpics.length} epics with ${totalTasks} total tasks (${completedTasksTotal} completed)`,
                                recommendations:
                                    this.getRecommendations(epicsWithStats),
                                suggested_commands: [
                                    'pm create_epic "Epic Title"',
                                    'pm get_epic [EPIC-ID]',
                                    'pm list_all_tasks',
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
                entityType: 'epic',
                operation: 'list',
                operationSuccess: true,
                totalCount: allEpics.length,
                completedCount: allEpics.filter((e) => e.status === 'done')
                    .length,
                inProgressCount: allEpics.filter(
                    (e) => e.status === 'in-progress'
                ).length,
                blockedCount: allEpics.filter((e) => e.status === 'blocked')
                    .length,
                totalTasks: totalTasks,
                completedTasks: completedTasksTotal,
                taskProgressPercent:
                    totalTasks > 0
                        ? Math.round((completedTasksTotal / totalTasks) * 100)
                        : 0,
            },
        }
    }

    private getNextSteps(allEpics: any[], epicsWithStats: any[]): string[] {
        const nextSteps = []

        if (allEpics.length === 0) {
            nextSteps.push('Create your first epic to organize work')
            nextSteps.push(
                'View existing ideas to understand project structure'
            )
        } else {
            const blockedEpics = epicsWithStats.filter(
                (e) => e.blockedTasks > 0
            )
            const inProgressEpics = epicsWithStats.filter(
                (e) => e.status === 'in-progress'
            )
            const highPriorityEpics = epicsWithStats.filter(
                (e) => e.priority === 'high'
            )

            if (blockedEpics.length > 0) {
                nextSteps.push(
                    `Address ${blockedEpics.length} epics with blocked tasks`
                )
            }

            if (inProgressEpics.length > 0) {
                nextSteps.push(
                    `Continue work on ${inProgressEpics.length} in-progress epics`
                )
            }

            if (highPriorityEpics.length > 0) {
                nextSteps.push(
                    `Focus on ${highPriorityEpics.length} high-priority epics`
                )
            }
        }

        nextSteps.push('Use next_task to get optimal work recommendations')
        nextSteps.push('Review epic progress and adjust priorities as needed')

        return nextSteps
    }

    private getRecommendations(epicsWithStats: any[]): string[] {
        const recommendations = []

        if (epicsWithStats.length === 0) {
            recommendations.push(
                'Start by creating epics within existing ideas'
            )
            recommendations.push(
                'Use hierarchical structure: Ideas → Epics → Tasks'
            )
        } else {
            const blockedEpics = epicsWithStats.filter(
                (e) => e.blockedTasks > 0
            )
            const lowProgressEpics = epicsWithStats.filter(
                (e) => e.progressPercent < 25
            )
            const nearCompleteEpics = epicsWithStats.filter(
                (e) => e.progressPercent > 80
            )

            if (blockedEpics.length > 0) {
                recommendations.push(
                    'Focus on unblocking tasks in blocked epics'
                )
            }

            if (nearCompleteEpics.length > 0) {
                recommendations.push(
                    'Push to complete epics that are near completion'
                )
            }

            if (lowProgressEpics.length > 0) {
                recommendations.push(
                    'Break down low-progress epics into more actionable tasks'
                )
            }
        }

        recommendations.push('Monitor epic progress regularly for bottlenecks')
        recommendations.push('Adjust epic priorities based on project needs')

        return recommendations
    }

    /**
     * Calculates status distribution counts for epics
     * @param epics - Array of epics
     * @returns Object with status counts
     */
    private getStatusCounts(epics: any[]): { [key: string]: number } {
        const counts: { [key: string]: number } = {}
        epics.forEach((epic) => {
            counts[epic.status] = (counts[epic.status] || 0) + 1
        })
        return counts
    }

    /**
     * Calculates priority distribution counts for epics
     * @param epics - Array of epics
     * @returns Object with priority counts
     */
    private getPriorityCounts(epics: any[]): { [key: string]: number } {
        const counts: { [key: string]: number } = {}
        epics.forEach((epic) => {
            counts[epic.priority] = (counts[epic.priority] || 0) + 1
        })
        return counts
    }
}
