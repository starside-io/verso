#!/usr/bin/env node
import { Command } from 'commander'
import { runBuild } from './commands/build.js'
import { runDev } from './commands/dev.js'
import { runEdit } from './commands/edit.js'
import { runInit } from './commands/init.js'
import { runNewLayout, runNewSlide } from './commands/new.js'
import { runThemeAdd, runThemeList } from './commands/theme.js'

const program = new Command()

program.name('verso').description('Verso: JSON-driven presentations').version('0.1.0')

program
  .command('init [name]')
  .description('Scaffold a new Verso project')
  .option(
    '-t, --template <name>',
    'Template: minimal | branded | inline-theme | multi-path | layouts-gallery | extended',
    'minimal',
  )
  .option('--with-config', 'Include a verso.config.ts for custom layouts')
  .action((name, opts) => runInit(name, opts))

program
  .command('dev')
  .description('Start the Verso viewer in dev mode against the current project')
  .option('-d, --dir <path>', 'Project directory (defaults to current working directory)')
  .option('-p, --port <port>', 'Port number', '5173')
  .option('-H, --host <host>', 'Host', 'localhost')
  .option('--open', 'Open the browser on start', false)
  .action((opts) => runDev(opts))

program
  .command('edit')
  .description('Launch the visual editor for this project (viewer + editor + browser)')
  .option('-d, --dir <path>', 'Project directory (defaults to current working directory)')
  .option('-p, --port <port>', 'Editor port', '5180')
  .option('--viewer-port <port>', 'Viewer port', '5173')
  .option('-H, --host <host>', 'Host', 'localhost')
  .option('--no-open', "Don't open the browser automatically")
  .action((opts) => runEdit(opts))

const newCmd = program.command('new').description('Scaffold a slide or layout')
newCmd
  .command('slide [id]')
  .description(
    'Create slide(s). With no flags: stub a single slide with the given id. ' +
      'With --from <file.json|url>: import one slide from a Verso slide JSON. ' +
      'With --from <file.md>: import many slides from a Markdown outline (one slide per "# heading"; subheadings, paragraphs, lists, code fences, blockquotes, and "---" map to heading/text/bullets/code/quote/divider blocks).',
  )
  .option('-d, --dir <path>', 'Project directory (defaults to current working directory)')
  .option(
    '-l, --layout <name>',
    'Layout name (default: title-only for stubs, content for markdown import; preserved when importing JSON)',
  )
  .option('-p, --paths <ids>', 'Comma-separated path_include list applied to every imported slide')
  .option(
    '-f, --from <path-or-url>',
    'Import from a Verso slide JSON, or a Markdown outline (.md / .markdown / .mdx) to create many slides at once. The positional [id] becomes a prefix for generated ids when importing markdown.',
  )
  .action((id, opts) => runNewSlide(id, opts))

newCmd
  .command('layout <name>')
  .description('Create a new custom layout TS file and register it in verso.config.ts')
  .option('-d, --dir <path>', 'Project directory (defaults to current working directory)')
  .action((name, opts) => runNewLayout(name, opts))

const themeCmd = program.command('theme').description('Manage themes for the current project')
themeCmd
  .command('add <target>')
  .description('Add a theme by built-in name, file path, or (todo) npm package')
  .option('-d, --dir <path>', 'Project directory (defaults to current working directory)')
  .action((target, opts) => runThemeAdd(target, opts))
themeCmd
  .command('list')
  .description('List built-in and project-local themes')
  .option('-d, --dir <path>', 'Project directory (defaults to current working directory)')
  .action((opts) => runThemeList(opts))

program
  .command('build')
  .description('Export each path of the deck as a PDF or self-contained HTML file')
  .option('-d, --dir <path>', 'Project directory (defaults to current working directory)')
  .option('-p, --path <id>', 'Build only one path')
  .option('-o, --out <path>', 'Output directory (defaults to <project>/dist)')
  .option('-s, --size <preset>', 'Page size preset: 16:9 | 4:3 | letter | a4', '16:9')
  .option('-f, --format <fmt>', 'Output format: pdf | html', 'pdf')
  .option(
    '--no-inline-images',
    'Keep image src URLs as-is instead of inlining as base64 (html only)',
  )
  .action((opts) => runBuild(opts))

program.parseAsync(process.argv).catch((err) => {
  console.error(err)
  process.exit(1)
})
