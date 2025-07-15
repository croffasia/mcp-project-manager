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
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Update idea properties (title, description, status, priority) with automatic change tracking and timestamp updates.
        
        WHEN TO USE:
        - Starting work on an idea (status → in-progress)
        - Updating idea priority based on business needs
        - Refining idea title or description
        - Marking ideas as done or blocked
        - Deferring ideas for later consideration
        
        PARAMETERS:
        - ideaId: Required ID of the idea to update
        - title: Update idea title
        - description: Update idea description
        - status: Change idea status (pending, in-progress, done, blocked, deferred)
        - priority: Update idea priority (low, medium, high)
        
        USAGE CONTEXT:
        - Critical for AI agents to track high-level feature development
        - Essential for maintaining product roadmap and vision
        - Used for business priority management and strategic planning
        - Supports progress tracking across multiple epics
        
        EXPECTED OUTCOMES:
        - Idea properties updated with change tracking
        - Automatic timestamp updates for audit trail
        - Clear feedback on changes made and progress statistics
        - Contextual next steps based on current state`
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
                    description: 'ID of the idea to update',
                },
                title: { type: 'string', description: 'Update idea title' },
                description: {
                    type: 'string',
                    description: 'Update idea description',
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
                    description: 'Update idea status',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Update idea priority',
                },
            },
            required: ['ideaId'],
        }
    }

    /**
     * Executes the idea update process with change tracking
     * @param args - The tool arguments containing ideaId and optional update fields
     * @returns The update result with change summary and next steps
     */
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

        // Get epics statistics for context
        const epics = idea.epics || []
        const completedEpics = epics.filter((e) => e.status === 'done').length
        const inProgressEpics = epics.filter(
            (e) => e.status === 'in-progress'
        ).length
        const blockedEpics = epics.filter((e) => e.status === 'blocked').length

        if (changes.length === 0) {
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
                                        status: idea.status,
                                        priority: idea.priority,
                                        description: idea.description,
                                        epicsCount: epics.length,
                                        completedEpics: completedEpics,
                                        progressPercent:
                                            epics.length > 0
                                                ? Math.round(
                                                      (completedEpics /
                                                          epics.length) *
                                                          100
                                                  )
                                                : 0,
                                    },
                                    changes: [],
                                    reason: 'no_changes',
                                },
                                status: 'warning',
                                guidance: {
                                    next_steps: [
                                        'Specify different values to make changes',
                                        'View idea details to understand current state',
                                        'Create epics to break down the idea',
                                    ],
                                    context: `No changes made to idea "${idea.title}"`,
                                    recommendations: [
                                        'Use get_idea to view current idea details',
                                        'Create epics to start implementing the idea',
                                        'Update status when work begins on this idea',
                                    ],
                                    suggested_commands: [
                                        `pm get_idea ${idea.id}`,
                                        `pm create epic "New Epic for ${idea.title}"`,
                                        `pm list epics`,
                                        `pm update_idea ${idea.id} status in-progress`,
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
                    operation: 'update',
                    operationSuccess: false,
                    reason: 'no_changes',
                    currentStatus: idea.status,
                    currentPriority: idea.priority,
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
                                idea: {
                                    id: idea.id,
                                    title: idea.title,
                                    status: idea.status,
                                    priority: idea.priority,
                                    description: idea.description,
                                    updatedAt: idea.updatedAt.toISOString(),
                                    epicsCount: epics.length,
                                    completedEpics: completedEpics,
                                    inProgressEpics: inProgressEpics,
                                    blockedEpics: blockedEpics,
                                    progressPercent:
                                        epics.length > 0
                                            ? Math.round(
                                                  (completedEpics /
                                                      epics.length) *
                                                      100
                                              )
                                            : 0,
                                },
                                changes: changes,
                                statusTransition: {
                                    from: oldStatus,
                                    to: idea.status,
                                    isProgression: this.isProgression(
                                        oldStatus,
                                        idea.status
                                    ),
                                },
                                priorityChange: {
                                    from: oldPriority,
                                    to: idea.priority,
                                    changed: oldPriority !== idea.priority,
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    idea,
                                    oldStatus,
                                    validatedArgs
                                ),
                                context: `Idea "${idea.title}" updated with ${changes.length} changes`,
                                recommendations: this.getRecommendations(
                                    idea,
                                    oldStatus,
                                    validatedArgs
                                ),
                                suggested_commands: [
                                    `pm get_idea ${idea.id}`,
                                    `pm create epic "New Epic for ${idea.title}"`,
                                    `pm list epics`,
                                    `pm next_task`,
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
        idea: any,
        oldStatus: string,
        validatedArgs: any
    ): string[] {
        const nextSteps = []

        if (idea.status === 'in-progress' && oldStatus === 'pending') {
            nextSteps.push(
                'Create epics to break down the idea into manageable phases'
            )
            nextSteps.push('Define clear success criteria for the idea')
        } else if (idea.status === 'done' && oldStatus !== 'done') {
            nextSteps.push('Idea completed successfully')
            nextSteps.push(
                'Review completed epics and document lessons learned'
            )
        } else if (idea.status === 'blocked') {
            nextSteps.push('Identify and resolve blocking issues')
            nextSteps.push('Consider adjusting scope or approach')
        } else if (idea.status === 'deferred') {
            nextSteps.push('Document reasons for deferral')
            nextSteps.push('Set review date for future consideration')
        }

        if (validatedArgs.priority) {
            nextSteps.push('Align team priorities with updated idea priority')
        }

        if (validatedArgs.title || validatedArgs.description) {
            nextSteps.push('Communicate changes to stakeholders')
        }

        nextSteps.push('Review idea progress and associated epics')

        return nextSteps
    }

    private getRecommendations(
        idea: any,
        oldStatus: string,
        validatedArgs: any
    ): string[] {
        const recommendations = []

        if (idea.status === 'in-progress') {
            recommendations.push(
                'Break down idea into specific epics with clear deliverables'
            )
            recommendations.push(
                'Establish regular progress reviews and milestone tracking'
            )

            if (oldStatus === 'pending') {
                recommendations.push(
                    'Define clear success criteria and acceptance criteria'
                )
            }
        }

        if (idea.status === 'done') {
            recommendations.push('Ensure all epics are completed and validated')
            recommendations.push(
                'Conduct retrospective to capture lessons learned'
            )

            if (oldStatus !== 'done') {
                recommendations.push(
                    'Document outcomes and business value achieved'
                )
            }
        }

        if (idea.status === 'blocked') {
            recommendations.push(
                'Document blockers clearly and assign ownership'
            )
            recommendations.push(
                'Explore alternative approaches or scope adjustments'
            )

            if (oldStatus === 'in-progress') {
                recommendations.push(
                    'Assess impact on ongoing work and communicate to team'
                )
            }
        }

        if (idea.priority === 'high') {
            recommendations.push(
                'Allocate dedicated resources for high-priority ideas'
            )
            recommendations.push(
                'Provide regular progress updates to stakeholders'
            )
        }

        if (validatedArgs.description) {
            recommendations.push(
                'Keep idea descriptions clear and outcome-focused'
            )
        }

        recommendations.push(
            'Maintain alignment between idea status and epic progress'
        )
        recommendations.push(
            'Regular review of idea progress and business value'
        )

        return recommendations
    }
}
