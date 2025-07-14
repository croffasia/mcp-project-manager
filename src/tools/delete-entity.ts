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
     * Returns the description of the tool
     * @returns The tool description
     */
    getDescription(): string {
        return 'Delete an existing entity (idea, epic, or task) permanently - removes the entity and all its dependencies (epics contain tasks, ideas contain epics and tasks)'
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

        const responseText = `[OK] **Idea deleted successfully!**

**Deleted Idea Details:**
├─ ID: \`${idea.id}\`
├─ Title: "${idea.title}"
├─ Type: ${idea.type}
├─ Status: ${idea.status}
├─ Epics Deleted: ${deletedCount.epics}
└─ Tasks Deleted: ${deletedCount.tasks}

**⚠️ IMPORTANT:**
- Idea and ALL its contents have been permanently removed
- ${deletedCount.epics} epics and ${deletedCount.tasks} tasks were deleted
- All progress notes and history have been deleted
- This operation cannot be undone`

        const nextSteps = `

**🎯 NEXT STEPS:**

**IMMEDIATE ACTIONS:**
1. **Review project**: \`pm list ideas\` - Check remaining ideas
2. **Continue work**: \`pm next\` - Get next available task
3. **Check dependencies**: Verify no other entities were depending on deleted items

**WORKFLOW RECOMMENDATIONS:**
- **List all ideas**: \`pm list ideas\`
- **Get next task**: \`pm next\`
- **Create replacement**: \`pm create idea "New Idea Title"\` (if needed)

[TIP] **For AI agents**: Idea deletion removes the entire hierarchy. This is a major operation that affects project structure.`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText + nextSteps,
                },
            ],
            metadata: {
                entityType: 'idea',
                entityId: idea.id,
                operation: 'delete',
                operationSuccess: true,
                deletedIdeaTitle: idea.title,
                deletedEpicsCount: deletedCount.epics,
                deletedTasksCount: deletedCount.tasks,
                suggestedCommands: [
                    `pm list ideas`,
                    `pm next`,
                    `pm create idea "New Idea Title"`,
                ],
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

        const responseText = `[OK] **Epic deleted successfully!**

**Deleted Epic Details:**
├─ ID: \`${epic.id}\`
├─ Title: "${epic.title}"
├─ Type: ${epic.type}
├─ Status: ${epic.status}
├─ Parent Idea: ${epic.ideaId}
└─ Tasks Deleted: ${deletedTasksCount}

**⚠️ IMPORTANT:**
- Epic and ALL its tasks have been permanently removed
- ${deletedTasksCount} tasks were deleted
- All progress notes and history have been deleted
- Epic removed from parent idea: ${epic.ideaId}
- This operation cannot be undone`

        const nextSteps = `

**🎯 NEXT STEPS:**

**IMMEDIATE ACTIONS:**
1. **Review idea**: \`pm get idea ${epic.ideaId}\` - Check remaining epics in idea
2. **Continue work**: \`pm next\` - Get next available task
3. **Check dependencies**: Verify no other entities were depending on deleted items

**WORKFLOW RECOMMENDATIONS:**
- **View idea progress**: \`pm get idea ${epic.ideaId}\`
- **List all epics**: \`pm list epics\`
- **Get next task**: \`pm next\`
- **Create replacement**: \`pm create epic "New Epic Title"\` (if needed)

[TIP] **For AI agents**: Epic deletion removes all contained tasks. This affects the idea's structure and progress.`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText + nextSteps,
                },
            ],
            metadata: {
                entityType: 'epic',
                entityId: epic.id,
                operation: 'delete',
                operationSuccess: true,
                deletedEpicTitle: epic.title,
                deletedTasksCount: deletedTasksCount,
                parentIdeaId: epic.ideaId,
                suggestedCommands: [
                    `pm get idea ${epic.ideaId}`,
                    `pm list epics`,
                    `pm next`,
                    `pm create epic "New Epic Title"`,
                ],
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

        const responseText = `[OK] **Task deleted successfully!**

**Deleted Task Details:**
├─ ID: \`${taskDetails.id}\`
├─ Title: "${taskDetails.title}"
├─ Type: ${taskDetails.type}
├─ Status: ${taskDetails.status}
├─ Epic: ${taskDetails.epicTitle}
└─ Progress Notes: ${taskDetails.progressNotesCount} notes removed

**⚠️ IMPORTANT:**
- Task has been permanently removed from the system
- All progress notes and task history have been deleted
- Task removed from parent epic: ${taskDetails.epicTitle}
- This operation cannot be undone`

        const nextSteps = `

**🎯 NEXT STEPS:**

**IMMEDIATE ACTIONS:**
1. **Review epic**: \`pm get epic ${taskDetails.epicId}\` - Check remaining tasks in epic
2. **Check dependencies**: Verify no other tasks were depending on this task
3. **Continue work**: \`pm next\` - Get next available task

**WORKFLOW RECOMMENDATIONS:**
- **View epic progress**: \`pm get epic ${taskDetails.epicId}\`
- **List all tasks**: \`pm list tasks\`
- **Get next task**: \`pm next\`
- **Create replacement**: \`pm create task "New Task Title"\` (if needed)

[TIP] **For AI agents**: Task deletion is permanent. Always verify task ID before deletion and ensure no other tasks depend on it.`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText + nextSteps,
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
                deletedTaskTitle: taskDetails.title,
                deletedTaskType: taskDetails.type,
                deletedTaskStatus: taskDetails.status,
                parentEpicId: taskDetails.epicId,
                parentEpicTitle: taskDetails.epicTitle,
                progressNotesDeleted: taskDetails.progressNotesCount,
                suggestedCommands: [
                    `pm get epic ${taskDetails.epicId}`,
                    `pm list tasks`,
                    `pm next`,
                    `pm create task "New Task Title"`,
                ],
            },
        }
    }
}
