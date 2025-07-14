export interface ProjectData {
    id: string
    name: string
    path: string
    database_path: string
    last_used: string
    usage_count: number
    created_at: string
}

export interface IdeaData {
    id: string
    title: string
    description: string
    status: string
    priority: string
    created_at: string
    updated_at: string
}

export interface EpicData {
    id: string
    idea_id: string
    title: string
    description: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    tasks?: TaskData[]
    idea_title?: string
}

export interface TaskData {
    id: string
    epic_id: string
    title: string
    description: string
    status: string
    priority: string
    dependencies?: string[]
    created_at: string
    updated_at: string
    progress_notes?: ProgressNote[]
    epic?: EpicData
    idea?: IdeaData
}

export interface ProgressNote {
    id: number
    entity_id: number
    note: string
    type: 'update' | 'comment' | 'blocker' | 'completion'
    created_at: string
}

export interface NavigationState {
    level:
        | 'projects'
        | 'ideas'
        | 'idea_details'
        | 'epic_details'
        | 'task_details'
    selectedProject?: ProjectData
    selectedIdea?: IdeaData
    selectedEpic?: EpicData
    selectedTask?: TaskData
    selectedIndex: number
    // Scroll state for task details
    descriptionScrollOffset?: number
    progressNotesScrollOffset?: number
    // Scroll state for epic details
    epicSidebarScrollOffset?: number
}

export interface AppState {
    navigation: NavigationState
    isLive: boolean
    refreshInterval: number
    refreshIntervalId?: NodeJS.Timeout
}
