# Project Instructions

This is a test project for MCP Task Manager.

## Some existing instructions

These are existing instructions that should be preserved.

# MCP Task Manager - Project Instructions

## 📋 Project Context & Management

This project uses MCP Task Manager for hierarchical task management with the
following structure:

- **Ideas** (IDEA-N) → High-level features or concepts
- **Epics** (EPIC-N) → Major implementation phases within ideas
- **Tasks** (TSK-N) → Specific development tasks
- **Bugs** (BUG-N) → Bug fixes and issues
- **Research** (RND-N) → Research and spikes

## 🎯 Core Workflow Instructions

### When user requests project/task management:

1. **ALWAYS analyze current project context first**
    - Read existing code structure, README, package.json
    - Understand implemented features and architecture
    - Identify current development state and priorities

2. **Create tasks based on EXISTING codebase analysis**
    - Reference actual files, components, and implementations
    - Consider current tech stack and patterns
    - Align with existing project structure and conventions

3. **Use natural language commands:**
    - `"pm init"` - Initialize project (creates .product-task/, counters.json,
      project-config.json ONLY)
    - `"Create idea 'User Authentication System'"` - Create new feature idea
    - `"Parse PRD 'Mobile App Features'"` - Auto-generate tasks from
      requirements
    - `"Give me next task"` - Get optimal task for current context
    - `"Update task TSK-5 status to in-progress"` - Update task status
    - `"Break down task TSK-3 into subtasks"` - Decompose complex tasks
    - `"Show all tasks"` - Display current task list

### Important: pm init behavior

- `pm init` should ONLY create the basic project structure:
    - `.product-task/` directory
    - `counters.json` file with initial counters
    - `project-config.json` with project name and description from
      package.json/README
- It should NOT automatically create any ideas, epics, or tasks
- It should NOT modify CLAUDE.md (instructions are already present)
- It should NOT create project-analysis.md

### Task Breakdown Strategy:

1. **Context-aware decomposition:**
    - Analyze existing similar implementations in the codebase
    - Consider current architecture patterns and file structure
    - Reference actual components, services, and utilities
    - Align with existing development practices

2. **Realistic scope estimation:**
    - Base estimates on similar completed work in the project
    - Consider current team velocity and complexity
    - Account for testing, documentation, and integration

3. **Dependency management:**
    - Identify prerequisites from existing codebase
    - Consider shared components and services
    - Plan for database migrations, API changes, etc.

## 📁 Project Structure

Tasks are organized in hierarchical folders:

```
.product-task/
├── counters.json
├── IDEA-1/
│   ├── idea.json
│   ├── EPIC-1/
│   │   ├── epic.json
│   │   ├── TSK-1.json
│   │   └── TSK-2.json
│   └── EPIC-2/
└── progress/
    ├── TSK-1-progress.md
    └── PRG-1.json
```

## 🔧 Development Guidelines

### For Claude Code:

- Always read project files to understand current context
- Use `smart_command` tool for natural language interaction
- Set format to "console" for terminal output with colors
- Provide Russian responses for Russian queries
- Include relevant file paths and line numbers in task descriptions

### Task Creation Rules:

- Reference actual files and components in task descriptions
- Include specific implementation details from codebase analysis
- Consider existing patterns and architecture decisions
- Provide realistic estimates based on similar work

### Progress Tracking:

- Update task status as work progresses
- Log meaningful progress notes with file references
- Break down large tasks when complexity becomes apparent
- Track dependencies and blockers clearly

## 🎨 ID Configuration

Current project uses these prefixes:

- Ideas: IDEA-N
- Epics: EPIC-N
- Tasks: TSK-N
- Bugs: BUG-N
- Research: RND-N

To modify prefixes, edit `project-config.json` in project root.

## 📊 Example Usage

```
User: "I need to add user authentication to the app"
Response:
1. Analyze existing auth-related code
2. Create idea "User Authentication System"
3. Generate epics: "Auth API", "Frontend Integration", "Security"
4. Break down into specific tasks referencing actual files
5. Provide next actionable task with context
```

Remember: Always work within the context of THIS specific project's codebase and
architecture!

# 🔧 Backend Development Standards

## Core Development Principles

### KISS Principle

- Keep It Simple, Stupid - prioritize simplicity over complexity
- Avoid over-engineering solutions
- Write code that is easy to understand and maintain

### SOLID Principles

#### Single Responsibility Principle (SRP)

- Each class/function should have one clear purpose
- Classes and modules should have only one reason to change
- Break down complex functionality into smaller, focused components

#### Open/Closed Principle (OCP)

- Software entities should be open for extension, closed for modification
- Use composition and interfaces to extend behavior
- Avoid modifying existing code when adding new features

#### Liskov Substitution Principle (LSP)

- Components should be replaceable with their subtypes
- Derived classes must be substitutable for their base classes
- Maintain behavioral consistency across implementations

#### Interface Segregation Principle (ISP)

- Prefer specific interfaces over general ones
- Clients should not be forced to depend on interfaces they don't use
- Create focused, role-specific interfaces

#### Dependency Inversion Principle (DIP)

- Depend on abstractions, not concrete implementations
- High-level modules should not depend on low-level modules
- Use dependency injection and interface-based design

## Code Quality Standards

### TypeScript Usage

- Use TypeScript strictly with proper type definitions
- Avoid `any` type - use specific types or unions
- Define interfaces for all data structures
- Use generic types for reusable components
- Leverage TypeScript's strict mode features

### MCP Server Best Practices

- Follow MCP SDK patterns and conventions
- Implement proper tool registration and execution
- Use Zod for schema validation
- Handle errors gracefully with proper MCP error codes
- Implement proper request/response handling

### Backend Architecture

- Use modular architecture with clear separation of concerns
- Implement proper data access layers
- Use SQLite for persistent storage with proper schema design
- Follow the existing tool-based architecture pattern
- Implement proper error handling and logging

### Code Organization

- Break down functionality into small, focused modules
- Use consistent naming conventions (camelCase for variables, PascalCase for
  classes)
- Follow feature-based architecture patterns
- Organize imports: external libraries first, then internal modules
- Keep files under 200 lines when possible

### Database & Storage

- Use SQLite for data persistence
- Implement proper database migrations and schema versioning
- Use prepared statements for SQL queries
- Implement proper transaction handling
- Follow the existing storage patterns in `src/storage.ts`

### Error Handling

- Implement proper error handling and validation
- Use try-catch blocks for async operations
- Provide meaningful error messages
- Handle edge cases gracefully
- Use MCP error codes for client communication
- Validate data at system boundaries

### Performance Considerations

- Optimize database queries and indexes
- Use connection pooling for database connections
- Implement proper caching strategies
- Handle large datasets efficiently
- Consider memory usage in data processing
- Use async/await for non-blocking operations

### Security Practices

- Validate and sanitize all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper data validation with Zod schemas
- Handle sensitive data securely
- Follow secure coding practices for file system operations

### Testing & Maintainability

- Write testable code with clear separation of concerns
- Use dependency injection for better testability
- Write unit tests for business logic
- Mock external dependencies in tests
- Maintain high code coverage for critical paths
- Follow the existing test patterns (`test-mcp-*.js`)

## Framework-Specific Guidelines

### MCP SDK Best Practices

- Use proper MCP server setup with capabilities
- Implement tool definitions with proper schemas
- Use Zod for input validation
- Handle MCP error codes appropriately
- Follow the existing server structure in `src/index.ts`

### Node.js & ES Modules

- Use ES modules with proper imports/exports
- Leverage Node.js built-in modules when possible
- Use proper async/await patterns
- Handle process signals and cleanup properly
- Follow the existing module structure

### Tool Implementation

- Extend the base tool class from `src/tools/base.ts`
- Implement proper schema validation
- Provide clear tool descriptions and metadata
- Handle tool execution errors gracefully
- Follow the existing tool patterns in `src/tools/`

### Database Integration

- Use the existing storage patterns from `src/storage.ts`
- Implement proper database schema in `src/db-schema/schema.sql`
- Use transactions for data consistency
- Handle database errors appropriately
- Follow the existing entity patterns

## Code Style Rules

### Formatting

- Use consistent indentation (4 spaces)
- No trailing whitespace
- Use semicolons consistently
- Prefer single quotes for strings
- Use template literals for string interpolation

### Comments Policy

- **ALL comments and JSDoc MUST be in English**
- **JSDoc is MANDATORY for all public methods and classes**
- Code should be self-documenting
- Use meaningful variable and function names
- Refactor unclear code instead of adding inline comments
- Use JSDoc for API documentation

### JSDoc Requirements

- Document all public classes and methods
- Include parameter types and descriptions
- Include return type descriptions
- Document thrown exceptions
- Use proper JSDoc tags (@param, @returns, @throws, etc.)

### Defensive Programming

- Use defensive programming practices
- Validate inputs at function boundaries
- Handle null/undefined values gracefully
- Implement proper fallbacks for missing data
- Use optional chaining and nullish coalescing

## Development Workflow

### Before Writing Code

1. Analyze the task and requirements thoroughly
2. Understand the existing codebase and patterns
3. Create a detailed implementation plan
4. Identify potential edge cases and error scenarios

### During Development

1. Follow established patterns and conventions
2. Write clean, readable code
3. Implement proper error handling
4. Add type definitions for all data structures
5. Add JSDoc documentation in English
6. Test functionality as you build

### After Implementation

1. Run linting and formatting (`npm run format`)
2. Run tests (`npm test`)
3. Test the implementation thoroughly
4. Verify all JSDoc is in English
5. Check for proper error handling
6. Validate database operations if applicable

## Claude Code Task Management Instructions

### When Working with MCP Task Manager

Claude Code should automatically integrate with the MCP Task Manager when
working on this project. Follow these patterns:

#### 1. Starting Work on Tasks

When you see a task from `next_task` or `list_all_tasks`, ALWAYS:

- Update the task status to "in-progress" before starting work
- Add a progress note with type "update" describing what you're about to do
- Example:
  `"Update task TSK-5 to in-progress with note: Starting implementation of JWT middleware"`

#### 2. During Task Implementation

- Add progress notes as you complete significant milestones
- Use appropriate progress types:
    - `update`: Regular progress updates
    - `comment`: Additional context or decisions made
    - `blocker`: When you encounter blocking issues
    - `completion`: When task is fully complete

#### 3. When Task is Complete

- Update task status to "done"
- Add final progress note with type "completion"
- Include summary of what was accomplished
- Example:
  `"Mark task TSK-5 as done with completion note: JWT middleware implemented and tested"`

#### 4. Task Creation with Definition of Done

When creating new tasks (via `create_task`), ALWAYS include a comprehensive
"Definition of Done" section in the task description. Structure it as:

```
[Task Description]

## Definition of Done:
- [ ] [Specific deliverable based on current codebase]
- [ ] [Testing requirement specific to this project]
- [ ] [Code quality requirement]
- [ ] [Documentation requirement if applicable]
- [ ] [Integration requirement]
```

Analyze the current codebase to create realistic, specific DoD items. Examples:

- "Unit tests added following patterns in `test/` directory"
- "TypeScript types defined with proper JSDoc (English only)"
- "Database schema updated if needed with migration"
- "MCP tool registration updated in `src/index.ts`"
- "Error handling follows existing patterns in codebase"

#### 5. Automatic Task Discovery

When you notice work that should be tracked as tasks while implementing:

- Create new tasks for significant subtasks discovered during implementation
- Break down complex work into manageable pieces
- Reference existing code patterns and files in task descriptions

### Example Workflow

```
1. "Get next task" → Receive TSK-3: "Implement user authentication"
2. "Update task TSK-3 to in-progress with note: Analyzing current auth patterns in codebase"
3. [Do analysis work]
4. "Add progress note to TSK-3: Created JWT middleware following existing patterns in src/middleware/"
5. [Continue implementation]
6. "Mark task TSK-3 as done with completion note: Authentication system implemented with JWT, following project patterns, all tests passing"
```

This ensures full visibility into development progress and maintains proper task
management discipline.

## Documentation Standards

### JSDoc Documentation

- **All JSDoc MUST be in English**
- Use proper JSDoc syntax and tags
- Document all public APIs
- Include examples for complex methods
- Keep documentation up to date with code changes

### Code Documentation

- Use JSDoc for all public classes and methods
- Document complex algorithms and business logic
- Explain non-obvious implementation decisions
- Maintain README files for modules
- Keep architecture documentation current

### API Documentation

- Document all MCP tools and their schemas
- Provide usage examples
- Document error conditions and responses
- Keep tool descriptions clear and concise
- Follow the existing patterns in `docs/`
