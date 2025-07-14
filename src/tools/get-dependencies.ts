import { z } from 'zod'

import { BaseTool, ToolResult } from './base.js'

const getDependenciesSchema = z.object({
    taskId: z.string(),
})

/**
 * Tool for retrieving and analyzing all dependencies for a task, showing status, blocking relationships, and dependency chain analysis
 */
export class GetDependenciesTool extends BaseTool {
    /**
     * Creates a new instance of GetDependenciesTool
     */
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'get_dependencies'
    }

    /**
     * Returns the description of the tool
     * @returns The tool description
     */
    getDescription(): string {
        return 'Retrieve and analyze all dependencies for a task showing status, blocking relationships, and dependency chain analysis'
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {
                taskId: { type: 'string', description: 'ID of the task' },
            },
            required: ['taskId'],
        }
    }

    /**
     * Executes the dependency analysis for a task
     * @param args - The tool arguments containing taskId
     * @returns The analysis result with dependency details and blocking status
     */
    async execute(args: any): Promise<ToolResult> {
        const validatedArgs = this.validate(getDependenciesSchema, args)
        const storage = await this.getStorage()

        const task = await storage.loadTask(validatedArgs.taskId)
        if (!task) {
            throw new Error(`Task ${validatedArgs.taskId} not found`)
        }

        const parentEpic = await storage.loadEpic(task.epicId)
        const epicTitle = parentEpic ? parentEpic.title : 'Unknown Epic'

        const dependencies = []
        if (task.dependencies && task.dependencies.length > 0) {
            for (const depId of task.dependencies) {
                const depTask = await storage.loadTask(depId)
                if (depTask) {
                    dependencies.push({
                        id: depTask.id,
                        title: depTask.title,
                        status: depTask.status,
                        type: depTask.type,
                        priority: depTask.priority,
                    })
                }
            }
        }

        let responseText = `[LINK] **Dependencies for Task: "${task.title}"**

**Task Details:**
- ID: ${task.id}
- Epic: ${epicTitle}
- Status: ${task.status}
- Type: ${task.type}
- Priority: ${task.priority}

**Dependencies (${dependencies.length}):**`

        if (dependencies.length === 0) {
            responseText += `
- No dependencies found

[OK] **This task has no blocking dependencies and can be started immediately!**`
        } else {
            responseText += `
${dependencies
    .map(
        (dep) => `- **${dep.title}** (${dep.id})
  - Status: ${dep.status}
  - Type: ${dep.type}
  - Priority: ${dep.priority}`
    )
    .join('\n')}

**Dependency Analysis:**
${this.analyzeDependencies(dependencies)}`
        }

        responseText += `

**Next Steps:**
- **View task details**: \`pm get_task ${task.id}\`
- **Update task status**: \`pm update task ${task.id} status in-progress\`
- **Add progress notes**: \`pm update task ${task.id} progress "Working on dependencies"\`
- **View all tasks**: \`pm list tasks\`

[TIP] **Pro tip**: Resolve blocked dependencies first for smoother workflow!`

        return {
            content: [
                {
                    type: 'text',
                    text: responseText,
                },
            ],
            metadata: {
                entityType: 'task',
                entityId: task.id,
                operation: 'get',
                operationSuccess: true,
                dependenciesCount: dependencies.length,
                hasBlockingDependencies: dependencies.some(
                    (d) => d.status !== 'done'
                ),
                completedDependencies: dependencies.filter(
                    (d) => d.status === 'done'
                ).length,
                blockedDependencies: dependencies.filter(
                    (d) => d.status === 'blocked'
                ).length,
                suggestedCommands: [
                    `pm get_task ${task.id}`,
                    `pm update task ${task.id} status in-progress`,
                    `pm list tasks`,
                ],
            },
        }
    }

    /**
     * Analyzes the dependencies to provide status insights and blocking information
     * @param dependencies - Array of dependency objects
     * @returns Formatted analysis string with dependency status insights
     */
    private analyzeDependencies(dependencies: any[]): string {
        const analysis = []

        const completedDeps = dependencies.filter((d) => d.status === 'done')
        const blockedDeps = dependencies.filter((d) => d.status === 'blocked')
        const inProgressDeps = dependencies.filter(
            (d) => d.status === 'in-progress'
        )
        const pendingDeps = dependencies.filter((d) => d.status === 'pending')

        if (completedDeps.length === dependencies.length) {
            analysis.push(
                '[OK] All dependencies are completed - ready to start!'
            )
        } else {
            if (blockedDeps.length > 0) {
                analysis.push(
                    `[BLOCK] ${blockedDeps.length} dependencies are blocked`
                )
            }
            if (inProgressDeps.length > 0) {
                analysis.push(
                    `[WAIT] ${inProgressDeps.length} dependencies are in progress`
                )
            }
            if (pendingDeps.length > 0) {
                analysis.push(
                    `⏸️ ${pendingDeps.length} dependencies are pending`
                )
            }
        }

        const highPriorityDeps = dependencies.filter(
            (d) => d.priority === 'high'
        )
        if (highPriorityDeps.length > 0) {
            analysis.push(
                `[FAST] ${highPriorityDeps.length} high-priority dependencies`
            )
        }

        return analysis.join('\n')
    }
}
