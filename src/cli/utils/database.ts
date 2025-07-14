import { promises as fs } from 'fs'
import path from 'path'
import sqlite3 from 'sqlite3'

import { EpicData, IdeaData, ProgressNote, TaskData } from '../types/index.js'

/**
 * Project configuration interface
 */
interface ProjectConfig {
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
 * Database utility class for project management
 */
export class ProjectDatabase {
    private db: sqlite3.Database | null = null
    private projectPath: string
    private config: ProjectConfig | null = null

    constructor(projectPath: string) {
        this.projectPath = projectPath
    }

    /**
     * Load project configuration
     */
    private async loadConfig(): Promise<void> {
        try {
            const configPath = path.join(
                this.projectPath,
                'project-config.json'
            )
            const configContent = await fs.readFile(configPath, 'utf-8')
            this.config = JSON.parse(configContent)
        } catch (error) {
            // Fallback to default config if file doesn't exist
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
                    description: 'Default project description',
                },
            }
        }
    }

    /**
     * Connect to the project database
     */
    async connect(): Promise<void> {
        // Load config first
        await this.loadConfig()

        return new Promise((resolve, reject) => {
            const dbPath = path.join(
                this.projectPath,
                '.product-task',
                'database.sqlite'
            )

            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    reject(
                        new Error(
                            `Failed to connect to database: ${err.message}`
                        )
                    )
                } else {
                    resolve()
                }
            })
        })
    }

    /**
     * Close database connection
     */
    async close(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err)
                    } else {
                        this.db = null
                        resolve()
                    }
                })
            } else {
                resolve()
            }
        })
    }

    /**
     * Get all ideas from the project
     */
    async getIdeas(): Promise<IdeaData[]> {
        if (!this.db) {
            throw new Error('Database not connected')
        }

        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, title, description, status, priority, created_at, updated_at
                FROM entities
                WHERE type = 'idea'
                ORDER BY created_at DESC
            `

            this.db!.all(query, [], (err, rows: any[]) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(
                        rows.map((row) => ({
                            id: `${this.config!.prefixes.idea}${this.config!.separator}${row.id}`,
                            title: row.title,
                            description: row.description || '',
                            status: row.status,
                            priority: row.priority,
                            created_at: row.created_at,
                            updated_at: row.updated_at,
                        }))
                    )
                }
            })
        })
    }

    /**
     * Get all epics for a specific idea
     */
    async getEpics(ideaId: string): Promise<EpicData[]> {
        if (!this.db) {
            throw new Error('Database not connected')
        }

        // Extract numeric ID from prefix format
        const prefix = `${this.config!.prefixes.idea}${this.config!.separator}`
        const numericIdeaId = ideaId.replace(prefix, '')

        return new Promise((resolve, reject) => {
            const query = `
                SELECT e.id, e.parent_id, e.title, e.description, e.status, e.priority, 
                       e.created_at, e.updated_at, i.title as idea_title
                FROM entities e
                LEFT JOIN entities i ON e.parent_id = i.id AND i.type = 'idea'
                WHERE e.type = 'epic' AND e.parent_id = ?
                ORDER BY e.created_at DESC
            `

            this.db!.all(query, [numericIdeaId], (err, rows: any[]) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(
                        rows.map((row) => ({
                            id: `${this.config!.prefixes.epic}${this.config!.separator}${row.id}`,
                            idea_id: ideaId,
                            title: row.title,
                            description: row.description || '',
                            status: row.status,
                            priority: row.priority,
                            created_at: row.created_at,
                            updated_at: row.updated_at,
                            idea_title: row.idea_title,
                        }))
                    )
                }
            })
        })
    }

    /**
     * Get all tasks for a specific epic
     */
    async getTasks(epicId: string): Promise<TaskData[]> {
        if (!this.db) {
            throw new Error('Database not connected')
        }

        // Extract numeric ID from prefix format
        const prefix = `${this.config!.prefixes.epic}${this.config!.separator}`
        const numericEpicId = epicId.replace(prefix, '')

        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, parent_id, title, description, status, priority, 
                       created_at, updated_at, type
                FROM entities
                WHERE type IN ('task', 'bug', 'research') AND parent_id = ?
                ORDER BY created_at DESC
            `

            this.db!.all(query, [numericEpicId], (err, rows: any[]) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(
                        rows.map((row) => {
                            const typePrefix =
                                row.type === 'research'
                                    ? this.config!.prefixes.rnd
                                    : row.type === 'bug'
                                      ? this.config!.prefixes.bug
                                      : this.config!.prefixes.task
                            return {
                                id: `${typePrefix}${this.config!.separator}${row.id}`,
                                epic_id: epicId,
                                title: row.title,
                                description: row.description || '',
                                status: row.status,
                                priority: row.priority,
                                created_at: row.created_at,
                                updated_at: row.updated_at,
                                estimated_hours: undefined,
                                actual_hours: undefined,
                            }
                        })
                    )
                }
            })
        })
    }

    /**
     * Get progress notes for a specific task
     */
    async getProgressNotes(entityId: number): Promise<ProgressNote[]> {
        if (!this.db) {
            throw new Error('Database not connected')
        }

        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, entity_id, note, type, created_at
                FROM progress_notes
                WHERE entity_id = ?
                ORDER BY created_at DESC
            `

            this.db!.all(query, [entityId], (err, rows: any[]) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(
                        rows.map((row) => ({
                            id: row.id,
                            entity_id: row.entity_id,
                            note: row.note,
                            type: row.type as
                                | 'update'
                                | 'comment'
                                | 'blocker'
                                | 'completion',
                            created_at: row.created_at,
                        }))
                    )
                }
            })
        })
    }

    /**
     * Get task count for a specific epic
     */
    async getTaskCountForEpic(epicId: string): Promise<number> {
        if (!this.db) {
            throw new Error('Database not connected')
        }

        // Extract numeric ID from prefix format
        const prefix = `${this.config!.prefixes.epic}${this.config!.separator}`
        const numericEpicId = epicId.replace(prefix, '')

        return new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(*) as count
                FROM entities
                WHERE type IN ('task', 'bug', 'research') AND parent_id = ?
            `

            this.db!.get(query, [numericEpicId], (err, row: any) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(row.count || 0)
                }
            })
        })
    }

    /**
     * Get epic information by ID
     */
    async getEpicById(epicId: string): Promise<EpicData | null> {
        if (!this.db) {
            throw new Error('Database not connected')
        }

        // Extract numeric ID from prefix format
        const prefix = `${this.config!.prefixes.epic}${this.config!.separator}`
        const numericEpicId = epicId.replace(prefix, '')

        return new Promise((resolve, reject) => {
            const query = `
                SELECT e.id, e.parent_id, e.title, e.description, e.status, e.priority, 
                       e.created_at, e.updated_at, i.title as idea_title
                FROM entities e
                LEFT JOIN entities i ON e.parent_id = i.id AND i.type = 'idea'
                WHERE e.type = 'epic' AND e.id = ?
            `

            this.db!.get(query, [numericEpicId], (err, row: any) => {
                if (err) {
                    reject(err)
                } else if (!row) {
                    resolve(null)
                } else {
                    // Get the idea ID for this epic
                    const ideaPrefix = `${this.config!.prefixes.idea}${this.config!.separator}`
                    resolve({
                        id: epicId,
                        idea_id: `${ideaPrefix}${row.parent_id}`,
                        title: row.title,
                        description: row.description || '',
                        status: row.status,
                        priority: row.priority,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                        idea_title: row.idea_title,
                    })
                }
            })
        })
    }

    /**
     * Get idea information by ID
     */
    async getIdeaById(ideaId: string): Promise<IdeaData | null> {
        if (!this.db) {
            throw new Error('Database not connected')
        }

        // Extract numeric ID from prefix format
        const prefix = `${this.config!.prefixes.idea}${this.config!.separator}`
        const numericIdeaId = ideaId.replace(prefix, '')

        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, title, description, status, priority, created_at, updated_at
                FROM entities
                WHERE type = 'idea' AND id = ?
            `

            this.db!.get(query, [numericIdeaId], (err, row: any) => {
                if (err) {
                    reject(err)
                } else if (!row) {
                    resolve(null)
                } else {
                    resolve({
                        id: ideaId,
                        title: row.title,
                        description: row.description || '',
                        status: row.status,
                        priority: row.priority,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                    })
                }
            })
        })
    }

    /**
     * Get a task by ID
     */
    async getTaskById(taskId: string): Promise<TaskData | null> {
        if (!this.db) {
            throw new Error('Database not connected')
        }

        const taskPrefix = this.getTaskPrefix(taskId)
        const numericTaskId = taskId.replace(taskPrefix, '')

        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, parent_id, title, description, status, priority, 
                       dependencies, created_at, updated_at, type
                FROM entities
                WHERE id = ? AND type IN ('task', 'bug', 'research')
            `

            this.db!.get(query, [numericTaskId], async (err, row: any) => {
                if (err) {
                    reject(err)
                } else if (!row) {
                    resolve(null)
                } else {
                    const taskData: TaskData = {
                        id: taskId,
                        epic_id: `EPIC-${row.parent_id}`,
                        title: row.title,
                        description: row.description,
                        status: row.status,
                        priority: row.priority,
                        dependencies: [],
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                    }

                    // Process dependencies
                    if (row.dependencies) {
                        const depIds = JSON.parse(row.dependencies)
                        const formattedDeps = await Promise.all(
                            depIds.map((depId: number) =>
                                this.formatTaskId(depId)
                            )
                        )
                        taskData.dependencies = formattedDeps
                    }

                    resolve(taskData)
                }
            })
        })
    }

    /**
     * Format numeric task ID to string format with proper prefix
     */
    private async formatTaskId(numericId: number): Promise<string> {
        if (!this.db) {
            return `TSK-${numericId}` // fallback
        }

        return new Promise((resolve) => {
            this.db!.get(
                'SELECT type FROM entities WHERE id = ?',
                [numericId],
                (err, row: any) => {
                    if (err || !row) {
                        resolve(`TSK-${numericId}`) // fallback
                        return
                    }

                    let prefix = 'TSK'
                    switch (row.type) {
                        case 'bug':
                            prefix = this.config!.prefixes.bug || 'BUG'
                            break
                        case 'research':
                            prefix = this.config!.prefixes.rnd || 'RND'
                            break
                        case 'task':
                        default:
                            prefix = this.config!.prefixes.task || 'TSK'
                            break
                    }
                    resolve(`${prefix}${this.config!.separator}${numericId}`)
                }
            )
        })
    }

    /**
     * Get task with its epic and idea information
     */
    async getTaskWithHierarchy(
        taskId: string
    ): Promise<(TaskData & { epic?: EpicData; idea?: IdeaData }) | null> {
        if (!this.db) {
            throw new Error('Database not connected')
        }

        // First get the task
        const taskPrefix = this.getTaskPrefix(taskId)
        const numericTaskId = taskId.replace(taskPrefix, '')

        return new Promise((resolve, reject) => {
            const query = `
                SELECT t.id, t.parent_id, t.title, t.description, t.status, t.priority, 
                       t.dependencies, t.created_at, t.updated_at, t.type,
                       e.id as epic_id, e.title as epic_title, e.parent_id as idea_id,
                       i.id as idea_numeric_id, i.title as idea_title
                FROM entities t
                LEFT JOIN entities e ON t.parent_id = e.id AND e.type = 'epic'
                LEFT JOIN entities i ON e.parent_id = i.id AND i.type = 'idea'
                WHERE t.id = ? AND t.type IN ('task', 'bug', 'research')
            `

            this.db!.get(query, [numericTaskId], async (err, row: any) => {
                if (err) {
                    reject(err)
                } else if (!row) {
                    resolve(null)
                } else {
                    const epicPrefix = `${this.config!.prefixes.epic}${this.config!.separator}`
                    const ideaPrefix = `${this.config!.prefixes.idea}${this.config!.separator}`

                    const result: TaskData & {
                        epic?: EpicData
                        idea?: IdeaData
                    } = {
                        id: taskId,
                        epic_id: row.epic_id
                            ? `${epicPrefix}${row.epic_id}`
                            : '',
                        title: row.title,
                        description: row.description || '',
                        status: row.status,
                        priority: row.priority,
                        dependencies: [],
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                    }

                    // Process dependencies
                    if (row.dependencies) {
                        const depIds = JSON.parse(row.dependencies)
                        const formattedDeps = await Promise.all(
                            depIds.map((depId: number) =>
                                this.formatTaskId(depId)
                            )
                        )
                        result.dependencies = formattedDeps
                    }

                    // Add epic information if available
                    if (row.epic_id) {
                        result.epic = {
                            id: `${epicPrefix}${row.epic_id}`,
                            idea_id: row.idea_numeric_id
                                ? `${ideaPrefix}${row.idea_numeric_id}`
                                : '',
                            title: row.epic_title,
                            description: '',
                            status: '',
                            priority: '',
                            created_at: '',
                            updated_at: '',
                        }
                    }

                    // Add idea information if available
                    if (row.idea_numeric_id) {
                        result.idea = {
                            id: `${ideaPrefix}${row.idea_numeric_id}`,
                            title: row.idea_title,
                            description: '',
                            status: '',
                            priority: '',
                            created_at: '',
                            updated_at: '',
                        }
                    }

                    // Load progress notes
                    try {
                        const progressNotes = await this.getProgressNotes(
                            parseInt(numericTaskId)
                        )
                        result.progress_notes = progressNotes
                    } catch (error) {
                        result.progress_notes = []
                    }

                    resolve(result)
                }
            })
        })
    }

    /**
     * Get task prefix based on task ID
     */
    private getTaskPrefix(taskId: string): string {
        if (taskId.startsWith(this.config!.prefixes.bug)) {
            return `${this.config!.prefixes.bug}${this.config!.separator}`
        } else if (taskId.startsWith(this.config!.prefixes.rnd)) {
            return `${this.config!.prefixes.rnd}${this.config!.separator}`
        } else {
            return `${this.config!.prefixes.task}${this.config!.separator}`
        }
    }

    /**
     * Get project configuration
     */
    getProjectConfig(): ProjectConfig | null {
        return this.config
    }

    /**
     * Check if project has .product-task directory and database
     */
    static async isValidProject(projectPath: string): Promise<boolean> {
        try {
            const fs = await import('fs')
            const dbPath = path.join(
                projectPath,
                '.product-task',
                'database.sqlite'
            )
            return fs.existsSync(dbPath)
        } catch {
            return false
        }
    }
}
