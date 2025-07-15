import { z } from 'zod'

import { Idea, Priority, TaskStatus } from '../types.js'
import { BaseTool, ToolResult } from './base.js'

const createIdeaSchema = z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
})

export class CreateIdeaTool extends BaseTool {
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'create_idea'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Create a new high-level feature idea that can contain multiple epics.
        
        WHEN TO USE:
        - Starting a new major feature or project
        - Organizing high-level concepts that need multiple epics
        - Creating strategic development initiatives
        - Planning large-scale features or products
        
        PARAMETERS:
        - title: Short, descriptive name for the idea
        - description: Detailed explanation of the idea's purpose and scope
        - priority: Optional priority level (low, medium, high)
        
        USAGE CONTEXT:
        - Use at the beginning of feature planning
        - Ideas should be broad enough to contain 2-4 epics
        - Should represent significant business value
        
        EXPECTED OUTCOMES:
        - New idea created with unique ID
        - Ready for epic breakdown and planning
        - Integrated into project management system
        - Clear next steps for development progression`
    }
    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Title of the idea' },
                description: {
                    type: 'string',
                    description: 'Description of the idea',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Priority of the idea',
                },
            },
            required: ['title', 'description'],
        }
    }

    /**
     * Executes the idea creation process
     * @param args - The tool arguments containing title, description, and optional priority
     * @returns The creation result with idea details and next steps
     */
    async execute(args: any): Promise<ToolResult> {
        // Check approval requirement first
        this.validateApproval(args)

        const validatedArgs = this.validate(createIdeaSchema, args)
        const storage = await this.getStorage()

        const idea: Idea = {
            id: await storage.getNextIdeaId(),
            title: validatedArgs.title,
            description: validatedArgs.description,
            status: 'pending' as TaskStatus,
            priority: (validatedArgs.priority as Priority) || 'medium',
            createdAt: new Date(),
            updatedAt: new Date(),
            epics: [],
        }

        await storage.saveIdea(idea)

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
                                    createdAt: idea.createdAt.toISOString(),
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(idea),
                                context: `Created idea "${idea.title}" - ready for epic breakdown`,
                                recommendations: this.getRecommendations(idea),
                                suggested_commands: [
                                    `pm create epic "${idea.title} - Phase 1"`,
                                    `pm get_idea ${idea.id}`,
                                    `pm list ideas`,
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
                operation: 'create',
                operationSuccess: true,
            },
        }
    }

    private getNextSteps(idea: any): string[] {
        return [
            'Break down idea into 2-4 epics representing major phases',
            'Define clear objectives for each epic',
            'Consider dependencies between epics',
            'Start with highest priority epic',
        ]
    }

    private getRecommendations(idea: any): string[] {
        const recommendations = []

        if (idea.priority === 'high') {
            recommendations.push(
                'High priority - consider starting immediately'
            )
        }

        if (idea.description.length < 100) {
            recommendations.push('Consider adding more detailed description')
        }

        recommendations.push('Break into 2-4 epics for optimal management')
        recommendations.push('Define clear success criteria for the idea')

        return recommendations
    }
}
