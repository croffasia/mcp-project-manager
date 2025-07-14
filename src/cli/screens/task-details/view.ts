import {
    EpicData,
    IdeaData,
    NavigationState,
    TaskData,
} from '../../types/index.js'
import { ScreenView } from '../base/screen-view.js'

/**
 * View for rendering task details screen
 * Handles fullscreen two-column layout (70% task info, 30% progress notes)
 */
export class TaskDetailsScreenView extends ScreenView {
    /**
     * Render task details screen with fullscreen two-column layout
     */
    render(
        data: {
            task: TaskData & { epic?: EpicData; idea?: IdeaData }
            scrollOffsets: any
            dependencies?: TaskData[]
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

        // Two column layout - 70% left (task info), 30% right (progress notes)
        const leftWidth = Math.floor(termWidth * 0.7) - 2
        const rightWidth = termWidth - leftWidth - 3

        this.renderTwoColumnLayout(
            data.task,
            data.scrollOffsets,
            navigationState,
            leftWidth,
            rightWidth,
            termHeight,
            data.dependencies
        )
    }

    /**
     * Render two column layout with fullscreen positioning
     */
    private renderTwoColumnLayout(
        task: TaskData & { epic?: EpicData; idea?: IdeaData },
        scrollOffsets: any,
        navigation: NavigationState,
        leftWidth: number,
        rightWidth: number,
        termHeight: number,
        dependencies?: TaskData[]
    ): void {
        // Calculate common column height (leave space for navigation help)
        const columnHeight = termHeight - 1

        // Left column - Header, Task Info, Metadata and Description
        this.renderLeftColumn(
            task,
            scrollOffsets,
            leftWidth,
            columnHeight,
            dependencies
        )

        // Right column - Progress Notes
        this.renderRightColumn(
            task,
            scrollOffsets,
            rightWidth,
            columnHeight,
            leftWidth
        )

        // Navigation help at bottom
        this.renderNavigationHelp(termHeight)
    }

    /**
     * Render left column with task details
     */
    private renderLeftColumn(
        task: TaskData & { epic?: EpicData; idea?: IdeaData },
        scrollOffsets: any,
        leftWidth: number,
        columnHeight: number,
        dependencies?: TaskData[]
    ): void {
        let currentRow = 1

        // Header
        currentRow = this.renderTaskHeader(task, leftWidth, currentRow)

        // Task Info
        currentRow = this.renderTaskInfo(task, leftWidth, currentRow)

        // Metadata
        currentRow = this.renderTaskMetadata(task, leftWidth, currentRow)

        // Dependencies
        currentRow = this.renderTaskDependencies(
            task,
            leftWidth,
            currentRow,
            dependencies
        )

        // Description - use remaining space until column height
        const descriptionHeight = columnHeight - currentRow
        this.renderTaskDescription(
            task,
            scrollOffsets.descriptionScrollOffset,
            leftWidth,
            currentRow,
            descriptionHeight
        )
    }

    /**
     * Render task header
     */
    private renderTaskHeader(
        task: TaskData & { epic?: EpicData; idea?: IdeaData },
        leftWidth: number,
        startRow: number
    ): number {
        let currentRow = startRow

        // Get task type and icon
        const taskType = this.getTaskType(task.id)
        const taskIcon = this.getTaskTypeIcon(task.id)

        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold('╔' + '═'.repeat(leftWidth - 2) + '╗')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        const headerText = `║ ${taskIcon} ${taskType} Details`
        this.terminal.cyan.bold(headerText.padEnd(leftWidth - 1) + '║')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold('╠' + '═'.repeat(leftWidth - 2) + '╣')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        const titleText = `║ ${task.title}`
        this.terminal.white.bold(
            titleText.substring(0, leftWidth - 1).padEnd(leftWidth - 1) + '║'
        )
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold('╠' + '═'.repeat(leftWidth - 2) + '╣')
        currentRow++

        return currentRow
    }

    /**
     * Render task info section
     */
    private renderTaskInfo(
        task: TaskData & { epic?: EpicData; idea?: IdeaData },
        leftWidth: number,
        startRow: number
    ): number {
        let currentRow = startRow

        // Task ID
        this.terminal.moveTo(1, currentRow)
        this.terminal.white(`║ ID: ${task.id}`.padEnd(leftWidth - 1) + '║')
        currentRow++

        // Epic info
        if (task.epic) {
            this.terminal.moveTo(1, currentRow)
            this.terminal.blue(
                `║ Epic: ${task.epic.title}`
                    .substring(0, leftWidth - 1)
                    .padEnd(leftWidth - 1) + '║'
            )
            currentRow++
        }

        // Idea info
        if (task.idea) {
            this.terminal.moveTo(1, currentRow)
            this.terminal.blue(
                `║ Idea: ${task.idea.title}`
                    .substring(0, leftWidth - 1)
                    .padEnd(leftWidth - 1) + '║'
            )
            currentRow++
        }

        this.terminal.moveTo(1, currentRow)
        this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
        currentRow++

        return currentRow
    }

    /**
     * Render task metadata section
     */
    private renderTaskMetadata(
        task: TaskData & { epic?: EpicData; idea?: IdeaData },
        leftWidth: number,
        startRow: number
    ): number {
        let currentRow = startRow

        // Status and priority
        const statusIcon = this.getStatusIcon(task.status)
        const priorityIcon = this.getPriorityIcon(task.priority)

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
        const created = new Date(task.created_at).toLocaleDateString()
        this.terminal.moveTo(1, currentRow)
        this.terminal.gray(`║ Created: ${created}`.padEnd(leftWidth - 1) + '║')
        currentRow++

        // Updated date
        const updated = new Date(task.updated_at).toLocaleDateString()
        this.terminal.moveTo(1, currentRow)
        this.terminal.gray(`║ Updated: ${updated}`.padEnd(leftWidth - 1) + '║')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
        currentRow++

        return currentRow
    }

    /**
     * Render task dependencies section
     */
    private renderTaskDependencies(
        task: TaskData & { epic?: EpicData; idea?: IdeaData },
        leftWidth: number,
        startRow: number,
        dependencies?: TaskData[]
    ): number {
        let currentRow = startRow

        // Only render if there are dependencies
        if (!task.dependencies || task.dependencies.length === 0) {
            return currentRow
        }

        // Dependencies header
        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold('╠' + '═'.repeat(leftWidth - 2) + '╣')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold(
            `║ 🔗 Dependencies (${task.dependencies.length})`.padEnd(
                leftWidth - 1
            ) + '║'
        )
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
        currentRow++

        // Render each dependency
        for (const depId of task.dependencies) {
            const depTask = dependencies?.find((d) => d.id === depId)

            this.terminal.moveTo(1, currentRow)
            if (depTask) {
                const statusIcon = this.getStatusIcon(depTask.status)
                const depText = `║ ${depId} | ${depTask.title} | ${statusIcon}`
                this.terminal.white(
                    depText.substring(0, leftWidth - 1).padEnd(leftWidth - 1) +
                        '║'
                )
            } else {
                const depText = `║ ${depId} | (не найден) | ❓`
                this.terminal.gray(
                    depText.substring(0, leftWidth - 1).padEnd(leftWidth - 1) +
                        '║'
                )
            }
            currentRow++
        }

        this.terminal.moveTo(1, currentRow)
        this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
        currentRow++

        return currentRow
    }

    /**
     * Render task description with scrolling support
     */
    private renderTaskDescription(
        task: TaskData & { epic?: EpicData; idea?: IdeaData },
        descriptionScrollOffset: number,
        leftWidth: number,
        startRow: number,
        availableHeight: number
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
        const description = task.description || 'No description available'
        const descLines = this.wrapText(description, leftWidth - 6)
        const maxDescLines = targetEndRow - currentRow - 2 // -2 for scroll info and footer
        const descOffset = descriptionScrollOffset
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
     * Render right column with progress notes
     */
    private renderRightColumn(
        task: TaskData & { epic?: EpicData; idea?: IdeaData },
        scrollOffsets: any,
        rightWidth: number,
        columnHeight: number,
        leftWidth: number
    ): void {
        const rightStartCol = leftWidth + 4
        let currentRow = 1

        // Progress Notes Header
        this.terminal.moveTo(rightStartCol, currentRow)
        this.terminal.cyan.bold('╔' + '═'.repeat(rightWidth - 2) + '╗')
        currentRow++

        const progressNotes = task.progress_notes || []
        this.terminal.moveTo(rightStartCol, currentRow)
        this.terminal.cyan.bold(
            `║ 📊 Progress Notes (${progressNotes.length})`.padEnd(
                rightWidth - 1
            ) + '║'
        )
        currentRow++

        this.terminal.moveTo(rightStartCol, currentRow)
        this.terminal.cyan.bold('╠' + '═'.repeat(rightWidth - 2) + '╣')
        currentRow++

        // Check if there are no progress notes
        if (progressNotes.length === 0) {
            this.renderEmptyProgressNotes(
                rightStartCol,
                rightWidth,
                currentRow,
                columnHeight
            )
            return
        }

        // Render progress notes with scrolling
        this.renderProgressNotes(
            progressNotes,
            scrollOffsets.progressNotesScrollOffset,
            rightStartCol,
            rightWidth,
            currentRow,
            columnHeight
        )
    }

    /**
     * Render empty progress notes state
     */
    private renderEmptyProgressNotes(
        startCol: number,
        width: number,
        startRow: number,
        columnHeight: number
    ): void {
        const centerRow = Math.floor((columnHeight - startRow) / 2) + startRow

        this.terminal.moveTo(startCol, centerRow)
        this.terminal.gray(
            `║ ${this.centerText('Еще нет progress notes', width - 4)}║`
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
     * Render progress notes with scrolling
     */
    private renderProgressNotes(
        progressNotes: any[],
        progressNotesScrollOffset: number,
        startCol: number,
        width: number,
        startRow: number,
        columnHeight: number
    ): void {
        let currentRow = startRow
        const availableSpace = columnHeight - startRow - 1 // -1 for footer

        // Calculate which notes to show with proper spacing
        const notesToShow = this.calculateVisibleNotes(
            progressNotes,
            progressNotesScrollOffset,
            availableSpace,
            width - 4
        )

        // Render scroll indicator if needed
        if (progressNotesScrollOffset > 0 || notesToShow.hasMore) {
            const scrollInfo = `notes ${progressNotesScrollOffset + 1}-${Math.min(progressNotesScrollOffset + notesToShow.notes.length, progressNotes.length)} of ${progressNotes.length}`
            this.terminal.moveTo(startCol, currentRow)
            this.terminal.gray(`║ ${scrollInfo}`.padEnd(width - 1) + '║')
            currentRow++
        }

        // Render notes
        for (const noteInfo of notesToShow.notes) {
            // Note header
            this.terminal.moveTo(startCol, currentRow)
            const noteIcon = this.getProgressNoteIcon(noteInfo.note.type)
            const noteDate = new Date(noteInfo.note.created_at).toLocaleString()
            const headerText = `${noteIcon} ${noteDate}`
            this.terminal.blue(
                `║ ${headerText}`.substring(0, width - 1).padEnd(width - 1) +
                    '║'
            )
            currentRow++

            // Note content
            for (const line of noteInfo.lines) {
                this.terminal.moveTo(startCol, currentRow)
                this.terminal.white(`║ ${line}`.padEnd(width - 1) + '║')
                currentRow++
            }

            // Spacing between notes
            if (currentRow < columnHeight) {
                this.terminal.moveTo(startCol, currentRow)
                this.terminal('║' + ' '.repeat(width - 2) + '║')
                currentRow++
            }
        }

        // Fill remaining space
        while (currentRow < columnHeight) {
            this.terminal.moveTo(startCol, currentRow)
            this.terminal('║' + ' '.repeat(width - 2) + '║')
            currentRow++
        }

        // Footer
        this.terminal.moveTo(startCol, columnHeight)
        this.terminal.cyan.bold('╚' + '═'.repeat(width - 2) + '╝')
    }

    /**
     * Calculate which notes are visible with proper line wrapping
     */
    private calculateVisibleNotes(
        progressNotes: any[],
        scrollOffset: number,
        availableSpace: number,
        contentWidth: number
    ): { notes: Array<{ note: any; lines: string[] }>; hasMore: boolean } {
        const result: Array<{ note: any; lines: string[] }> = []
        let usedSpace = 0

        // Reserve space for scroll indicator if needed
        if (scrollOffset > 0) {
            availableSpace -= 1
            usedSpace += 1
        }

        for (let i = scrollOffset; i < progressNotes.length; i++) {
            const note = progressNotes[i]
            const lines = this.wrapText(note.note || '', contentWidth)

            // Calculate space needed for this note (header + content + spacing)
            const spaceNeeded = 1 + lines.length + 1 // header + content lines + spacing

            // Conservative approach: don't start a note if we can't show meaningful content
            if (usedSpace + spaceNeeded > availableSpace && result.length > 0) {
                return { notes: result, hasMore: true }
            }

            // Add the note if we have space for at least the header and first line
            if (usedSpace + 2 <= availableSpace) {
                const visibleLines = lines.slice(
                    0,
                    Math.max(1, availableSpace - usedSpace - 2)
                )
                result.push({ note, lines: visibleLines })
                usedSpace += 1 + visibleLines.length + 1
            }

            if (usedSpace >= availableSpace) {
                break
            }
        }

        const hasMore = scrollOffset + result.length < progressNotes.length
        return { notes: result, hasMore }
    }

    /**
     * Get progress note icon based on type
     */
    private getProgressNoteIcon(type: string): string {
        switch (type?.toLowerCase()) {
            case 'update':
                return '📝'
            case 'comment':
                return '💬'
            case 'blocker':
                return '🚫'
            case 'completion':
                return '✅'
            default:
                return '📌'
        }
    }

    /**
     * Get task type from ID
     */
    private getTaskType(taskId: string): string {
        if (taskId.startsWith('TSK-')) return 'Task'
        if (taskId.startsWith('BUG-')) return 'Bug'
        if (taskId.startsWith('RND-')) return 'Research'
        return 'Task'
    }

    /**
     * Get task type icon from ID
     */
    private getTaskTypeIcon(taskId: string): string {
        if (taskId.startsWith('TSK-')) return '📋'
        if (taskId.startsWith('BUG-')) return '🐛'
        if (taskId.startsWith('RND-')) return '🔬'
        return '📄'
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

    /**
     * Render navigation help at bottom
     */
    private renderNavigationHelp(termHeight: number): void {
        this.terminal.moveTo(1, termHeight)
        this.terminal.cyan.bold(
            '↑/↓ scroll description • ←/→ scroll progress notes • Backspace: return • Q: quit'
        )
    }
}
