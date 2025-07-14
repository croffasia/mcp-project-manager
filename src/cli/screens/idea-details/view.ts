import { EpicData, IdeaData, NavigationState } from '../../types/index.js'
import { ScreenView } from '../base/screen-view.js'

/**
 * View for rendering idea details screen
 * Handles two-column fullscreen layout (30% idea info, 70% epics)
 * Based on original working implementation
 */
export class IdeaDetailsScreenView extends ScreenView {
    /**
     * Render idea details screen with fullscreen two-column layout
     */
    render(
        data: { idea: IdeaData; epics: EpicData[]; statistics: any },
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

        // Two column layout - 30% left (idea info), 70% right (epics)
        const leftWidth = Math.floor(termWidth * 0.3) - 2
        const rightWidth = termWidth - leftWidth - 3

        this.renderTwoColumnLayout(
            data.idea,
            data.epics,
            data.statistics,
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
        idea: IdeaData,
        epics: EpicData[],
        statistics: any,
        navigation: NavigationState,
        leftWidth: number,
        rightWidth: number,
        termHeight: number,
        selectedIndex: number
    ): void {
        // Calculate common column height (leave space for navigation help)
        const columnHeight = termHeight - 1

        // Left column - Idea Info
        this.renderLeftColumn(
            idea,
            epics,
            statistics,
            navigation,
            leftWidth,
            columnHeight
        )

        // Right column - Epics
        this.renderRightColumn(
            epics,
            navigation,
            rightWidth,
            columnHeight,
            leftWidth,
            selectedIndex
        )

        // Navigation help at bottom
        this.renderNavigationHelp(termHeight)
    }

    /**
     * Render left column with idea details
     */
    private renderLeftColumn(
        idea: IdeaData,
        _epics: EpicData[],
        statistics: any,
        _navigation: NavigationState,
        leftWidth: number,
        columnHeight: number
    ): void {
        let currentRow = 1

        // Idea Header
        currentRow = this.renderIdeaHeader(idea, leftWidth, currentRow)

        // Idea Info
        currentRow = this.renderIdeaInfo(idea, leftWidth, currentRow)

        // Epic Statistics
        currentRow = this.renderEpicStats(statistics, leftWidth, currentRow)

        // Description - use remaining space until column height
        const descriptionHeight = columnHeight - currentRow
        this.renderIdeaDescription(
            idea,
            _navigation,
            leftWidth,
            currentRow,
            descriptionHeight
        )
    }

    /**
     * Render idea header for two column layout
     */
    private renderIdeaHeader(
        idea: IdeaData,
        leftWidth: number,
        startRow: number
    ): number {
        let currentRow = startRow

        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold('╔' + '═'.repeat(leftWidth - 2) + '╗')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        const titleText = `║ 💡 ${idea.id}`
        this.terminal.cyan.bold(titleText.padEnd(leftWidth - 1) + '║')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        const ideaTitleText = `║ ${idea.title}`
        this.terminal.cyan.bold(ideaTitleText.padEnd(leftWidth - 1) + '║')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal.cyan.bold('╠' + '═'.repeat(leftWidth - 2) + '╣')
        currentRow++

        return currentRow
    }

    /**
     * Render idea info for two column layout
     */
    private renderIdeaInfo(
        idea: IdeaData,
        leftWidth: number,
        startRow: number
    ): number {
        let currentRow = startRow

        // Status and priority
        const statusIcon = this.getStatusIcon(idea.status)
        const priorityIcon = this.getPriorityIcon(idea.priority)

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
        const created = new Date(idea.created_at).toLocaleDateString()
        this.terminal.moveTo(1, currentRow)
        this.terminal.gray(`║ Created: ${created}`.padEnd(leftWidth - 1) + '║')
        currentRow++

        // Updated date
        const updated = new Date(idea.updated_at).toLocaleDateString()
        this.terminal.moveTo(1, currentRow)
        this.terminal.gray(`║ Updated: ${updated}`.padEnd(leftWidth - 1) + '║')
        currentRow++

        this.terminal.moveTo(1, currentRow)
        this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
        currentRow++

        return currentRow
    }

    /**
     * Render epic statistics for two column layout
     */
    private renderEpicStats(
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
            '║ 📊 Idea Progress'.padEnd(leftWidth - 1) + '║'
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
     * Render idea description for two column layout
     */
    private renderIdeaDescription(
        idea: IdeaData,
        _navigation: NavigationState,
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

        // Description content
        const description = idea.description || 'No description available'
        const descLines = this.wrapText(description, leftWidth - 6)
        const maxDescLines = targetEndRow - currentRow - 1 // -1 for footer
        const visibleDescLines = descLines.slice(0, maxDescLines)

        for (let i = 0; i < visibleDescLines.length; i++) {
            this.terminal.moveTo(1, currentRow)
            this.terminal.white(
                `║ ${visibleDescLines[i]}`.padEnd(leftWidth - 1) + '║'
            )
            currentRow++
        }

        // Fill remaining space until target end
        while (currentRow < targetEndRow) {
            this.terminal.moveTo(1, currentRow)
            this.terminal('║' + ' '.repeat(leftWidth - 2) + '║')
            currentRow++
        }

        // Footer at exact target position
        this.terminal.moveTo(1, targetEndRow)
        this.terminal.cyan.bold('╚' + '═'.repeat(leftWidth - 2) + '╝')
    }

    /**
     * Render right column with epics
     */
    private renderRightColumn(
        epics: EpicData[],
        _navigation: NavigationState,
        rightWidth: number,
        columnHeight: number,
        leftWidth: number,
        selectedIndex: number
    ): void {
        const rightStartCol = leftWidth + 4
        let currentRow = 1

        // Epics Header
        this.terminal.moveTo(rightStartCol, currentRow)
        this.terminal.cyan.bold('╔' + '═'.repeat(rightWidth - 2) + '╗')
        currentRow++

        this.terminal.moveTo(rightStartCol, currentRow)
        this.terminal.cyan.bold(
            `║ 🎯 Idea Epics (${epics.length})`.padEnd(rightWidth - 1) + '║'
        )
        currentRow++

        this.terminal.moveTo(rightStartCol, currentRow)
        this.terminal.cyan.bold('╠' + '═'.repeat(rightWidth - 2) + '╣')
        currentRow++

        // Check if there are no epics
        if (epics.length === 0) {
            this.renderEmptyEpics(
                rightStartCol,
                rightWidth,
                currentRow,
                columnHeight
            )
            return
        }

        // Render epics list with selection highlighting
        this.renderEpicsList(
            epics,
            selectedIndex,
            rightStartCol,
            rightWidth,
            currentRow,
            columnHeight
        )
    }

    /**
     * Render empty epics state
     */
    private renderEmptyEpics(
        startCol: number,
        width: number,
        startRow: number,
        columnHeight: number
    ): void {
        this.terminal.moveTo(startCol, startRow)
        this.terminal.gray('║ No epics in this idea'.padEnd(width - 1) + '║')

        // Fill remaining space until column height
        let currentRow = startRow + 1
        while (currentRow < columnHeight) {
            this.terminal.moveTo(startCol, currentRow)
            this.terminal('║' + ' '.repeat(width - 2) + '║')
            currentRow++
        }

        // Bottom border at column height
        this.terminal.moveTo(startCol, columnHeight)
        this.terminal.cyan.bold('╚' + '═'.repeat(width - 2) + '╝')
    }

    /**
     * Render epics list with improved table format and status grouping
     */
    private renderEpicsList(
        epics: EpicData[],
        selectedIndex: number,
        rightStartCol: number,
        rightWidth: number,
        startRow: number,
        columnHeight: number
    ): void {
        let currentRow = startRow

        // Calculate column widths for table format
        const typeWidth = 8 // Epic IDs like EPIC-1
        const priorityWidth = 8 // Priority column
        const statusWidth = 8 // Status column
        const tasksWidth = 6 // Tasks count column
        const separators = 4 // 4 spaces between columns
        const borders = 4 // ║ borders (2 chars) + 2 padding spaces

        // Calculate title width to fit exactly within available space
        const titleWidth =
            rightWidth -
            typeWidth -
            priorityWidth -
            statusWidth -
            tasksWidth -
            separators -
            borders

        // Render table header
        this.terminal.moveTo(rightStartCol, currentRow)
        this.terminal.cyan.bold(
            `║ ${'ID'.padEnd(typeWidth)} ${'Title'.padEnd(titleWidth)} ${'Priority'.padEnd(priorityWidth)} ${'Status'.padEnd(statusWidth)} ${'Tasks'.padEnd(tasksWidth)}║`
        )
        currentRow++

        this.terminal.moveTo(rightStartCol, currentRow)
        const separatorLine = `║ ${'-'.repeat(typeWidth)} ${'-'.repeat(titleWidth)} ${'-'.repeat(priorityWidth)} ${'-'.repeat(statusWidth)} ${'-'.repeat(tasksWidth)}║`
        this.terminal.gray(separatorLine)
        currentRow++

        // Render epics
        for (
            let i = 0;
            i < epics.length && currentRow < columnHeight - 1;
            i++
        ) {
            this.renderEpicRow(
                epics[i],
                i,
                selectedIndex,
                rightStartCol,
                rightWidth,
                currentRow,
                typeWidth,
                titleWidth,
                priorityWidth,
                statusWidth,
                tasksWidth
            )
            currentRow++
        }

        // Fill remaining space until column height
        while (currentRow < columnHeight) {
            this.terminal.moveTo(rightStartCol, currentRow)
            this.terminal('║' + ' '.repeat(rightWidth - 2) + '║')
            currentRow++
        }

        // Bottom border at exact column height
        this.terminal.moveTo(rightStartCol, columnHeight)
        this.terminal.cyan.bold('╚' + '═'.repeat(rightWidth - 2) + '╝')
    }

    /**
     * Render a single epic row in table format
     */
    private renderEpicRow(
        epic: EpicData,
        epicIndex: number,
        selectedIndex: number,
        startCol: number,
        _width: number,
        row: number,
        typeWidth: number,
        titleWidth: number,
        priorityWidth: number,
        statusWidth: number,
        tasksWidth: number
    ): void {
        const isSelected = epicIndex === selectedIndex
        const taskCount = epic.tasks ? epic.tasks.length : 0

        // Truncate fields to fit within their allocated widths
        const idCell = epic.id.substring(0, typeWidth).padEnd(typeWidth)
        const titleCell = epic.title.substring(0, titleWidth).padEnd(titleWidth)
        const priorityCell = epic.priority
            .substring(0, priorityWidth)
            .padEnd(priorityWidth)
        const statusCell = epic.status
            .substring(0, statusWidth)
            .padEnd(statusWidth)
        const tasksCell = taskCount
            .toString()
            .substring(0, tasksWidth)
            .padEnd(tasksWidth)

        // Create the complete row content with exact spacing
        const rowContent = `║ ${idCell} ${titleCell} ${priorityCell} ${statusCell} ${tasksCell}║`

        this.terminal.moveTo(startCol, row)

        if (isSelected) {
            // Apply selection to the entire row
            this.terminal.bgYellow.black(rowContent)
        } else {
            // Render piece by piece for colors
            this.terminal('║ ')
            this.terminal.cyan(idCell)
            this.terminal(' ')
            this.terminal.white(titleCell)
            this.terminal(' ')
            ;(this.terminal as any)[this.getPriorityColor(epic.priority)](
                priorityCell
            )
            this.terminal(' ')
            ;(this.terminal as any)[this.getStatusColor(epic.status)](
                statusCell
            )
            this.terminal(' ')
            this.terminal.gray(tasksCell)
            this.terminal('║')
        }
    }

    /**
     * Create a progress bar
     */
    private createProgressBar(
        completed: number,
        total: number,
        width: number
    ): string {
        if (total === 0) return '─'.repeat(width) + ' 0%'

        const percentage = Math.round((completed / total) * 100)
        const filledWidth = Math.floor((completed / total) * (width - 5))
        const emptyWidth = width - 5 - filledWidth

        return (
            '█'.repeat(filledWidth) + '░'.repeat(emptyWidth) + ` ${percentage}%`
        )
    }

    /**
     * Render navigation help for two column layout
     */
    private renderNavigationHelp(termHeight: number): void {
        this.terminal.moveTo(1, termHeight)
        this.terminal.gray(
            '↑/↓: navigate epics • Enter: show epic details • Backspace: return • Q: quit'
        )
    }

    /**
     * Get status icon
     */
    protected getStatusIcon(status: string): string {
        switch (status) {
            case 'completed':
                return '✅ done'
            case 'in_progress':
                return '⚡ in-progress'
            case 'pending':
                return '⏳ pending'
            default:
                return status
        }
    }

    /**
     * Get priority icon
     */
    protected getPriorityIcon(priority: string): string {
        switch (priority) {
            case 'high':
                return '🔥 high'
            case 'medium':
                return '🟡 medium'
            case 'low':
                return '🟢 low'
            default:
                return priority
        }
    }
}
