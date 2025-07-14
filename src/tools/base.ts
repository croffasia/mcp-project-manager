import { z } from 'zod'

import { TaskStorage } from '../storage.js'

/**
 * Metadata interface for tool operation results
 */
export interface ToolMetadata {
    /** Entity information */
    entityType?: 'idea' | 'epic' | 'task' | 'bug' | 'research'
    entityId?: string
    entityStatus?: 'pending' | 'in-progress' | 'done' | 'blocked' | 'deferred'
    entityPriority?: 'high' | 'medium' | 'low'

    /** Operation information */
    operation?:
        | 'create'
        | 'update'
        | 'get'
        | 'list'
        | 'delete'
        | 'analyze'
        | 'breakdown'
        | 'init'
        | 'translate'
    operationSuccess?: boolean

    /** Data counts and statistics */
    totalCount?: number
    filteredCount?: number

    /** Quick actions */
    suggestedCommands?: string[]

    /** Additional contextual data */
    [key: string]: any
}

/**
 * Result interface for tool operations
 */
export interface ToolResult {
    content: Array<{
        type: 'text'
        text: string
    }>
    isError?: boolean
    metadata?: ToolMetadata
}

/**
 * Base class for all MCP tools
 */
export abstract class BaseTool {
    /**
     * Creates a new instance of BaseTool
     */
    constructor() {
        // Base constructor
    }

    /**
     * Checks if this tool requires user approval before execution
     * @returns True if approval is required, false otherwise
     */
    protected requiresApproval(): boolean {
        const approvalRequiredTools = [
            'create_task',
            'create_epic',
            'create_idea',
            'update_task',
            'update_epic',
            'update_idea',
            'delete_entity',
        ]
        return approvalRequiredTools.includes(this.getName())
    }

    /**
     * Validates if approval was provided in the arguments for approval-required tools
     * @param args - The tool arguments
     * @throws Error if approval is required but not provided
     */
    protected validateApproval(args: any): void {
        if (this.requiresApproval()) {
            const approvalProvided =
                args._approval_confirmed === true ||
                args._approval_confirmed === 'true'
            if (!approvalProvided) {
                throw new Error(
                    `🚫 APPROVAL REQUIRED: Tool "${this.getName()}" requires user approval.\n\n` +
                        `WORKFLOW:\n` +
                        `1. Propose your changes to the user\n` +
                        `2. Wait for explicit approval (e.g., "Yes, create these tasks")\n` +
                        `3. Call this tool again with "_approval_confirmed: true" parameter\n\n` +
                        `EXAMPLE:\n` +
                        `${this.getName()}({\n` +
                        `  ...your_parameters,\n` +
                        `  _approval_confirmed: true\n` +
                        `})`
                )
            }
        }
    }

    /**
     * Returns the name of the tool
     * @returns The tool name
     */
    abstract getName(): string

    /**
     * Returns the description of the tool
     * @returns The tool description
     */
    abstract getDescription(): string

    /**
     * Returns the input schema for the tool
     * @returns The JSON schema for tool input
     */
    abstract getInputSchema(): object

    /**
     * Executes the tool with the given arguments
     * @param args - The tool arguments
     * @returns The tool result
     */
    abstract execute(args: any): Promise<ToolResult>

    /**
     * Validates the provided arguments against the given schema
     * @param schema - The Zod schema to validate against
     * @param args - The arguments to validate
     * @returns The validated arguments
     */
    protected validate<T>(schema: z.ZodSchema<T>, args: any): T {
        return schema.parse(args)
    }

    /**
     * Gets the initialized TaskStorage instance
     * @returns The TaskStorage instance
     */
    protected async getStorage(): Promise<TaskStorage> {
        return await TaskStorage.getInstance()
    }
}
