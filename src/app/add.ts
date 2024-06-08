import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'
import mime from 'mime'
import { program } from 'commander'
import * as p from '@clack/prompts'
import { checkLatest } from '../api/update'
import type { Options } from '../api/app'
import { checkAppExists, newIconPath } from '../api/app'
import type {
  Organization,
} from '../utils'
import {
  checkPlanValid,
  createSupabaseClient,
  findSavedKey,
  formatError,
  getConfig,
  getOrganization,
  verifyUser,
} from '../utils'

export async function addApp(appId: string, options: Options, throwErr = true) {
  await addAppInternal(appId, options, undefined, throwErr)
}

export async function addAppInternal(appId: string, options: Options, organization?: Organization, throwErr = true) {
  if (throwErr)
    p.intro(`Adding`)

  await checkLatest()
  options.apikey = options.apikey || findSavedKey()
  const config = await getConfig()
  appId = appId || config?.app?.appId

  if (!options.apikey) {
    p.log.error(`Missing API key, you need to provide a API key to upload your bundle`)
    program.error('')
  }
  if (!appId) {
    p.log.error('Missing argument, you need to provide a appId, or be in a capacitor project')
    program.error('')
  }

  if (appId.includes('--')) {
    p.log.error('The app id includes illegal symbols. You cannot use "--" in the app id')
    program.error('')
  }

  const supabase = await createSupabaseClient(options.apikey)

  await verifyUser(supabase, options.apikey, ['write', 'all'])

  // Check we have app access to this appId
  const appExist = await checkAppExists(supabase, appId)
  if (appExist) {
    p.log.error(`App ${appId} already exist`)
    program.error('')
  }

  if (!organization)
    organization = await getOrganization(supabase, ['admin', 'super_admin'])

  const organizationUid = organization.gid

  await checkPlanValid(supabase, organizationUid, options.apikey, undefined, false)

  let { name, icon } = options
  appId = appId || config?.app?.appId
  name = name || config?.app?.appName || 'Unknown'
  icon = icon || 'resources/icon.png' // default path for capacitor app
  if (!icon || !name) {
    p.log.error('Missing argument, you need to provide a appId and a name, or be in a capacitor project')
    program.error('')
  }
  if (throwErr)
    p.log.info(`Adding ${appId} to Capgo`)

  let iconBuff
  let iconType

  if (icon && existsSync(icon)) {
    iconBuff = readFileSync(icon)
    const contentType = mime.getType(icon)
    iconType = contentType || 'image/png'
    p.log.warn(`Found app icon ${icon}`)
  }
  else if (existsSync(newIconPath)) {
    iconBuff = readFileSync(newIconPath)
    const contentType = mime.getType(newIconPath)
    iconType = contentType || 'image/png'
    p.log.warn(`Found app icon ${newIconPath}`)
  }
  else {
    p.log.warn(`Cannot find app icon in any of the following locations: ${icon}, ${newIconPath}`)
  }

  const fileName = `icon`
  let signedURL = 'https://xvwzpoazmxkqosrdewyv.supabase.co/storage/v1/object/public/images/capgo.png'

  // upload image if available
  if (iconBuff && iconType) {
    const { error } = await supabase.storage
      .from(`images/org/${organizationUid}/${appId}`)
      .upload(fileName, iconBuff, {
        contentType: iconType,
      })
    if (error) {
      console.error(error)
      p.log.error(`Could not add app ${formatError(error)}`)
      program.error('')
    }
    const { data: signedURLData } = await supabase
      .storage
      .from(`images/org/${organizationUid}/${appId}`)
      .getPublicUrl(fileName)
    signedURL = signedURLData?.publicUrl || signedURL
  }
  // add app to db
  const { error: dbError } = await supabase
    .from('apps')
    .insert({
      icon_url: signedURL,
      owner_org: organizationUid,
      name,
      app_id: appId,
    })
  if (dbError) {
    p.log.error(`Could not add app ${formatError(dbError)}`)
    program.error('')
  }
  const { error: dbVersionError } = await supabase
    .from('app_versions')
    .insert([{
      owner_org: organizationUid,
      deleted: true,
      name: 'unknown',
      app_id: appId,
    }, {
      owner_org: organizationUid,
      deleted: true,
      name: 'builtin',
      app_id: appId,
    }])
  if (dbVersionError) {
    p.log.error(`Could not add app ${formatError(dbVersionError)}`)
    program.error('')
  }
  p.log.success(`App ${appId} added to Capgo. ${throwErr ? 'You can upload a bundle now' : ''}`)
  if (throwErr) {
    p.outro(`Done ✅`)
    process.exit()
  }
  return true
}

export async function addCommand(apikey: string, options: Options) {
  addApp(apikey, options, true)
}
