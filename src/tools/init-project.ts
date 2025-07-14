import { promises as fs } from 'fs'
import { join } from 'path'

import { BaseTool, ToolResult } from './base.js'

export class InitProjectTool extends BaseTool {
    constructor() {
        super()
    }

    getName(): string {
        return 'init_project'
    }

    getDescription(): string {
        return 'Initialize project structure for task management: creates .product-task/ directory, database.sqlite for data storage, and project-config.json for configuration.'
    }

    getInputSchema(): object {
        return {
            type: 'object',
            properties: {},
            required: [],
        }
    }

    async execute(args: any): Promise<ToolResult> {
        const customDataDir = process.env.MCP_TASK_DATA_DIR
        const projectPath = customDataDir || process.cwd()
        const dataDir = join(projectPath, '.product-task')
        const configPath = join(projectPath, 'project-config.json')
        const dbPath = join(dataDir, 'database.sqlite')

        const isAlreadyInitialized = await this.checkIfAlreadyInitialized(
            configPath,
            dataDir,
            dbPath
        )

        if (isAlreadyInitialized) {
            const result = `[INFO] MCP Task Manager is already initialized!

[DIR] Existing structure:
- .product-task/ directory [OK]
- .product-task/database.sqlite file [OK]
- project-config.json [OK]

[START] You can continue using MCP Task Manager tools:
1. Create idea: \`create_idea\`
2. View tasks: \`list_all_tasks\`
3. Get next task: \`next_task\``

            return {
                content: [
                    {
                        type: 'text',
                        text: result,
                    },
                ],
                metadata: {
                    operation: 'init',
                    operationSuccess: true,
                    alreadyInitialized: true,
                    projectName: 'Existing Project',
                    hasDataDir: true,
                    hasDatabase: true,
                    hasConfig: true,
                    suggestedCommands: [
                        'create_idea',
                        'list_all_tasks',
                        'next_task',
                    ],
                },
            }
        }

        const projectInfo = await this.analyzeProjectForConfig(projectPath)

        const config = {
            prefixes: {
                idea: 'IDEA',
                epic: 'EPIC',
                task: 'TSK',
                bug: 'BUG',
                rnd: 'RND',
            },
            separator: '-',
            project: {
                name: projectInfo.name,
                description: projectInfo.description,
            },
        }

        await fs.writeFile(configPath, JSON.stringify(config, null, 2))

        await fs.mkdir(dataDir, { recursive: true })

        const storage = await this.getStorage()

        const result = `[OK] MCP Task Manager initialized successfully!

[DIR] Created:
- .product-task/ directory
- database.sqlite with universal schema
- project-config.json with project details

[NEW] Universal entity system:
- All ideas, epics, tasks stored in one table
- Standalone entities supported (tasks without epics, epics without ideas)
- Fast SQLite queries and transactions

[START] Get started with your first workflow:
1. Create your first idea: Use \`create_idea\` tool
2. Break it into epics: Use \`create_epic\` tool
3. Add specific tasks: Use \`create_task\` tool
4. Start working: Use \`update_task\` tool
5. Track progress: Use \`update_task\` tool

[LIST] Useful tools:
- \`list_all_tasks\` - View all items
- \`next_task\` - Get next task to work on
- \`list_all_ideas\` - View all ideas
- \`list_all_epics\` - View all epics

[TIP] Pro tip: Start with 1-2 main ideas, then break them down into manageable epics and tasks!`

        return {
            content: [
                {
                    type: 'text',
                    text: result,
                },
            ],
            metadata: {
                operation: 'init',
                operationSuccess: true,
                alreadyInitialized: false,
                projectName: projectInfo.name,
                hasDataDir: true,
                hasDatabase: true,
                hasConfig: true,
                suggestedCommands: [
                    'create_idea',
                    'create_epic',
                    'create_task',
                    'list_all_tasks',
                    'next_task',
                ],
            },
        }
    }

    private async checkIfAlreadyInitialized(
        configPath: string,
        dataDir: string,
        dbPath: string
    ): Promise<boolean> {
        try {
            await fs.access(configPath)

            const stat = await fs.stat(dataDir)
            if (!stat.isDirectory()) {
                return false
            }

            await fs.access(dbPath)

            return true
        } catch (error) {
            return false
        }
    }

    private async analyzeProjectForConfig(
        projectPath: string
    ): Promise<{ name: string; description: string }> {
        try {
            const packagePath = join(projectPath, 'package.json')
            const packageExists = await fs
                .access(packagePath)
                .then(() => true)
                .catch(() => false)

            if (packageExists) {
                const packageContent = await fs.readFile(packagePath, 'utf-8')
                const packageJson = JSON.parse(packageContent)

                return {
                    name: packageJson.name || 'Unknown Project',
                    description:
                        packageJson.description ||
                        'Project managed with MCP Task Manager',
                }
            }

            const readmePath = join(projectPath, 'README.md')
            const readmeExists = await fs
                .access(readmePath)
                .then(() => true)
                .catch(() => false)

            if (readmeExists) {
                const readmeContent = await fs.readFile(readmePath, 'utf-8')
                const firstLine = readmeContent.split('\n')[0]
                const title = firstLine.replace(/^#\s*/, '').trim()

                return {
                    name: title || 'Project',
                    description: 'Project managed with MCP Task Manager',
                }
            }

            const projectName = projectPath.split('/').pop() || 'Project'

            return {
                name: projectName,
                description: 'Project managed with MCP Task Manager',
            }
        } catch (error) {
            return {
                name: 'Project',
                description: 'Project managed with MCP Task Manager',
            }
        }
    }
}
