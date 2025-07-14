import { promises as fs } from 'fs'
import { homedir } from 'os'
import { join, normalize, sep } from 'path'

/**
 * Global project registry entry
 */
interface ProjectRegistryEntry {
    name: string
    path: string
    database_path: string
    last_used: string
    usage_count: number
    created_at: string
}

/**
 * Global project registry structure
 */
interface ProjectRegistry {
    projects: Record<string, ProjectRegistryEntry>
}

/**
 * Global registry manager for tracking MCP usage across projects
 */
export class GlobalProjectRegistry {
    private static instance: GlobalProjectRegistry
    private registryPath: string
    private registryDir: string

    /**
     * Initialize global registry manager
     */
    private constructor() {
        this.registryDir = join(homedir(), '.mcp-project-manager')
        this.registryPath = join(this.registryDir, 'registry.json')
    }

    /**
     * Get singleton instance
     * @returns GlobalProjectRegistry instance
     */
    static getInstance(): GlobalProjectRegistry {
        if (!GlobalProjectRegistry.instance) {
            GlobalProjectRegistry.instance = new GlobalProjectRegistry()
        }
        return GlobalProjectRegistry.instance
    }

    /**
     * Ensure registry directory exists
     */
    private async ensureRegistryDir(): Promise<void> {
        try {
            await fs.mkdir(this.registryDir, { recursive: true })
        } catch (error) {
            // Directory already exists or other error - continue
        }
    }

    /**
     * Load registry from file
     * @returns ProjectRegistry object
     */
    private async loadRegistry(): Promise<ProjectRegistry> {
        try {
            await this.ensureRegistryDir()
            const content = await fs.readFile(this.registryPath, 'utf-8')
            return JSON.parse(content)
        } catch (error) {
            // Registry file doesn't exist, return empty registry
            return { projects: {} }
        }
    }

    /**
     * Save registry to file
     * @param registry - Registry object to save
     */
    private async saveRegistry(registry: ProjectRegistry): Promise<void> {
        await this.ensureRegistryDir()
        await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2))
    }

    /**
     * Generate project ID based on absolute path
     * @param projectPath - Absolute path to project
     * @returns Project ID
     */
    private generateProjectId(projectPath: string): string {
        // Normalize path for cross-platform compatibility
        const normalizedPath = normalize(projectPath)
        // Use path as identifier (normalized, replace path separators with underscores)
        return normalizedPath
            .replace(/[/\\]/g, '_')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
    }

    /**
     * Get project name from package.json or directory name
     * @param projectPath - Absolute path to project
     * @returns Project name
     */
    private async getProjectName(projectPath: string): Promise<string> {
        try {
            const packageJsonPath = join(projectPath, 'package.json')
            const content = await fs.readFile(packageJsonPath, 'utf-8')
            const packageJson = JSON.parse(content)
            return (
                packageJson.name ||
                normalize(projectPath).split(sep).pop() ||
                'Unknown Project'
            )
        } catch (error) {
            // No package.json or parsing error, use directory name
            return normalize(projectPath).split(sep).pop() || 'Unknown Project'
        }
    }

    /**
     * Register or update project in global registry
     * @param projectPath - Absolute path to project
     * @param databasePath - Absolute path to project database
     */
    async registerProject(
        projectPath: string,
        databasePath: string
    ): Promise<void> {
        try {
            const registry = await this.loadRegistry()
            const projectId = this.generateProjectId(projectPath)
            const projectName = await this.getProjectName(projectPath)
            const now = new Date().toISOString()

            if (registry.projects[projectId]) {
                // Update existing project
                registry.projects[projectId].last_used = now
                registry.projects[projectId].usage_count += 1
                registry.projects[projectId].database_path = databasePath
                registry.projects[projectId].name = projectName // Update name in case it changed
            } else {
                // Register new project
                registry.projects[projectId] = {
                    name: projectName,
                    path: projectPath,
                    database_path: databasePath,
                    last_used: now,
                    usage_count: 1,
                    created_at: now,
                }
            }

            await this.saveRegistry(registry)
        } catch (error) {
            // Silently fail - registry is optional functionality
            console.error('Failed to update global project registry:', error)
        }
    }

    /**
     * Get all registered projects
     * @returns Array of project entries with IDs
     */
    async getAllProjects(): Promise<
        Array<ProjectRegistryEntry & { id: string }>
    > {
        try {
            const registry = await this.loadRegistry()
            return Object.entries(registry.projects).map(([id, project]) => ({
                id,
                ...project,
            }))
        } catch (error) {
            return []
        }
    }

    /**
     * Get project by ID
     * @param projectId - Project ID
     * @returns Project entry or null
     */
    async getProject(projectId: string): Promise<ProjectRegistryEntry | null> {
        try {
            const registry = await this.loadRegistry()
            return registry.projects[projectId] || null
        } catch (error) {
            return null
        }
    }

    /**
     * Remove project from registry
     * @param projectId - Project ID
     */
    async removeProject(projectId: string): Promise<void> {
        try {
            const registry = await this.loadRegistry()
            if (registry.projects[projectId]) {
                delete registry.projects[projectId]
                await this.saveRegistry(registry)
            }
        } catch (error) {
            // Silently fail - registry is optional functionality
            console.error('Failed to remove project from registry:', error)
        }
    }

    /**
     * Get registry statistics
     * @returns Registry statistics
     */
    async getStats(): Promise<{
        total_projects: number
        most_used_project: string | null
        total_usage: number
        last_activity: string | null
    }> {
        try {
            const registry = await this.loadRegistry()
            const projects = Object.values(registry.projects)

            if (projects.length === 0) {
                return {
                    total_projects: 0,
                    most_used_project: null,
                    total_usage: 0,
                    last_activity: null,
                }
            }

            const totalUsage = projects.reduce(
                (sum, p) => sum + p.usage_count,
                0
            )
            const mostUsedProject = projects.reduce((prev, current) =>
                prev.usage_count > current.usage_count ? prev : current
            )
            const lastActivity = projects.reduce((latest, current) =>
                new Date(current.last_used) > new Date(latest.last_used)
                    ? current
                    : latest
            )

            return {
                total_projects: projects.length,
                most_used_project: mostUsedProject.name,
                total_usage: totalUsage,
                last_activity: lastActivity.last_used,
            }
        } catch (error) {
            return {
                total_projects: 0,
                most_used_project: null,
                total_usage: 0,
                last_activity: null,
            }
        }
    }
}
