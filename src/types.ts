/**
 * Represents a high-level project idea
 */
export interface Idea {
    id: string
    title: string
    description: string
    status: TaskStatus
    priority: Priority
    createdAt: Date
    updatedAt: Date
    epics: Epic[]
}

/**
 * Represents a major implementation phase within an idea
 */
export interface Epic {
    id: string
    ideaId: string
    title: string
    description: string
    status: TaskStatus
    priority: Priority
    createdAt: Date
    updatedAt: Date
    tasks: Task[]
}

/**
 * Represents a specific development task
 */
export interface Task {
    id: string
    epicId: string
    title: string
    description: string
    type: TaskType
    status: TaskStatus
    dependencies: string[]
    priority: Priority
    createdAt: Date
    updatedAt: Date
    progressNotes: ProgressNote[]
}

/**
 * Represents a progress note for tracking task updates
 */
export interface ProgressNote {
    id: string
    taskId: string
    content: string
    timestamp: Date
    type: ProgressType
}

/**
 * Available task statuses
 */
export type TaskStatus =
    | 'pending'
    | 'in-progress'
    | 'done'
    | 'blocked'
    | 'deferred'
/**
 * Available task types
 */
export type TaskType = 'task' | 'bug' | 'rnd'
/**
 * Available priority levels
 */
export type Priority = 'low' | 'medium' | 'high'
/**
 * Available progress note types
 */
export type ProgressType = 'update' | 'comment' | 'blocker' | 'completion'

/**
 * Arguments for creating a new idea
 */
export interface CreateIdeaArgs {
    title: string
    description: string
    priority?: Priority
}

/**
 * Arguments for creating a new epic
 */
export interface CreateEpicArgs {
    ideaId: string
    title: string
    description: string
    priority?: Priority
}

/**
 * Arguments for creating a new task
 */
export interface CreateTaskArgs {
    epicId: string
    title: string
    description: string
    type: TaskType
    priority: Priority
    dependencies?: string[]
}

/**
 * Arguments for updating an existing task
 */
export interface UpdateTaskArgs {
    taskId: string
    status?: TaskStatus
    progressNote?: string
    progressType?: ProgressType
}

/**
 * Arguments for getting the next available task
 */
export interface NextTaskArgs {
    priority?: Priority
}

/**
 * Arguments for breaking down a task into subtasks
 */
export interface BreakDownTaskArgs {
    taskId: string
    suggestedSubtasks?: string[]
}
