/**
 * Base class for all MCP prompts
 */
export abstract class BasePrompt {
    /**
     * Returns the name of the prompt
     * @returns The prompt name
     */
    abstract getName(): string

    /**
     * Returns the description of the prompt
     * @returns The prompt description
     */
    abstract getDescription(): string

    /**
     * Returns the arguments schema for the prompt
     * @returns The arguments schema
     */
    abstract getArguments(): Array<{
        name: string
        description: string
        required: boolean
    }>

    /**
     * Generates the prompt with the given arguments
     * @param args - The prompt arguments
     * @returns The generated prompt
     */
    abstract generatePrompt(args: any): Promise<{
        description: string
        messages: Array<{
            role: 'user' | 'assistant'
            content: {
                type: 'text'
                text: string
            }
        }>
    }>
}
