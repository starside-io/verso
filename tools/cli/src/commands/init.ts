import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { type TemplateName, knownTemplates, templatesDir } from '../templates.js'
import { log, writeJson } from '../utils.js'

export interface InitOptions {
  template?: string
  withConfig?: boolean
}

const copyDir = (src: string, dest: string) => {
  if (!existsSync(src)) throw new Error(`Template source missing: ${src}`)
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      cpSync(srcPath, destPath)
    }
  }
}

export const runInit = async (rawName: string | undefined, opts: InitOptions): Promise<void> => {
  const template = (opts.template ?? 'minimal') as TemplateName
  if (!knownTemplates.includes(template)) {
    log.err(`Unknown template "${template}". Available: ${knownTemplates.join(', ')}`)
    process.exit(1)
  }

  const targetName = rawName ?? 'my-verso-deck'
  const target = resolve(process.cwd(), targetName)

  if (existsSync(target) && readdirSync(target).length > 0) {
    log.err(`Target directory is not empty: ${target}`)
    process.exit(1)
  }

  const src = join(templatesDir, template)
  copyDir(src, target)

  writeJson(
    join(target, 'package.json'),
    {
      name: targetName,
      version: '0.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'verso dev',
        build: 'verso build',
      },
      dependencies: {
        '@starside-io/verso-cli': '^0.1.0',
      },
    },
    { overwrite: true },
  )

  log.ok(`Created ${target} from template "${template}".`)
  log.info('Next steps:')
  console.log(`  cd ${targetName}`)
  console.log('  npm install   (or pnpm/bun install)')
  console.log('  verso dev')
}
