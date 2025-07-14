import {
    EpicData,
    IdeaData,
    NavigationState,
    TaskData,
} from '../../types/index.js'
import { ScreenView } from '../base/screen-view.js'

/**
 * View for rendering epic details screen
 * Handles fullscreen two-column layout (30% epic info, 70% tasks)
 */
export class EpicDetailsScreenView extends ScreenView {
    /**
     * Render epic details screen with fullscreen two-column layout
     */
    render(
        data: {
            epic: EpicData
            tasks: TaskData[]
            statistics: any
            idea?: IdeaData
        },
        navigationState: NavigationState,
        selectedIndex: number,
        isLive: boolean,
        refreshInterval: number
    ): void {
        // Enable fullscreen mode
        this.terminal.fullscreen(true)
        this.terminal.clear()
        this.terminal.moveTo(1, 1)

        const termWidth = this.getTerminalWidth()
        const termHeight = this.getTerminalHeight()

        // Two column layout - 30% left (epic info), 70% right (tasks)
        const leftWidth = Math.floor(termWidth * 0.3) - 2
        const rightWidth = termWidth - leftWidth - 3

        this.renderTwoColumnLayout(
            data.epic,
            data.tasks,
            data.statistics,
            data.idea,
            navigationState,
            leftWidth,
            rightWidth,
            termHeight,
            selectedIndex
        )
    }

    /**
     * Render two column layout with fullscreen positioning
     */
    private renderTwoColumnLayout(
        epic: EpicData,
        tasks: TaskData[],
        statistics: any,
        idea: IdeaData | undefined,
        navigation: NavigationState,
        leftWidth: number,
        rightWidth: number,
        termHeight: number,
        selectedTaskIndex: number
    ): void {
        // Calculate common column height (leave space for navigation help)
        const columnHeight = termHeight - 1
        const sidebarScrollOffset = navigation.epicSidebarScrollOffset || 0

        // Left column - Epic Info
        this.renderLeftColumn(
            epic,
            statistics,
            idea,
            leftWidth,
            columnHeight,
            sidebarScrollOffset
        )

        // Right column - Tasks
        this.renderRightColumn(
            tasks,
            rightWidth,
            columnHeight,
            leftWidth,
            selectedTaskIndex
        )

        // Navigation help at bottom
        this.renderNavigationHelp(termHeight, sidebarScrollOffset > 0)
    }

    /**
     * Render left column with epic details
     */
    private renderLeftColumn(
        epic: EpicData,
        statistics: any,
        idea: IdeaData | undefined,
        leftWidth: number,
        columnHeight: number,
        sidebarScrollOffset: number
    ): void {
        let currentRow = 1

        // Epic Header
        currentRow = this.renderEpicHeader(epic, idea, leftWidth, currentRow)

        // Epic Info
        currentRow = this.renderEpicInfo(epic, leftWidth, currentRow)

        // Task Statistics
        currentRow = this.renderTaskStats(statistics, leftWidth, currentRow)

        // Description - use remaining space until column height
        const descriptionHeight = columnHeight - currentRow
        this.renderEpicDescription(
            epic,
            leftWidth,
            currentRow,
            descriptionHeight,
            sidebarScrollOffset
        )
    }

    /**
     * Render epic header for two column layout
     */
    private renderEpicHeader(
        epic: EpicData,
        idea: IdeaData | undefined,
        leftWidth: number,
        startRow: number
    ): number {
        let currentRow = startRow

        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold('╔' + '═'.repeat(leftWidth - 2) + '╗')
        currentRow++

        // Show idea context if available
        if (idea) {
            this.terminal.moveTo(1, currentRow)
            const ideaText = `║ 💡 ${idea.title}`
            this.terminal.gray(
                ideaText.substring(0, leftWidth - 1).padEnd(leftWidth - 1) + '║'
            )
            currentRow++

            this.terminal.moveTo(1, currentRow)
            this.terminal.cyan.bold('╠' + '═'.repeat(leftWidth - 2) + '╣')
            currentRow++
        }

        this.terminal.moveTo(1, currentRow)
        const epicText = `║ 🎯 ${epic.id}`
        this.terminal.cyan.bold(epicText.padEnd(leftWidth - 1) + '║')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        const epicTitleText = `║ ${epic.title}`
        this.terminal.cyan.bold(
            epicTitleText.substring(0, leftWidth - 1).padEnd(leftWidth - 1) +
                '║'
        )
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold('╠' + '═'.repeat(leftWidth - 2) + '╣')
        currentRow++

        return currentRow
    }

    /**
     * Render epic info for two column layout
     */
    private renderEpicInfo(
        epic: EpicData,
        leftWidth: number,
        startRow: number
    ): number {
        let currentRow = startRow

        // Status and priority
        const statusIcon = this.getStatusIcon(epic.status)
        const priorityIcon = this.getPriorityIcon(epic.priority)

        this.terminal.moveTo(1, currentRow)
        this.terminal.white(
            `║ Status: ${statusIcon}`.padEnd(leftWidth - 1) + '║'
        )
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal.white(
            `║ Priority: ${priorityIcon}`.padEnd(leftWidth - 1) + '║'
        )
        currentRow++

        // Created date
        const created = new Date(epic.created_at).toLocaleDateString()
        this.terminal.moveTo(1, currentRow)
        this.terminal.gray(`║ Created: ${created}`.padEnd(leftWidth - 1) + '║')
        currentRow++

        // Updated date
        const updated = new Date(epic.updated_at).toLocaleDateString()
        this.terminal.moveTo(1, currentRow)
        this.terminal.gray(`║ Updated: ${updated}`.padEnd(leftWidth - 1) + '║')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
        currentRow++

        return currentRow
    }

    /**
     * Render task statistics for two column layout
     */
    private renderTaskStats(
        statistics: any,
        leftWidth: number,
        startRow: number
    ): number {
        let currentRow = startRow

        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold('╠' + '═'.repeat(leftWidth - 2) + '╣')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold(
            '║ 📊 Epic Progress'.padEnd(leftWidth - 1) + '║'
        )
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
        currentRow++

        // Progress bar
        const progressBar = this.createProgressBar(
            statistics.completed,
            statistics.total,
            leftWidth - 6
        )
        this.terminal.moveTo(1, currentRow)
        this.terminal.green(`║ ${progressBar}`.padEnd(leftWidth - 1) + '║')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
        currentRow++

        // Stats
        this.terminal.moveTo(1, currentRow)
        this.terminal.white(
            `║ Total: ${statistics.total}`.padEnd(leftWidth - 1) + '║'
        )
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal.green(
            `║ ✅ Done: ${statistics.completed}`.padEnd(leftWidth - 1) + '║'
        )
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal.yellow(
            `║ ⚡ Progress: ${statistics.inProgress}`.padEnd(leftWidth - 1) +
                '║'
        )
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal.gray(
            `║ ⏳ Pending: ${statistics.pending}`.padEnd(leftWidth - 1) + '║'
        )
        currentRow++

        if (statistics.blocked > 0) {
            this.terminal.moveTo(1, currentRow)
            this.terminal.red(
                `║ 🚫 Blocked: ${statistics.blocked}`.padEnd(leftWidth - 1) +
                    '║'
            )
            currentRow++
        }

        this.terminal.moveTo(1, currentRow)
        this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
        currentRow++

        return currentRow
    }

    /**
     * Render epic description for two column layout with scrolling support
     */
    private renderEpicDescription(
        epic: EpicData,
        leftWidth: number,
        startRow: number,
        availableHeight: number,
        sidebarScrollOffset: number
    ): void {
        let currentRow = startRow
        const targetEndRow = startRow + availableHeight - 1

        // Description header
        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold('╠' + '═'.repeat(leftWidth - 2) + '╣')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold('║ 📝 Description'.padEnd(leftWidth - 1) + '║')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
        currentRow++

        // Description content with scrolling
        const description = epic.description || 'No description available'
        const descLines = this.wrapText(description, leftWidth - 6)
        const maxDescLines = targetEndRow - currentRow - 2 // -2 for scroll info and footer
        const descOffset = sidebarScrollOffset
        const visibleDescLines = descLines.slice(
            descOffset,
            descOffset + maxDescLines
        )

        for (let i = 0; i < visibleDescLines.length; i++) {
            this.terminal.moveTo(1, currentRow)
            this.terminal.white(
                `║ ${visibleDescLines[i]}`.padEnd(leftWidth - 1) + '║'
            )
            currentRow++
        }

        // Fill remaining space until scroll info line
        while (currentRow < targetEndRow - 1) {
            this.terminal.moveTo(1, currentRow)
            this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
            currentRow++
        }

        // Scroll info line if needed
        if (descLines.length > maxDescLines) {
            const scrollInfo = `lines ${descOffset + 1}-${Math.min(descOffset + maxDescLines, descLines.length)} of ${descLines.length}`
            this.terminal.moveTo(1, currentRow)
            this.terminal.gray(`║ ${scrollInfo}`.padEnd(leftWidth - 1) + '║')
        } else {
            this.terminal.moveTo(1, currentRow)
            this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
        }
        currentRow++

        // Footer at exact target position
        this.terminal.moveTo(1, targetEndRow)
        this.terminal.cyan.bold('╚' + '═'.repeat(leftWidth - 2) + '╝')
    }

    /**
     * Render right column with tasks
     */
    private renderRightColumn(
        tasks: TaskData[],
        rightWidth: number,
        columnHeight: number,
        leftWidth: number,
        selectedTaskIndex: number
    ): void {
        const rightStartCol = leftWidth + 4
        let currentRow = 1

        // Tasks Header
        this.terminal.moveTo(rightStartCol, currentRow)
        this.terminal.cyan.bold('╔' + '═'.repeat(rightWidth - 2) + '╗')
        currentRow++

        this.terminal.moveTo(rightStartCol, currentRow)
        this.terminal.cyan.bold(
            `║ 📋 Epic Tasks (${tasks.length})`.padEnd(rightWidth - 1) + '║'
        )
        currentRow++

        this.terminal.moveTo(rightStartCol, currentRow)
        this.terminal.cyan.bold('╠' + '═'.repeat(rightWidth - 2) + '╣')
        currentRow++

        // Check if there are no tasks
        if (tasks.length === 0) {
            this.renderEmptyTasks(
                rightStartCol,
                rightWidth,
                currentRow,
                columnHeight
            )
            return
        }

        // Render tasks table
        this.renderTasksTable(
            tasks,
            rightStartCol,
            rightWidth,
            currentRow,
            columnHeight,
            selectedTaskIndex
        )
    }

    /**
     * Render empty tasks state
     */
    private renderEmptyTasks(
        startCol: number,
        width: number,
        startRow: number,
        columnHeight: number
    ): void {
        const centerRow = Math.floor(columnHeight / 2)
        this.terminal.moveTo(startCol, centerRow)
        this.terminal.gray(
            `║ ${this.centerText('No tasks found for this epic', width - 4)}║`
        )

        // Fill remaining space with empty borders
        for (let row = startRow; row < columnHeight; row++) {
            if (row !== centerRow) {
                this.terminal.moveTo(startCol, row)
                this.terminal('║' + ' '.repeat(width - 2) + '║')
            }
        }

        // Footer
        this.terminal.moveTo(startCol, columnHeight)
        this.terminal.cyan.bold('╚' + '═'.repeat(width - 2) + '╝')
    }

    /**
     * Render tasks table grouped by status
     */
    private renderTasksTable(
        tasks: TaskData[],
        startCol: number,
        width: number,
        startRow: number,
        columnHeight: number,
        selectedTaskIndex: number
    ): void {
        let currentRow = startRow
        let taskIndex = 0

        // Group tasks by status
        const groupedTasks = this.groupTasksByStatus(tasks)

        // Render table header
        currentRow = this.renderTasksTableHeader(startCol, width, currentRow)

        // Render each status group
        const groups = [
            {
                name: 'Pending',
                icon: '⏳',
                tasks: groupedTasks.pending,
                color: 'gray',
            },
            {
                name: 'In Progress',
                icon: '⚡',
                tasks: groupedTasks.inProgress,
                color: 'yellow',
            },
            {
                name: 'Blocked',
                icon: '🚫',
                tasks: groupedTasks.blocked,
                color: 'red',
            },
            {
                name: 'Completed',
                icon: '✅',
                tasks: groupedTasks.completed.slice(0, 3),
                color: 'green',
            }, // Limit completed
        ]

        for (const group of groups) {
            if (group.tasks.length > 0) {
                // Render group header if there's space
                if (currentRow < columnHeight - 2) {
                    this.terminal.moveTo(startCol, currentRow)
                    ;(this.terminal as any)[group.color](
                        `║ ${group.icon} ${group.name}`.padEnd(width - 1) + '║'
                    )
                    currentRow++
                }

                for (const task of group.tasks) {
                    if (currentRow >= columnHeight - 1) break

                    this.renderTaskRow(
                        task,
                        taskIndex,
                        selectedTaskIndex,
                        startCol,
                        width,
                        currentRow
                    )

                    currentRow++
                    taskIndex++
                }
            }
        }

        // Fill remaining space and add footer
        while (currentRow < columnHeight) {
            this.terminal.moveTo(startCol, currentRow)
            this.terminal('║' + ' '.repeat(width - 2) + '║')
            currentRow++
        }

        this.terminal.moveTo(startCol, columnHeight)
        this.terminal.cyan.bold('╚' + '═'.repeat(width - 2) + '╝')
    }

    /**
     * Render tasks table header
     */
    private renderTasksTableHeader(
        startCol: number,
        width: number,
        startRow: number
    ): number {
        const idWidth = 8
        const titleWidth = Math.max(20, width - 28)
        const priorityWidth = 8
        const statusWidth = 8

        this.terminal.moveTo(startCol, startRow)
        this.terminal.cyan.bold('║ ')
        this.terminal.cyan.bold('ID'.padEnd(idWidth))
        this.terminal.cyan.bold('Title'.padEnd(titleWidth))
        this.terminal.cyan.bold('Priority'.padEnd(priorityWidth))
        this.terminal.cyan.bold('Status'.padEnd(statusWidth))
        this.terminal.cyan.bold('║')

        const nextRow = startRow + 1
        this.terminal.moveTo(startCol, nextRow)
        this.terminal.gray('║ ' + '─'.repeat(width - 4) + ' ║')

        return nextRow + 1
    }

    /**
     * Render a single task row
     */
    private renderTaskRow(
        task: TaskData,
        taskIndex: number,
        selectedTaskIndex: number,
        startCol: number,
        width: number,
        row: number
    ): void {
        const isSelected = taskIndex === selectedTaskIndex
        const idWidth = 8
        const titleWidth = Math.max(20, width - 28)
        const priorityWidth = 8
        const statusWidth = 8

        // Truncate title if too long
        let taskTitle = task.title
        if (taskTitle.length > titleWidth) {
            taskTitle = taskTitle.substring(0, titleWidth - 3) + '...'
        }

        this.terminal.moveTo(startCol, row)

        if (isSelected) {
            this.terminal.bgYellow.black('║ ')
            this.terminal.bgYellow.black(task.id.padEnd(idWidth))
            this.terminal.bgYellow.black(taskTitle.padEnd(titleWidth))
            this.terminal.bgYellow.black(task.priority.padEnd(priorityWidth))
            this.terminal.bgYellow.black(task.status.padEnd(statusWidth))
            this.terminal.bgYellow.black('║')
        } else {
            this.terminal('║ ')
            this.terminal.cyan(task.id.padEnd(idWidth))
            this.terminal.white(taskTitle.padEnd(titleWidth))
            ;(this.terminal as any)[this.getPriorityColor(task.priority)](
                task.priority.padEnd(priorityWidth)
            )
            ;(this.terminal as any)[this.getStatusColor(task.status)](
                task.status.padEnd(statusWidth)
            )
            this.terminal('║')
        }
    }

    /**
     * Group tasks by status with priority sorting
     */
    private groupTasksByStatus(tasks: TaskData[]): {
        pending: TaskData[]
        inProgress: TaskData[]
        blocked: TaskData[]
        completed: TaskData[]
    } {
        const getPriorityOrder = (priority: string): number => {
            switch (priority) {
                case 'high':
                    return 3
                case 'medium':
                    return 2
                case 'low':
                    return 1
                default:
                    return 0
            }
        }

        const sortByPriority = (a: TaskData, b: TaskData): number => {
            return getPriorityOrder(b.priority) - getPriorityOrder(a.priority)
        }

        return {
            pending: tasks
                .filter((task) => task.status === 'pending')
                .sort(sortByPriority),
            inProgress: tasks
                .filter((task) => task.status === 'in_progress')
                .sort(sortByPriority),
            blocked: tasks
                .filter((task) => task.status === 'blocked')
                .sort(sortByPriority),
            completed: tasks
                .filter(
                    (task) =>
                        task.status === 'completed' || task.status === 'done'
                )
                .sort(sortByPriority),
        }
    }

    /**
     * Create progress bar
     */
    private createProgressBar(
        completed: number,
        total: number,
        width: number
    ): string {
        if (total === 0) return '─'.repeat(width) + ' 0%'

        const percentage = Math.round((completed / total) * 100)
        const filledWidth = Math.round((completed / total) * (width - 4))
        const emptyWidth = width - 4 - filledWidth

        return (
            '█'.repeat(filledWidth) + '░'.repeat(emptyWidth) + ` ${percentage}%`
        )
    }

    /**
     * Render navigation help at bottom
     */
    private renderNavigationHelp(
        termHeight: number,
        hasScrollableContent: boolean
    ): void {
        this.terminal.moveTo(1, termHeight)
        let helpText =
            '↑/↓ navigate tasks • Enter: show task details • Backspace: return'

        if (hasScrollableContent) {
            helpText += ' • W/S: scroll epic info'
        }

        helpText += ' • Q: quit'

        this.terminal.cyan.bold(helpText)
    }

    /**
     * Get priority icon for display
     */
    private getPriorityIcon(priority: string): string {
        switch (priority?.toLowerCase()) {
            case 'high':
                return '🔥 High'
            case 'medium':
                return '🟡 Medium'
            case 'low':
                return '🟢 Low'
            default:
                return '⚪ ' + priority
        }
    }
}
