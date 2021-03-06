import * as fs from 'fs-extra'
import { load, finds } from 'load-cfg'
import chokidar from 'chokidar'
import equal from 'fast-deep-equal'
import get from 'lodash.get'

import { Params, State } from '../DataServer'
import { Config, ThemeConfig } from '../commands/args'
import { getRepoUrl } from '../utils/repo-info'
import * as paths from '../config/paths'

interface Payload {
  title: string
  description: string
  ordering: string
  themeConfig: ThemeConfig
  version: string | null
  repository: string | null
  native: boolean
}

const getInitialConfig = (config: Config): Payload => {
  const pkg = fs.readJsonSync(paths.appPackageJson, { throws: false })
  const repoUrl = getRepoUrl()

  return {
    title: config.title,
    description: config.description,
    themeConfig: config.themeConfig,
    ordering: config.ordering,
    version: get(pkg, 'version'),
    repository: repoUrl,
    native: config.native,
  }
}

const updateConfig = (config: Config) => async (p: Params) => {
  const old = p.state.config
  const newConfig = load('docz', getInitialConfig(config), true)

  if (newConfig && !equal(old, newConfig)) {
    p.setState('config', newConfig)
  }
}

export const state = (config: Config): State => {
  const watcher = chokidar.watch(finds('docz'), {
    cwd: paths.root,
    persistent: true,
  })

  return {
    init: updateConfig(config),
    update: async params => {
      const update = updateConfig(config)

      watcher.on('add', async () => update(params))
      watcher.on('change', async () => update(params))
      watcher.on('unlink', async () => update(params))

      return () => watcher.close()
    },
  }
}
