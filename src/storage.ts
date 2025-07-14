import { promises as fs } from 'fs'
import { dirname, join } from 'path'
import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'

import { GlobalProjectRegistry } from './global-registry.js'
import { Epic, Idea, ProgressNote, Task } from './types.js'

/**
 * Database entity representation for internal storage
 */
interface Entity {
    id: number
    type: 'idea' | 'epic' | 'task' | 'bug' | 'research'
    parent_id: number | null
    title: string
    description: string | null
    priority: 'low' | 'medium' | 'high'
    status: string
    dependencies: string | null
    created_at: string
    updated_at: string
}

/**
 * Progress note entity for tracking task progress
 */

/**
 * Legacy counters interface (kept for compatibility)
 */
interface Counters {
    ideas: number
    epics: number
    tasks: number
}

/**
 * MCP Task Manager configuration
 */
export interface McpConfig {
    prefixes: {
        idea: string
        epic: string
        task: string
        bug: string
        rnd: string
    }
    separator: string
    project: {
        name: string
        description: string
    }
}

/**
 * Singleton storage class for managing task data in SQLite database
 * Handles ideas, epics, tasks, bugs, and research items
 */
export class TaskStorage {
    private static instance: TaskStorage
    private dataDir: string
    private projectPath: string
    private config: McpConfig
    private initialized: boolean = false
    private db: sqlite3.Database | null = null

    /**
     * Private constructor for singleton pattern
     * @param projectPath - Path to project directory
     */
    private constructor(projectPath: string = process.cwd()) {
        const customDataDir = process.env.MCP_TASK_DATA_DIR

        if (customDataDir) {
            this.projectPath = customDataDir
            this.dataDir = join(customDataDir, '.product-task')
        } else {
            this.projectPath = projectPath
            this.dataDir = join(projectPath, '.product-task')
        }

        this.config = {
            prefixes: {
                idea: 'IDEA',
                epic: 'EPIC',
                task: 'TSK',
                bug: 'BUG',
                rnd: 'RND',
            },
            separator: '-',
            project: {
                name: 'Default Project',
                description: 'Default MCP Task Manager Project',
            },
        }
    }

    /**
     * Get singleton instance of TaskStorage
     * @param projectPath - Optional project path
     * @returns TaskStorage instance
     */
    static async getInstance(projectPath?: string): Promise<TaskStorage> {
        const envDataDir = process.env.MCP_TASK_DATA_DIR
        const currentPath = envDataDir || projectPath || process.cwd()

        if (
            !TaskStorage.instance ||
            (envDataDir && TaskStorage.instance.projectPath !== envDataDir)
        ) {
            TaskStorage.instance = new TaskStorage(currentPath)
        }

        // Automatically initialize storage
        await TaskStorage.instance.ensureDataDir()

        return TaskStorage.instance
    }

    /**
     * Ensure data directory exists and initialize database
     */
    async ensureDataDir(): Promise<void> {
        if (this.initialized) {
            return
        }

        try {
            await fs.mkdir(this.dataDir, { recursive: true })
            await this.loadConfig()

            await this.initializeDatabase()

            // Register project in global registry
            await this.registerInGlobalRegistry()

            this.initialized = true
        } catch (error) {
            await this.loadConfig()
            await this.initializeDatabase()
            await this.registerInGlobalRegistry()
            this.initialized = true
        }
    }

    /**
     * Register project in global registry
     */
    private async registerInGlobalRegistry(): Promise<void> {
        try {
            const dbPath = join(this.dataDir, 'database.sqlite')
            const globalRegistry = GlobalProjectRegistry.getInstance()
            await globalRegistry.registerProject(this.projectPath, dbPath)
        } catch (error) {
            // Silently fail - global registry is optional
        }
    }

    /**
     * Initialize SQLite database with proper schema
     */
    private async initializeDatabase(): Promise<void> {
        if (this.db) {
            return
        }

        const dbPath = join(this.dataDir, 'database.sqlite')

        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    reject(err)
                    return
                }

                if (!this.db) {
                    reject(new Error('Failed to create database'))
                    return
                }

                // Enable foreign keys
                this.db.run('PRAGMA foreign_keys = ON', (err) => {
                    if (err) {
                        reject(err)
                        return
                    }

                    // Load SQL schema from file
                    this.loadSchemaAndCreateTables()
                        .then(() => resolve())
                        .catch(reject)
                })
            })
        })
    }

    /**
     * Load database schema from SQL file and create tables
     */
    private async loadSchemaAndCreateTables(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized')
        }

        // Get path to schema file
        const __filename = fileURLToPath(import.meta.url)
        const __dirname = dirname(__filename)
        const schemaPath = join(__dirname, 'db-schema', 'schema.sql')

        try {
            const schemaSQL = await fs.readFile(schemaPath, 'utf-8')

            return new Promise((resolve, reject) => {
                this.db!.exec(schemaSQL, (err) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve()
                    }
                })
            })
        } catch (error) {
            throw new Error(`Failed to load schema file: ${error}`)
        }
    }

    /**
     * Format numeric ID to string with proper prefix
     * @param id - Numeric entity ID
     * @param type - Entity type
     * @returns Formatted ID string
     */
    private formatEntityId(id: number, type: string): string {
        const prefixes = {
            idea: 'IDEA',
            epic: 'EPIC',
            task: 'TSK',
            bug: 'BUG',
            research: 'RND',
        }
        return `${prefixes[type as keyof typeof prefixes]}-${id}`
    }

    /**
     * Get next available ID for new entity
     * @returns Next available ID
     */
    private async getNextId(): Promise<number> {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            this.db!.get(
                'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM entities',
                (err, row: any) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(row.next_id)
                    }
                }
            )
        })
    }

    /**
     * Get entity by ID from database
     * @param id - Entity ID
     * @returns Entity or null if not found
     */
    private async getEntity(id: number): Promise<Entity | null> {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            this.db!.get(
                'SELECT * FROM entities WHERE id = ?',
                [id],
                (err, row: any) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(row || null)
                    }
                }
            )
        })
    }

    /**
     * Get all entities of specific type
     * @param type - Entity type
     * @returns Array of entities
     */
    private async getEntitiesByType(type: string): Promise<Entity[]> {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            this.db!.all(
                'SELECT * FROM entities WHERE type = ? ORDER BY created_at DESC',
                [type],
                (err, rows: any[]) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(rows || [])
                    }
                }
            )
        })
    }

    /**
     * Create new entity in database
     * @param type - Entity type
     * @param title - Entity title
     * @param description - Entity description
     * @param priority - Entity priority
     * @param parentId - Parent entity ID
     * @param dependencies - Array of dependency IDs
     * @returns Created entity
     */
    private async createEntity(
        type: string,
        title: string,
        description: string,
        priority: string = 'medium',
        parentId?: number,
        dependencies?: number[]
    ): Promise<Entity> {
        if (!this.db) throw new Error('Database not initialized')

        const dependenciesJson = dependencies
            ? JSON.stringify(dependencies)
            : null

        return new Promise((resolve, reject) => {
            this.db!.run(
                'INSERT INTO entities (type, parent_id, title, description, priority, dependencies) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    type,
                    parentId || null,
                    title,
                    description || null,
                    priority,
                    dependenciesJson,
                ],
                function (err) {
                    if (err) {
                        reject(err)
                    } else {
                        // this.lastID contains the ID of the inserted record
                        resolve({
                            id: this.lastID,
                            type: type as any,
                            parent_id: parentId || null,
                            title,
                            description: description || null,
                            priority: priority as any,
                            status: 'pending',
                            dependencies: dependenciesJson,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                    }
                }
            )
        })
    }

    /**
     * Update existing entity in database
     * @param id - Entity ID
     * @param updates - Partial entity updates
     * @returns Updated entity
     */
    private async updateEntity(
        id: number,
        updates: Partial<Entity>
    ): Promise<Entity> {
        if (!this.db) throw new Error('Database not initialized')

        const entity = await this.getEntity(id)
        if (!entity) {
            throw new Error(`Entity with id ${id} not found`)
        }

        const updateParts: string[] = []
        const values: any[] = []

        if (updates.parent_id !== undefined) {
            updateParts.push('parent_id = ?')
            values.push(updates.parent_id)
        }
        if (updates.title !== undefined) {
            updateParts.push('title = ?')
            values.push(updates.title)
        }
        if (updates.description !== undefined) {
            updateParts.push('description = ?')
            values.push(updates.description)
        }
        if (updates.status !== undefined) {
            updateParts.push('status = ?')
            values.push(updates.status)
        }
        if (updates.priority !== undefined) {
            updateParts.push('priority = ?')
            values.push(updates.priority)
        }
        if (updates.dependencies !== undefined) {
            updateParts.push('dependencies = ?')
            values.push(updates.dependencies)
        }

        if (updateParts.length === 0) {
            return entity
        }

        return new Promise((resolve, reject) => {
            values.push(id)
            this.db!.run(
                `UPDATE entities SET ${updateParts.join(', ')} WHERE id = ?`,
                values,
                (err) => {
                    if (err) {
                        reject(err)
                    } else {
                        // Return updated entity
                        resolve({
                            ...entity,
                            ...updates,
                            updated_at: new Date().toISOString(),
                        } as Entity)
                    }
                }
            )
        })
    }

    /**
     * Add progress note to entity
     * @param entityId - Entity ID
     * @param note - Progress note text
     * @param type - Note type
     */
    private async addProgressNote(
        entityId: number,
        note: string,
        type: string = 'update'
    ): Promise<void> {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            this.db!.run(
                'INSERT INTO progress_notes (entity_id, note, type) VALUES (?, ?, ?)',
                [entityId, note, type],
                (err) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve()
                    }
                }
            )
        })
    }

    /**
     * Load configuration from project-config.json
     */
    async loadConfig(): Promise<void> {
        try {
            const configPath = join(this.projectPath, 'project-config.json')
            const content = await fs.readFile(configPath, 'utf-8')
            this.config = { ...this.config, ...JSON.parse(content) }
        } catch (error) {
            // Config file doesn't exist, use defaults
            await this.saveConfig()
        }
    }

    /**
     * Save configuration to project-config.json
     */
    async saveConfig(): Promise<void> {
        const configPath = join(this.projectPath, 'project-config.json')
        await fs.writeFile(configPath, JSON.stringify(this.config, null, 2))
    }

    /**
     * Convert database entity to Idea object
     * @param entity - Database entity
     * @returns Idea object
     */
    private entityToIdea(entity: Entity): Idea {
        return {
            id: this.formatEntityId(entity.id, 'idea'),
            title: entity.title,
            description: entity.description || '',
            priority: entity.priority,
            status: entity.status as any,
            createdAt: new Date(entity.created_at),
            updatedAt: new Date(entity.updated_at),
            epics: [],
        }
    }

    /**
     * Convert database entity to Epic object
     * @param entity - Database entity
     * @param ideaId - Parent idea ID
     * @returns Epic object
     */
    private entityToEpic(entity: Entity, ideaId?: string): Epic {
        return {
            id: this.formatEntityId(entity.id, 'epic'),
            ideaId:
                ideaId ||
                (entity.parent_id
                    ? this.formatEntityId(entity.parent_id, 'idea')
                    : ''),
            title: entity.title,
            description: entity.description || '',
            priority: entity.priority,
            status: entity.status as any,
            createdAt: new Date(entity.created_at),
            updatedAt: new Date(entity.updated_at),
            tasks: [], // Will be populated separately if needed
        }
    }

    /**
     * Convert database entity to Task object
     * @param entity - Database entity
     * @param epicId - Parent epic ID
     * @returns Task object
     */
    private async entityToTask(entity: Entity, epicId?: string): Promise<Task> {
        const dependencies = entity.dependencies
            ? JSON.parse(entity.dependencies)
            : []
        const formattedDependencies = dependencies.map(
            (depId: number) => this.formatEntityId(depId, 'task') // Assume dependencies are tasks
        )

        return {
            id: this.formatEntityId(entity.id, entity.type),
            epicId:
                epicId ||
                (entity.parent_id
                    ? this.formatEntityId(entity.parent_id, 'epic')
                    : ''),
            title: entity.title,
            description: entity.description || '',
            type: entity.type as 'task' | 'bug' | 'rnd',
            priority: entity.priority,
            status: entity.status as any,
            dependencies: formattedDependencies,
            createdAt: new Date(entity.created_at),
            updatedAt: new Date(entity.updated_at),
            progressNotes: await this.getProgressNotes(entity.id),
        }
    }

    /**
     * Parse formatted entity ID to numeric ID
     * @param formattedId - Formatted ID string
     * @returns Numeric ID
     */
    private parseEntityId(formattedId: string): number {
        const parts = formattedId.split('-')
        return parseInt(parts[parts.length - 1])
    }

    /**
     * Get next available idea ID
     * @returns Formatted idea ID
     */
    async getNextIdeaId(): Promise<string> {
        await this.ensureDataDir()
        const nextId = await this.getNextId()
        return this.formatEntityId(nextId, 'idea')
    }

    /**
     * Get next available epic ID
     * @returns Formatted epic ID
     */
    async getNextEpicId(): Promise<string> {
        await this.ensureDataDir()
        const nextId = await this.getNextId()
        return this.formatEntityId(nextId, 'epic')
    }

    /**
     * Get next available task ID
     * @param type - Task type
     * @returns Formatted task ID
     */
    async getNextTaskId(
        type: 'task' | 'bug' | 'rnd' = 'task'
    ): Promise<string> {
        await this.ensureDataDir()
        const nextId = await this.getNextId()
        return this.formatEntityId(nextId, type)
    }

    /**
     * Save idea to database
     * @param idea - Idea to save
     */
    async saveIdea(idea: Idea): Promise<void> {
        await this.ensureDataDir()

        const numericId = this.parseEntityId(idea.id)
        const existingEntity = await this.getEntity(numericId)

        if (existingEntity) {
            await this.updateEntity(numericId, {
                title: idea.title,
                description: idea.description,
                priority: idea.priority,
                status: idea.status,
            })
        } else {
            await this.createEntity(
                'idea',
                idea.title,
                idea.description,
                idea.priority
            )
        }
    }

    /**
     * Save epic to database
     * @param epic - Epic to save
     */
    async saveEpic(epic: Epic): Promise<void> {
        await this.ensureDataDir()

        const numericId = this.parseEntityId(epic.id)
        const parentId = epic.ideaId
            ? this.parseEntityId(epic.ideaId)
            : undefined
        const existingEntity = await this.getEntity(numericId)

        if (existingEntity) {
            await this.updateEntity(numericId, {
                parent_id: parentId,
                title: epic.title,
                description: epic.description,
                priority: epic.priority,
                status: epic.status,
            })
        } else {
            await this.createEntity(
                'epic',
                epic.title,
                epic.description,
                epic.priority,
                parentId
            )
        }
    }

    /**
     * Save task to database
     * @param task - Task to save
     */
    async saveTask(task: Task): Promise<void> {
        await this.ensureDataDir()

        const numericId = this.parseEntityId(task.id)
        const parentId = task.epicId
            ? this.parseEntityId(task.epicId)
            : undefined

        const dependencies = task.dependencies.map((depId) =>
            this.parseEntityId(depId)
        )

        const existingEntity = await this.getEntity(numericId)

        if (existingEntity) {
            await this.updateEntity(numericId, {
                parent_id: parentId,
                title: task.title,
                description: task.description,
                priority: task.priority,
                status: task.status,
                dependencies: JSON.stringify(dependencies),
            })
        } else {
            await this.createEntity(
                task.type,
                task.title,
                task.description,
                task.priority,
                parentId,
                dependencies
            )
        }

        // Save progress notes if they exist
        if (task.progressNotes && task.progressNotes.length > 0) {
            // Get existing progress notes to avoid duplicates
            const existingNotes = await this.getProgressNotes(numericId)
            const existingNoteIds = new Set(
                existingNotes.map((note) => note.id)
            )

            // Save new progress notes
            for (const note of task.progressNotes) {
                if (!existingNoteIds.has(note.id)) {
                    await this.addProgressNote(
                        numericId,
                        note.content,
                        note.type
                    )
                }
            }
        }
    }

    /**
     * Save task progress note
     * @param taskId - Task ID
     * @param progress - Progress note text
     */
    async saveTaskProgress(taskId: string, progress: string): Promise<void> {
        await this.ensureDataDir()
        const numericId = this.parseEntityId(taskId)
        await this.addProgressNote(numericId, progress, 'update')
    }

    /**
     * Get progress notes for an entity
     * @param entityId - Entity ID
     * @returns Array of progress notes
     */
    async getProgressNotes(entityId: number): Promise<ProgressNote[]> {
        if (!this.db) throw new Error('Database not initialized')
        return new Promise((resolve, reject) => {
            this.db!.all(
                'SELECT id, entity_id, note, type, created_at FROM progress_notes WHERE entity_id = ? ORDER BY created_at DESC',
                [entityId],
                (err, rows: any[]) => {
                    if (err) {
                        reject(err)
                    } else {
                        const progressNotes: ProgressNote[] = rows.map(
                            (row) => ({
                                id: row.id.toString(),
                                taskId: row.entity_id.toString(),
                                content: row.note,
                                type: row.type as
                                    | 'update'
                                    | 'comment'
                                    | 'blocker'
                                    | 'completion',
                                timestamp: new Date(row.created_at),
                            })
                        )
                        resolve(progressNotes)
                    }
                }
            )
        })
    }

    /**
     * Load idea by ID
     * @param id - Idea ID
     * @returns Idea or null if not found
     */
    async loadIdea(id: string): Promise<Idea | null> {
        try {
            const numericId = this.parseEntityId(id)
            const entity = await this.getEntity(numericId)

            if (!entity || entity.type !== 'idea') {
                return null
            }

            return this.entityToIdea(entity)
        } catch (error) {
            return null
        }
    }

    /**
     * Load epic by ID
     * @param id - Epic ID
     * @returns Epic or null if not found
     */
    async loadEpic(id: string): Promise<Epic | null> {
        try {
            const numericId = this.parseEntityId(id)
            const entity = await this.getEntity(numericId)

            if (!entity || entity.type !== 'epic') {
                return null
            }

            let ideaId = ''
            if (entity.parent_id) {
                const parentEntity = await this.getEntity(entity.parent_id)
                if (parentEntity && parentEntity.type === 'idea') {
                    ideaId = this.formatEntityId(parentEntity.id, 'idea')
                }
            }

            return this.entityToEpic(entity, ideaId)
        } catch (error) {
            return null
        }
    }

    /**
     * Load task by ID
     * @param id - Task ID
     * @returns Task or null if not found
     */
    async loadTask(id: string): Promise<Task | null> {
        try {
            const numericId = this.parseEntityId(id)
            const entity = await this.getEntity(numericId)

            if (!entity || !['task', 'bug', 'rnd'].includes(entity.type)) {
                return null
            }

            let epicId = ''
            if (entity.parent_id) {
                const parentEntity = await this.getEntity(entity.parent_id)
                if (parentEntity && parentEntity.type === 'epic') {
                    epicId = this.formatEntityId(parentEntity.id, 'epic')
                }
            }

            return await this.entityToTask(entity, epicId)
        } catch (error) {
            return null
        }
    }

    /**
     * Load all ideas from database
     * @returns Array of all ideas
     */
    async loadAllIdeas(): Promise<Idea[]> {
        try {
            await this.ensureDataDir()
            const entities = await this.getEntitiesByType('idea')
            return entities.map((entity: Entity) => this.entityToIdea(entity))
        } catch (error) {
            return []
        }
    }

    /**
     * Load all epics from database
     * @returns Array of all epics
     */
    async loadAllEpics(): Promise<Epic[]> {
        try {
            await this.ensureDataDir()
            const entities = await this.getEntitiesByType('epic')

            const epics: Epic[] = []
            for (const entity of entities) {
                let ideaId = ''
                if (entity.parent_id) {
                    const parentEntity = await this.getEntity(entity.parent_id)
                    if (parentEntity && parentEntity.type === 'idea') {
                        ideaId = this.formatEntityId(parentEntity.id, 'idea')
                    }
                }
                epics.push(this.entityToEpic(entity, ideaId))
            }
            return epics
        } catch (error) {
            return []
        }
    }

    /**
     * Load all tasks from database
     * @returns Array of all tasks
     */
    async loadAllTasks(): Promise<Task[]> {
        try {
            await this.ensureDataDir()
            const taskEntities = await this.getEntitiesByType('task')
            const bugEntities = await this.getEntitiesByType('bug')
            const rndEntities = await this.getEntitiesByType('research')

            const allTaskEntities = [
                ...taskEntities,
                ...bugEntities,
                ...rndEntities,
            ]

            const tasks: Task[] = []
            for (const entity of allTaskEntities) {
                let epicId = ''
                if (entity.parent_id) {
                    const parentEntity = await this.getEntity(entity.parent_id)
                    if (parentEntity && parentEntity.type === 'epic') {
                        epicId = this.formatEntityId(parentEntity.id, 'epic')
                    }
                }
                tasks.push(await this.entityToTask(entity, epicId))
            }
            return tasks
        } catch (error) {
            return []
        }
    }

    /**
     * Delete task by ID
     * @param id - Task ID
     * @returns Promise<void>
     */
    async deleteTask(id: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized')

        try {
            const numericId = this.parseEntityId(id)

            // Delete progress notes first
            await new Promise<void>((resolve, reject) => {
                this.db!.run(
                    'DELETE FROM progress_notes WHERE entity_id = ?',
                    [numericId],
                    (err) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve()
                        }
                    }
                )
            })

            // Delete the task entity
            await new Promise<void>((resolve, reject) => {
                this.db!.run(
                    'DELETE FROM entities WHERE id = ?',
                    [numericId],
                    (err) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve()
                        }
                    }
                )
            })
        } catch (error) {
            throw new Error(`Failed to delete task ${id}: ${error}`)
        }
    }

    /**
     * Delete epic by ID and all its tasks
     * @param id - Epic ID
     * @returns Promise<void>
     */
    async deleteEpic(id: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized')

        try {
            const numericId = this.parseEntityId(id)

            // Get all tasks in this epic
            const tasks = await new Promise<any[]>((resolve, reject) => {
                this.db!.all(
                    'SELECT * FROM entities WHERE parent_id = ? AND type IN (?, ?, ?)',
                    [numericId, 'task', 'bug', 'research'],
                    (err, rows) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(rows as any[])
                        }
                    }
                )
            })

            // Delete all tasks in this epic
            for (const task of tasks) {
                await this.deleteTask(this.formatEntityId(task.id, task.type))
            }

            // Delete progress notes for the epic
            await new Promise<void>((resolve, reject) => {
                this.db!.run(
                    'DELETE FROM progress_notes WHERE entity_id = ?',
                    [numericId],
                    (err) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve()
                        }
                    }
                )
            })

            // Delete the epic entity
            await new Promise<void>((resolve, reject) => {
                this.db!.run(
                    'DELETE FROM entities WHERE id = ?',
                    [numericId],
                    (err) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve()
                        }
                    }
                )
            })
        } catch (error) {
            throw new Error(`Failed to delete epic ${id}: ${error}`)
        }
    }

    /**
     * Delete idea by ID and all its epics and tasks
     * @param id - Idea ID
     * @returns Promise<void>
     */
    async deleteIdea(id: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized')

        try {
            const numericId = this.parseEntityId(id)

            // Get all epics in this idea
            const epics = await new Promise<any[]>((resolve, reject) => {
                this.db!.all(
                    'SELECT * FROM entities WHERE parent_id = ? AND type = ?',
                    [numericId, 'epic'],
                    (err, rows) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(rows as any[])
                        }
                    }
                )
            })

            // Delete all epics in this idea (and their tasks)
            for (const epic of epics) {
                await this.deleteEpic(this.formatEntityId(epic.id, 'epic'))
            }

            // Delete progress notes for the idea
            await new Promise<void>((resolve, reject) => {
                this.db!.run(
                    'DELETE FROM progress_notes WHERE entity_id = ?',
                    [numericId],
                    (err) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve()
                        }
                    }
                )
            })

            // Delete the idea entity
            await new Promise<void>((resolve, reject) => {
                this.db!.run(
                    'DELETE FROM entities WHERE id = ?',
                    [numericId],
                    (err) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve()
                        }
                    }
                )
            })
        } catch (error) {
            throw new Error(`Failed to delete idea ${id}: ${error}`)
        }
    }
}
