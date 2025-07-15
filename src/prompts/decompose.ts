import { BasePrompt } from './base.js'

export class Decompose extends BasePrompt {
    getName(): string {
        return 'decompose'
    }

    getDescription(): string {
        return 'Decompose epics and ideas into manageable tasks'
    }

    getArguments(): Array<{
        name: string
        description: string
        required: boolean
    }> {
        return [
            {
                name: 'entityId',
                description: 'Entity ID to decompose (e.g., IDEA-5, EPIC-12)',
                required: true,
            },
        ]
    }

    async generatePrompt(args: any): Promise<{
        description: string
        messages: Array<{
            role: 'user' | 'assistant'
            content: {
                type: 'text'
                text: string
            }
        }>
    }> {
        return this.generateDecompositionPrompt(args)
    }

    async generateDecompositionPrompt(args: { entityId: string }): Promise<{
        description: string
        messages: Array<{
            role: 'user' | 'assistant'
            content: {
                type: 'text'
                text: string
            }
        }>
    }> {
        const { entityId } = args

        // Parse entity type from ID (IDEA-5 → idea, EPIC-12 → epic)
        const entityType = entityId.startsWith('IDEA-') ? 'idea' : 'epic'

        return {
            description: `Decompose ${entityType} ${entityId}`,
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: this.buildDecompositionPrompt(
                            entityType,
                            entityId
                        ),
                    },
                },
            ],
        }
    }

    private buildDecompositionPrompt(type: string, entityId: string): string {
        return `You are helping to decompose ${entityId} into manageable ${type === 'idea' ? 'epics and tasks' : 'tasks'}.

**Before decomposing:**
- Verify the entity exists and is accessible
- Check if entity is already sufficiently decomposed
- Ensure entity description provides enough detail for meaningful breakdown
- If entity is not found or insufficient detail, explain what's needed

First, load the ${type} data using the appropriate MCP tool:
- For ideas: get_idea tool with ideaId="${entityId}"
- For epics: get_epic tool with epicId="${entityId}"

**IMPORTANT**: Carefully analyze the ${type} description that you loaded - it contains key information about requirements, scope, and implementation details. Use this description as your primary source for decomposition.

**Think hard** about the most logical way to break down this work into meaningful deliverables.

## Decomposition Guidelines:

**Task Sizing:**
- Each task should be 2-5 days of work (avoid overly granular 1-day tasks)
- Focus on meaningful deliverables, not micro-tasks
- Tasks should have clear ownership (one person can complete)

**Decomposition Strategy:**
- Base decomposition primarily on the ${type} description you loaded
- Look for natural boundaries in the described functionality
- Group related work into cohesive tasks
- Avoid breaking down into too many small pieces

**Each Task Should Include:**
- Title that starts with action verb
- Clear description with acceptance criteria
- Dependencies on other tasks (if any)
- Estimated effort in days (2-5 days typically)

**Quality Validation:**
- Each task should be independently deliverable
- Dependencies should be explicit and minimal
- Estimates should reflect realistic complexity
- Tasks should align with existing project architecture
- Tasks represent meaningful deliverables
- Avoid micro-management level granularity
- Clear definition of done
- Realistic scope for the estimated timeframe

Analyze the ${type} description thoroughly and create a sensible breakdown that delivers the functionality described without being overly detailed.

**After creating the decomposition, provide structured guidance:**
- Suggest next steps for task management (prioritization, assignment, etc.)
- Indicate if any tasks need further breakdown or clarification
- Highlight critical path dependencies that could block progress
- Recommend task prioritization approach based on dependencies and risk
- Note any tasks that might require additional research or spikes
- Suggest which tasks could be worked on in parallel
- Identify any missing context or requirements that should be gathered`
    }
}
