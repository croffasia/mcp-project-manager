#!/usr/bin/env node
import { z } from 'zod'

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
    CallToolRequestSchema,
    ErrorCode,
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    ListToolsRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js'

import { PromptRegistry } from './prompts/index.js'
import { ToolRegistry } from './tools/index.js'

// Increase AbortSignal listeners limit to a reasonable value
// to avoid MaxListenersExceededWarning due to MCP SDK bug
process.setMaxListeners(0)

/**
 * MCP Task Manager Server
 * Handles task management operations through the Model Context Protocol
 */
class TaskManagerMCPServer {
    private server: Server
    private toolRegistry: ToolRegistry
    private promptRegistry: PromptRegistry

    /**
     * Initialize the MCP Task Manager Server
     */
    constructor() {
        this.toolRegistry = new ToolRegistry()
        this.promptRegistry = new PromptRegistry()
        this.server = new Server(
            {
                name: 'mcp-task-manager',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                    prompts: {},
                },
            }
        )

        this.setupHandlers()
    }

    /**
     * Set up request handlers for the MCP server
     */
    private setupHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: this.toolRegistry.getToolDefinitions(),
            }
        })

        this.server.setRequestHandler(
            CallToolRequestSchema,
            async (request) => {
                const { name, arguments: args } = request.params

                try {
                    const tool = this.toolRegistry.getTool(name)
                    if (!tool) {
                        throw new McpError(
                            ErrorCode.MethodNotFound,
                            `Unknown tool: ${name}`
                        )
                    }

                    const result = await tool.execute(args)
                    return {
                        content: result.content,
                        isError: result.isError,
                        _meta: result.metadata,
                    }
                } catch (error) {
                    if (error instanceof z.ZodError) {
                        throw new McpError(
                            ErrorCode.InvalidParams,
                            `Invalid parameters: ${error.issues.map((e: any) => e.message).join(', ')}`
                        )
                    }
                    throw new McpError(
                        ErrorCode.InternalError,
                        `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )

        // Prompts handlers
        this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return {
                prompts: this.promptRegistry.getPromptDefinitions(),
            }
        })

        this.server.setRequestHandler(
            GetPromptRequestSchema,
            async (request) => {
                const { name, arguments: args } = request.params

                try {
                    const prompt = this.promptRegistry.getPrompt(name)
                    if (!prompt) {
                        throw new McpError(
                            ErrorCode.MethodNotFound,
                            `Unknown prompt: ${name}`
                        )
                    }

                    if (!args || typeof args !== 'object') {
                        throw new McpError(
                            ErrorCode.InvalidParams,
                            `Arguments are required for ${name} prompt`
                        )
                    }

                    return await prompt.generatePrompt(args)
                } catch (error) {
                    if (error instanceof McpError) {
                        throw error
                    }
                    throw new McpError(
                        ErrorCode.InternalError,
                        `Error generating prompt: ${error instanceof Error ? error.message : String(error)}`
                    )
                }
            }
        )
    }

    /**
     * Start the MCP server and connect to stdio transport
     */
    async run(): Promise<void> {
        const transport = new StdioServerTransport()
        await this.server.connect(transport)

        console.error('Claude Code PM Server running on stdio')
    }
}

// Check for dashboard flag
const args = process.argv.slice(2)
if (args.includes('--dashboard')) {
    // Start dashboard instead of MCP server
    import('./cli/index.js').catch(console.error)
} else {
    // Start the MCP server
    const server = new TaskManagerMCPServer()
    server.run().catch(console.error)
}
