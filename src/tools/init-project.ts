import { promises as fs } from 'fs'
import { join } from 'path'

import { BaseTool, ToolResult } from './base.js'

export class InitProjectTool extends BaseTool {
    constructor() {
        super()
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    getName(): string {
        return 'init_project'
    }

    /**
     * Returns the description of the tool with AI-guidance structure
     * @returns The tool description with usage context
     */
    getDescription(): string {
        return `Initialize project structure for task management: creates .product-task/ directory, database.sqlite for data storage, and project-config.json for configuration.
        
        WHEN TO USE:
        - Starting a new project with MCP Task Manager
        - Setting up task management infrastructure
        - First-time project initialization
        - Resetting project structure (if needed)
        
        PARAMETERS:
        - No parameters required - automatically detects project context
        
        USAGE CONTEXT:
        - Run once per project to set up infrastructure
        - Safe to run multiple times (checks for existing setup)
        - Analyzes package.json and README.md for project details
        - Creates necessary directories and configuration files
        
        EXPECTED OUTCOMES:
        - .product-task/ directory created with SQLite database
        - project-config.json with project metadata and ID prefixes
        - Ready-to-use task management system
        - Clear next steps for creating first ideas and tasks`
    }

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    getInputSchema(): object {
        return {
            type: 'object',
            properties: {},
            required: [],
        }
    }

    /**
     * Executes the project initialization process
     * @param _args - The tool arguments (empty for this tool)
     * @returns The initialization result with project setup details
     */
    async execute(_args: any): Promise<ToolResult> {
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
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                result: {
                                    status: 'already_initialized',
                                    structure: {
                                        dataDirectory: '.product-task/',
                                        database: 'database.sqlite',
                                        config: 'project-config.json',
                                    },
                                },
                                status: 'success',
                                guidance: {
                                    next_steps: [
                                        'Project is ready for task management',
                                        'Create your first idea to get started',
                                        'Use existing tools to manage tasks and progress',
                                    ],
                                    context:
                                        'MCP Task Manager is already initialized and ready to use',
                                    recommendations: [
                                        'Continue using existing task management tools',
                                        'Start with creating ideas and breaking them into epics',
                                        'Use next_task tool to get optimal work recommendations',
                                    ],
                                    suggested_commands: [
                                        'pm create_idea "My First Idea"',
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
                    operation: 'init',
                    operationSuccess: true,
                    alreadyInitialized: true,
                    hasDataDir: true,
                    hasDatabase: true,
                    hasConfig: true,
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

        await this.getStorage()

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            result: {
                                status: 'initialized',
                                created: {
                                    dataDirectory: '.product-task/',
                                    database: 'database.sqlite',
                                    config: 'project-config.json',
                                },
                                project: {
                                    name: projectInfo.name,
                                    description: projectInfo.description,
                                },
                                entitySystem: {
                                    prefixes: config.prefixes,
                                    separator: config.separator,
                                },
                            },
                            status: 'success',
                            guidance: {
                                next_steps: this.getNextSteps(false),
                                context: `MCP Task Manager initialized successfully for project "${projectInfo.name}"`,
                                recommendations: this.getRecommendations(false),
                                workflow_steps: [
                                    'Create your first idea using create_idea tool',
                                    'Break idea into epics using create_epic tool',
                                    'Add specific tasks using create_task tool',
                                    'Start working and track progress with update_task tool',
                                    'Use next_task for optimal work recommendations',
                                ],
                                suggested_commands: [
                                    'pm create_idea "My First Idea"',
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
                operation: 'init',
                operationSuccess: true,
                alreadyInitialized: false,
                projectName: projectInfo.name,
                hasDataDir: true,
                hasDatabase: true,
                hasConfig: true,
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

    private getNextSteps(alreadyInitialized: boolean): string[] {
        const nextSteps = []

        if (alreadyInitialized) {
            nextSteps.push('Project is ready for task management')
            nextSteps.push('Create your first idea to get started')
            nextSteps.push('Use existing tools to manage tasks and progress')
        } else {
            nextSteps.push('Project infrastructure successfully created')
            nextSteps.push('Create your first idea to organize work')
            nextSteps.push(
                'Break ideas into epics and tasks for detailed planning'
            )
            nextSteps.push(
                'Use next_task tool to get optimal work recommendations'
            )
        }

        nextSteps.push('Explore available tools for task management')
        nextSteps.push('Review project structure and entity organization')

        return nextSteps
    }

    private getRecommendations(alreadyInitialized: boolean): string[] {
        const recommendations = []

        if (alreadyInitialized) {
            recommendations.push(
                'Continue using existing task management tools'
            )
            recommendations.push(
                'Start with creating ideas and breaking them into epics'
            )
        } else {
            recommendations.push(
                'Start with 1-2 main ideas for better organization'
            )
            recommendations.push(
                'Use hierarchical structure: Ideas → Epics → Tasks'
            )
            recommendations.push(
                'Set clear priorities and dependencies between tasks'
            )
        }

        recommendations.push(
            'Use next_task tool for optimal work recommendations'
        )
        recommendations.push('Track progress regularly with update_task tool')
        recommendations.push('Review and adjust project structure as needed')

        return recommendations
    }
}
