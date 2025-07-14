import { BaseTool } from './base.js'
import { CreateEpicTool } from './create-epic.js'
import { CreateIdeaTool } from './create-idea.js'
import { CreateTaskTool } from './create-task.js'
import { DeleteEntityTool } from './delete-entity.js'
import { GetDependenciesTool } from './get-dependencies.js'
import { GetEpicTool } from './get-epic.js'
import { GetIdeaTool } from './get-idea.js'
import { GetTaskTool } from './get-task.js'
import { InitProjectTool } from './init-project.js'
import { ListAllEpicsTool } from './list-all-epics.js'
import { ListAllIdeasTool } from './list-all-ideas.js'
import { ListAllTasksTool } from './list-all-tasks.js'
import { NextTaskTool } from './next-task.js'
import { UpdateEpicTool } from './update-epic.js'
import { UpdateIdeaTool } from './update-idea.js'
import { UpdateTaskTool } from './update-task.js'

export class ToolRegistry {
    private tools: Map<string, BaseTool> = new Map()

    constructor() {
        const toolInstances = [
            new InitProjectTool(),
            new CreateIdeaTool(),
            new CreateEpicTool(),
            new CreateTaskTool(),
            new DeleteEntityTool(),
            new UpdateTaskTool(),
            new UpdateIdeaTool(),
            new UpdateEpicTool(),
            new NextTaskTool(),
            new GetTaskTool(),
            new GetEpicTool(),
            new GetIdeaTool(),
            new GetDependenciesTool(),
            new ListAllIdeasTool(),
            new ListAllEpicsTool(),
            new ListAllTasksTool(),
        ]

        for (const tool of toolInstances) {
            this.tools.set(tool.getName(), tool)
        }
    }

    getTool(name: string): BaseTool | undefined {
        return this.tools.get(name)
    }

    getAllTools(): BaseTool[] {
        return Array.from(this.tools.values())
    }

    getToolDefinitions(): Array<{
        name: string
        description: string
        inputSchema: object
    }> {
        return this.getAllTools().map((tool) => ({
            name: tool.getName(),
            description: tool.getDescription(),
            inputSchema: tool.getInputSchema(),
        }))
    }
}
