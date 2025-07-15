import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const deleteEntitySchema = z.object({
    entityId: z.string(),
})

/**
 * Tool for deleting existing entities - permanently removes ideas, epics, or tasks including all dependencies
 */
export class DeleteEntityTool extends BaseTool {
    /**
     * Creates a new instance of DeleteTaskTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'delete_entity'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Delete an existing entity (idea, epic, or task) permanently - removes the entity and all its dependencies.
        
        WHEN TO USE:
        - Need to permanently remove unused ideas, epics, or tasks
        - Cleaning up development artifacts and experiments
        - Removing entities that are no longer relevant
        - Correcting project structure by removing mistaken entities
        
        PARAMETERS:
        - entityId: String identifier of the entity to delete (IDEA-N, EPIC-N, TSK-N, BUG-N, RND-N)
        
        USAGE CONTEXT:
        - Use with caution - deletion is permanent
        - For tasks: checks for dependent tasks and prevents deletion if found
        - For epics: deletes all contained tasks
        - For ideas: deletes all contained epics and tasks
        
        EXPECTED OUTCOMES:
        - Entity and all dependencies permanently removed
        - Confirmation of deletion with affected entity counts
        - Guidance on next steps after deletion
        - Suggestions for workflow continuation`
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                entityId: {
                    type: 'string',
                    description:
                        'ID of the entity to delete (idea, epic, or task)',
                },
            },
            required: ['entityId'],
        }
    }

    /**
     * Executes the entity deletion process
     * @param args - The tool arguments containing entityId
     * @returns The deletion result with confirmation details
     */
    async execute(args: any): Promise<ToolResult> {
        // Check approval requirement first
        this.validateApproval(args)

        const validatedArgs = this.validate(deleteEntitySchema, args)
        const storage = await this.getStorage()
        const entityId = validatedArgs.entityId

        // Determine entity type from ID
        const entityType = this.getEntityType(entityId)
        if (!entityType) {
            throw new Error(`Invalid entity ID format: ${entityId}`)
        }

        // Execute deletion based on entity type
        switch (entityType) {
            case 'idea':
                return await this.deleteIdea(entityId, storage)
            case 'epic':
                return await this.deleteEpic(entityId, storage)
            case 'task':
            case 'bug':
            case 'research':
                return await this.deleteTask(entityId, storage)
            default:
                throw new Error(`Unsupported entity type: ${entityType}`)
        }
    }

    /**
     * Determines entity type from ID
     * @param entityId - The entity ID
     * @returns The entity type or null if invalid
     */
    private getEntityType(entityId: string): string | null {
        if (entityId.startsWith('IDEA-')) return 'idea'
        if (entityId.startsWith('EPIC-')) return 'epic'
        if (entityId.startsWith('TSK-')) return 'task'
        if (entityId.startsWith('BUG-')) return 'bug'
        if (entityId.startsWith('RND-')) return 'research'
        return null
    }

    /**
     * Deletes an idea and all its epics and tasks
     * @param ideaId - The idea ID
     * @param storage - The storage instance
     * @returns The deletion result
     */
    private async deleteIdea(
        ideaId: string,
        storage: any
    ): Promise<ToolResult> {
        const idea = await storage.loadIdea(ideaId)
        if (!idea) {
            throw new Error(`Idea with ID ${ideaId} not found`)
        }

        let deletedCount = { epics: 0, tasks: 0 }

        // Delete all epics in the idea (and their tasks)
        for (const epic of idea.epics) {
            const epicData = await storage.loadEpic(epic.id)
            if (epicData) {
                // Delete all tasks in the epic
                for (const task of epicData.tasks) {
                    await storage.deleteTask(task.id)
                    deletedCount.tasks++
                }
                await storage.deleteEpic(epic.id)
                deletedCount.epics++
            }
        }

        // Delete the idea itself
        await storage.deleteIdea(ideaId)

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                deleted: {
                                    id: idea.id,
                                    title: idea.title,
                                    type: idea.type,
                                    status: idea.status,
                                    deletedEpicsCount: deletedCount.epics,
                                    deletedTasksCount: deletedCount.tasks,
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    'idea',
                                    idea.id,
                                    deletedCount
                                ),
                                context: `Idea "${idea.title}" and all its contents (${deletedCount.epics} epics, ${deletedCount.tasks} tasks) have been permanently deleted`,
                                recommendations: this.getRecommendations(
                                    'idea',
                                    deletedCount
                                ),
                                suggested_commands: [
                                    `pm list ideas`,
                                    `pm next`,
                                    `pm create idea "New Idea Title"`,
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
                operation: 'delete',
                operationSuccess: true,
                deletedEpicsCount: deletedCount.epics,
                deletedTasksCount: deletedCount.tasks,
            },
        }
    }

    /**
     * Deletes an epic and all its tasks
     * @param epicId - The epic ID
     * @param storage - The storage instance
     * @returns The deletion result
     */
    private async deleteEpic(
        epicId: string,
        storage: any
    ): Promise<ToolResult> {
        const epic = await storage.loadEpic(epicId)
        if (!epic) {
            throw new Error(`Epic with ID ${epicId} not found`)
        }

        let deletedTasksCount = 0

        // Delete all tasks in the epic
        for (const task of epic.tasks) {
            await storage.deleteTask(task.id)
            deletedTasksCount++
        }

        // Load parent idea to remove epic reference
        const idea = await storage.loadIdea(epic.ideaId)
        if (idea) {
            idea.epics = idea.epics.filter((e: any) => e.id !== epicId)
            await storage.saveIdea(idea)
        }

        // Delete the epic itself
        await storage.deleteEpic(epicId)

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                deleted: {
                                    id: epic.id,
                                    title: epic.title,
                                    type: epic.type,
                                    status: epic.status,
                                    parentIdeaId: epic.ideaId,
                                    deletedTasksCount: deletedTasksCount,
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    'epic',
                                    epic.ideaId,
                                    { epics: 0, tasks: deletedTasksCount }
                                ),
                                context: `Epic "${epic.title}" and all its tasks (${deletedTasksCount} tasks) have been permanently deleted`,
                                recommendations: this.getRecommendations(
                                    'epic',
                                    { epics: 0, tasks: deletedTasksCount }
                                ),
                                suggested_commands: [
                                    `pm get_idea ${epic.ideaId}`,
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
                entityType: 'epic',
                entityId: epic.id,
                operation: 'delete',
                operationSuccess: true,
                deletedTasksCount: deletedTasksCount,
                parentIdeaId: epic.ideaId,
            },
        }
    }

    /**
     * Deletes a task
     * @param taskId - The task ID
     * @param storage - The storage instance
     * @returns The deletion result
     */
    private async deleteTask(
        taskId: string,
        storage: any
    ): Promise<ToolResult> {
        const task = await storage.loadTask(taskId)
        if (!task) {
            throw new Error(`Task with ID ${taskId} not found`)
        }

        // Load parent epic to remove task reference
        const epic = await storage.loadEpic(task.epicId)
        if (!epic) {
            throw new Error(`Parent epic with ID ${task.epicId} not found`)
        }

        // Check for dependent tasks
        const allTasks = await storage.loadAllTasks()
        const dependentTasks = allTasks.filter(
            (t: any) => t.dependencies && t.dependencies.includes(taskId)
        )

        if (dependentTasks.length > 0) {
            const dependentTasksList = dependentTasks
                .map((t: any) => `${t.id} (${t.title})`)
                .join(', ')
            throw new Error(
                `Cannot delete task ${taskId} - it has dependent tasks: ${dependentTasksList}. Please remove dependencies first.`
            )
        }

        // Store task details for confirmation message
        const taskDetails = {
            id: task.id,
            title: task.title,
            type: task.type,
            status: task.status,
            epicId: task.epicId,
            epicTitle: epic.title,
            progressNotesCount: task.progressNotes?.length || 0,
        }

        // Remove task from epic
        epic.tasks = epic.tasks.filter((t: any) => t.id !== taskId)
        await storage.saveEpic(epic)

        // Delete task file
        await storage.deleteTask(taskId)

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                deleted: {
                                    id: taskDetails.id,
                                    title: taskDetails.title,
                                    type: taskDetails.type,
                                    status: taskDetails.status,
                                    parentEpicId: taskDetails.epicId,
                                    parentEpicTitle: taskDetails.epicTitle,
                                    progressNotesDeleted:
                                        taskDetails.progressNotesCount,
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(
                                    'task',
                                    taskDetails.epicId,
                                    { epics: 0, tasks: 1 }
                                ),
                                context: `Task "${taskDetails.title}" with ${taskDetails.progressNotesCount} progress notes has been permanently deleted`,
                                recommendations: this.getRecommendations(
                                    'task',
                                    { epics: 0, tasks: 1 }
                                ),
                                suggested_commands: [
                                    `pm get_epic ${taskDetails.epicId}`,
                                    `pm list tasks`,
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
                entityType:
                    taskDetails.type === 'bug'
                        ? 'bug'
                        : taskDetails.type === 'rnd'
                          ? 'research'
                          : 'task',
                entityId: taskDetails.id,
                operation: 'delete',
                operationSuccess: true,
                parentEpicId: taskDetails.epicId,
                progressNotesDeleted: taskDetails.progressNotesCount,
            },
        }
    }

    private getNextSteps(
        entityType: string,
        parentId: string,
        _deletedCount: any
    ): string[] {
        const nextSteps = []

        if (entityType === 'idea') {
            nextSteps.push('Review remaining ideas in project')
            nextSteps.push('Continue work on other ideas')
            nextSteps.push('Consider creating replacement idea if needed')
        } else if (entityType === 'epic') {
            nextSteps.push(`Review remaining epics in idea ${parentId}`)
            nextSteps.push('Continue work on other epics')
            nextSteps.push('Consider creating replacement epic if needed')
        } else if (entityType === 'task') {
            nextSteps.push(`Review remaining tasks in epic ${parentId}`)
            nextSteps.push('Continue work on other tasks')
            nextSteps.push('Consider creating replacement task if needed')
        }

        nextSteps.push('Use "pm next" to get optimal next task')
        nextSteps.push('Verify no dependencies were broken by deletion')

        return nextSteps
    }

    private getRecommendations(
        entityType: string,
        deletedCount: any
    ): string[] {
        const recommendations = []

        recommendations.push('⚠️ Deletion is permanent and cannot be undone')

        if (entityType === 'idea') {
            recommendations.push(
                `Removed ${deletedCount.epics} epics and ${deletedCount.tasks} tasks`
            )
            recommendations.push('This affects overall project structure')
        } else if (entityType === 'epic') {
            recommendations.push(
                `Removed ${deletedCount.tasks} tasks from the epic`
            )
            recommendations.push('This affects idea progress and structure')
        } else if (entityType === 'task') {
            recommendations.push('Task removed from parent epic')
            recommendations.push('Check for any broken dependencies')
        }

        recommendations.push('Continue with remaining work items')
        recommendations.push('Consider project structure after deletion')

        return recommendations
    }
}
