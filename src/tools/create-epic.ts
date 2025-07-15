import { z } from 'zod'

import { Epic, Priority, TaskStatus } from '../types.js'
import { BaseTool, ToolResult } from './base.js'

const createEpicSchema = z.object({
    ideaId: z.string(),
    title: z.string(),
    description: z.string(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
})

export class CreateEpicTool extends BaseTool {
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'create_epic'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Create a new epic within a specific idea - epics group related tasks together.
        
        WHEN TO USE:
        - Breaking down large ideas into manageable phases
        - Organizing related tasks under common themes
        - Creating development phases within an idea
        - Structuring work into logical components
        
        PARAMETERS:
        - ideaId: ID of the parent idea (format: IDEA-N)
        - title: Descriptive name for the epic
        - description: Detailed explanation of epic scope
        - priority: Optional priority level (low, medium, high)
        
        USAGE CONTEXT:
        - Use after creating an idea
        - Epics should contain 3-8 related tasks
        - Should represent significant work phases
        
        EXPECTED OUTCOMES:
        - New epic created within specified idea
        - Ready for task creation and assignment
        - Integrated into project hierarchy
        - Clear next steps for task breakdown`
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
                    description: 'ID of the parent idea',
                },
                title: { type: 'string', description: 'Title of the epic' },
                description: {
                    type: 'string',
                    description: 'Description of the epic',
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Priority of the epic',
                },
            },
            required: ['ideaId', 'title', 'description'],
        }
    }

    /**
     * Executes the epic creation process
     * @param args - The tool arguments containing ideaId, title, description, and optional priority
     * @returns The creation result with epic details and next steps
     */
    async execute(args: any): Promise<ToolResult> {
        // Check approval requirement first
        this.validateApproval(args)

        const validatedArgs = this.validate(createEpicSchema, args)
        const storage = await this.getStorage()

        const idea = await storage.loadIdea(validatedArgs.ideaId)
        if (!idea) {
            throw new Error(`Idea ${validatedArgs.ideaId} not found`)
        }

        const epic: Epic = {
            id: await storage.getNextEpicId(),
            title: validatedArgs.title,
            description: validatedArgs.description,
            status: 'pending' as TaskStatus,
            priority: (validatedArgs.priority as Priority) || 'medium',
            ideaId: validatedArgs.ideaId,
            tasks: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        await storage.saveEpic(epic)

        idea.epics.push(epic)
        await storage.saveIdea(idea)

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
                                    ideaId: epic.ideaId,
                                    createdAt: epic.createdAt.toISOString(),
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(epic),
                                context: `Created epic "${epic.title}" within idea - ready for task creation`,
                                recommendations: this.getRecommendations(epic),
                                suggested_commands: [
                                    `pm create task "${epic.title} - Setup"`,
                                    `pm get_epic ${epic.id}`,
                                    `pm list epics`,
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
                operation: 'create',
                operationSuccess: true,
                parentIdeaId: validatedArgs.ideaId,
            },
        }
    }

    private getNextSteps(epic: any): string[] {
        return [
            'Create 3-8 specific tasks for this epic',
            'Define clear deliverables for each task',
            'Consider task dependencies and sequencing',
            'Set appropriate priorities for tasks',
        ]
    }

    private getRecommendations(epic: any): string[] {
        const recommendations = []

        if (epic.priority === 'high') {
            recommendations.push(
                'High priority epic - create tasks immediately'
            )
        }

        if (epic.description.length < 100) {
            recommendations.push(
                'Consider adding more detailed epic description'
            )
        }

        recommendations.push('Break into 3-8 actionable tasks')
        recommendations.push('Define clear acceptance criteria for each task')

        return recommendations
    }
}
