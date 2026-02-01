## Brief overview
Documentation guidelines for maintaining and using Cline's Memory Bank system in the emuBro-Reloaded project. This defines how Cline approaches documentation and knowledge management to ensure continuity of work despite memory resets.

## Communication style
- Always read ALL memory bank files at the start of every task
- Maintain perfect documentation as a core characteristic
- Focus on clarity and precision in all documentation
- Use markdown format for all memory bank files
- Structure documentation hierarchically following the defined file relationships

## Development workflow
- When starting any new task, begin by reading the complete Memory Bank
- After implementing changes, update documentation accordingly
- Follow the defined core workflows for both Plan Mode and Act Mode
- Update activeContext.md and progress.md particularly after significant changes
- Document new patterns and insights discovered during development

## Coding best practices
- Maintain consistency with existing code patterns in emuBro-Reloaded
- Follow established architectural decisions and design patterns
- Ensure all documentation updates are accurate and reflect current implementation
- Use clear, descriptive naming conventions for memory bank files
- Keep documentation concise but comprehensive

## Project context
- emuBro-Reloaded is an Electron-based emulator application
- The Memory Bank system is critical for maintaining project continuity
- All core files (projectbrief.md, productContext.md, activeContext.md, systemPatterns.md, techContext.md, progress.md) must be maintained
- Additional context files can be created within memory-bank/ folder as needed
- Memory Bank files build upon each other in a clear hierarchy

## Other guidelines
- Memory Bank updates occur when discovering new patterns, after significant changes, or when explicitly requested
- When triggered by "update memory bank", review every memory bank file even if some don't require updates
- Focus particularly on activeContext.md and progress.md as they track current state
- The Memory Bank is the only link to previous work after memory resets
- Documentation must be maintained with precision and clarity as effectiveness depends entirely on its accuracy