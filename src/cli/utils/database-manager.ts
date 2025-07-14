import { GlobalProjectRegistry } from '../../global-registry.js'
import {
    EpicData,
    IdeaData,
    NavigationState,
    ProgressNote,
    ProjectData,
    TaskData,
} from '../types/index.js'
import { ProjectDatabase } from './database.js'

/**
 * Combined loaded data interface
 */
export interface LoadedData {
    projects: ProjectData[]
    ideas: IdeaData[]
    epics: EpicData[]
    tasks: TaskData[]
}

/**
 * Interface for data loading and retrieval operations
 */
export interface IDataProvider {
    /**
     * Load data for the current navigation level
     * @param navigation Current navigation state
     */
    loadCurrentData(navigation: NavigationState): Promise<void>

    /**
     * Load projects from global registry
     */
    loadProjects(): Promise<void>

    /**
     * Load ideas from current project
     */
    loadIdeas(): Promise<void>

    /**
     * Load epics from current idea
     * @param navigation Current navigation state containing selected idea
     */
    loadEpics(navigation: NavigationState): Promise<void>

    /**
     * Load tasks from current epic
     * @param navigation Current navigation state containing selected epic
     */
    loadTasks(navigation: NavigationState): Promise<void>

    /**
     * Load progress notes for a specific task
     * @param task Task to load progress notes for
     */
    loadTaskProgressNotes(task: TaskData): Promise<void>

    /**
     * Load task with full hierarchy information
     * @param taskId ID of the task to load
     * @returns Task with epic and idea information
     */
    loadTaskWithHierarchy(
        taskId: string
    ): Promise<(TaskData & { epic?: EpicData; idea?: IdeaData }) | null>

    /**
     * Get current items based on navigation level
     * @param navigation Current navigation state
     * @returns Array of items for current level
     */
    getCurrentItems(navigation: NavigationState): any[]

    /**
     * Get currently loaded data structure
     */
    getCurrentData(): LoadedData
}

/**
 * Manager for database connections and project validation
 * Implements IDataProvider interface for data management
 */
export class DatabaseManager implements IDataProvider {
    private currentDatabase: ProjectDatabase | null = null
    private currentProjects: ProjectData[] = []
    private currentIdeas: IdeaData[] = []
    private currentEpics: EpicData[] = []
    private currentTasks: TaskData[] = []

    constructor() {
        // Initialize empty data arrays
        this.currentProjects = []
        this.currentIdeas = []
        this.currentEpics = []
        this.currentTasks = []
    }

    /**
     * Get current database instance
     */
    getCurrentDatabase(): ProjectDatabase | null {
        return this.currentDatabase
    }

    /**
     * Connect to a project database
     */
    async connectToProject(project: ProjectData): Promise<boolean> {
        // Check if project has MCP structure
        if (!(await ProjectDatabase.isValidProject(project.path))) {
            console.error('Project does not have MCP Task Manager structure!')
            return false
        }

        // Close existing connection if any
        await this.closeCurrentConnection()

        // Connect to project database
        this.currentDatabase = new ProjectDatabase(project.path)
        await this.currentDatabase.connect()

        return true
    }

    /**
     * Close current database connection
     */
    async closeCurrentConnection(): Promise<void> {
        if (this.currentDatabase) {
            await this.currentDatabase.close()
            this.currentDatabase = null

            // Clear cached data
            this.currentIdeas = []
            this.currentEpics = []
            this.currentTasks = []
        }
    }

    /**
     * Check if there's an active database connection
     */
    hasActiveConnection(): boolean {
        return this.currentDatabase !== null
    }

    /**
     * Cleanup all connections
     */
    async cleanup(): Promise<void> {
        await this.closeCurrentConnection()
    }

    // IDataProvider interface implementation

    /**
     * Load data for the current navigation level
     * @param navigation Current navigation state
     */
    async loadCurrentData(navigation: NavigationState): Promise<void> {
        const { level } = navigation

        switch (level) {
            case 'projects':
                await this.loadProjects()
                break
            case 'ideas':
                await this.loadIdeas()
                break
            case 'idea_details':
                await this.loadEpics(navigation)
                break
            case 'epic_details':
                await this.loadTasks(navigation)
                break
            case 'task_details':
                // Task details are loaded when navigating to task
                break
        }
    }

    /**
     * Load projects from global registry
     */
    async loadProjects(): Promise<void> {
        try {
            const registry = GlobalProjectRegistry.getInstance()
            this.currentProjects = await registry.getAllProjects()
        } catch (error) {
            console.error('Error loading projects:', error)
            this.currentProjects = []
        }
    }

    /**
     * Load ideas from current project
     */
    async loadIdeas(): Promise<void> {
        if (!this.currentDatabase) {
            console.error('No active database connection')
            this.currentIdeas = []
            return
        }

        try {
            this.currentIdeas = await this.currentDatabase.getIdeas()
        } catch (error) {
            console.error('Error loading ideas:', error)
            this.currentIdeas = []
        }
    }

    /**
     * Load epics from current idea
     * @param navigation Current navigation state containing selected idea
     */
    async loadEpics(navigation: NavigationState): Promise<void> {
        if (!this.currentDatabase || !navigation.selectedIdea) {
            console.error('No active database connection or selected idea')
            this.currentEpics = []
            return
        }

        try {
            this.currentEpics = await this.currentDatabase.getEpics(
                navigation.selectedIdea.id
            )
        } catch (error) {
            console.error('Error loading epics:', error)
            this.currentEpics = []
        }
    }

    /**
     * Load tasks from current epic
     * @param navigation Current navigation state containing selected epic
     */
    async loadTasks(navigation: NavigationState): Promise<void> {
        if (!this.currentDatabase || !navigation.selectedEpic) {
            console.error('No active database connection or selected epic')
            this.currentTasks = []
            return
        }

        try {
            this.currentTasks = await this.currentDatabase.getTasks(
                navigation.selectedEpic.id
            )
        } catch (error) {
            console.error('Error loading tasks:', error)
            this.currentTasks = []
        }
    }

    /**
     * Load progress notes for a specific task
     * @param task Task to load progress notes for
     */
    async loadTaskProgressNotes(task: TaskData): Promise<void> {
        if (!this.currentDatabase) {
            console.error('No active database connection')
            return
        }

        try {
            // Extract numeric ID from task ID
            const numericId = this.extractNumericId(task.id)
            if (numericId !== null) {
                const progressNotes =
                    await this.currentDatabase.getProgressNotes(numericId)
                task.progress_notes = progressNotes
            }
        } catch (error) {
            console.error('Error loading progress notes:', error)
            task.progress_notes = []
        }
    }

    /**
     * Load task with full hierarchy information
     * @param taskId ID of the task to load
     * @returns Task with epic and idea information
     */
    async loadTaskWithHierarchy(
        taskId: string
    ): Promise<(TaskData & { epic?: EpicData; idea?: IdeaData }) | null> {
        if (!this.currentDatabase) {
            console.error('No active database connection')
            return null
        }

        try {
            return await this.currentDatabase.getTaskWithHierarchy(taskId)
        } catch (error) {
            console.error('Error loading task with hierarchy:', error)
            return null
        }
    }

    /**
     * Get current items based on navigation level
     * @param navigation Current navigation state
     * @returns Array of items for current level
     */
    getCurrentItems(navigation: NavigationState): any[] {
        const { level } = navigation

        switch (level) {
            case 'projects':
                return this.currentProjects
            case 'ideas':
                return this.currentIdeas
            case 'idea_details':
                return this.currentEpics
            case 'epic_details':
                return this.currentTasks
            default:
                return []
        }
    }

    /**
     * Get currently loaded data structure
     */
    getCurrentData(): LoadedData {
        return {
            projects: this.currentProjects,
            ideas: this.currentIdeas,
            epics: this.currentEpics,
            tasks: this.currentTasks,
        }
    }

    /**
     * Get current projects
     */
    getCurrentProjects(): ProjectData[] {
        return this.currentProjects
    }

    /**
     * Get current ideas
     */
    getCurrentIdeas(): IdeaData[] {
        return this.currentIdeas
    }

    /**
     * Get current epics
     */
    getCurrentEpics(): EpicData[] {
        return this.currentEpics
    }

    /**
     * Get current tasks
     */
    getCurrentTasks(): TaskData[] {
        return this.currentTasks
    }

    /**
     * Extract numeric ID from prefixed ID
     * @param prefixedId ID with prefix (e.g., "TSK-1", "IDEA-2")
     * @returns Numeric ID or null if extraction fails
     */
    private extractNumericId(prefixedId: string): number | null {
        const match = prefixedId.match(/-(\d+)$/)
        return match ? parseInt(match[1], 10) : null
    }

    /**
     * Get epic by ID
     * @param epicId Epic ID to retrieve
     * @returns Epic data or null if not found
     */
    async getEpicById(epicId: string): Promise<EpicData | null> {
        if (!this.currentDatabase) {
            return null
        }

        try {
            return await this.currentDatabase.getEpicById(epicId)
        } catch (error) {
            console.error('Error getting epic by ID:', error)
            return null
        }
    }

    /**
     * Get idea by ID
     * @param ideaId Idea ID to retrieve
     * @returns Idea data or null if not found
     */
    async getIdeaById(ideaId: string): Promise<IdeaData | null> {
        if (!this.currentDatabase) {
            return null
        }

        try {
            return await this.currentDatabase.getIdeaById(ideaId)
        } catch (error) {
            console.error('Error getting idea by ID:', error)
            return null
        }
    }

    /**
     * Get task count for an epic
     * @param epicId Epic ID to get task count for
     * @returns Number of tasks in the epic
     */
    async getTaskCountForEpic(epicId: string): Promise<number> {
        if (!this.currentDatabase) {
            return 0
        }

        try {
            return await this.currentDatabase.getTaskCountForEpic(epicId)
        } catch (error) {
            console.error('Error getting task count for epic:', error)
            return 0
        }
    }

    /**
     * Get project configuration
     * @returns Project configuration or null if not available
     */
    getProjectConfig(): any {
        if (!this.currentDatabase) {
            return null
        }

        return this.currentDatabase.getProjectConfig()
    }
}
