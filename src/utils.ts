import { existsSync, readdirSync, readFileSync } from 'fs';
import fs from 'fs/promises'
import { homedir } from 'os';
import { resolve } from 'path';
import { loadConfig } from '@capacitor/cli/dist/config';
import { program } from 'commander';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import prettyjson from 'prettyjson';
import { LogSnag } from 'logsnag';
import * as p from '@clack/prompts';
import { Database } from 'types/supabase.types';

export const getConfig = async () => {
    let config: Config;
    try {
        config = await loadConfig();
    } catch (err) {
        program.error("No capacitor config file found, run `cap init` first");
    }
    return config;
}

getConfig().then(config => {
    if (!config.app.extConfig.plugins || !config.app.extConfig.plugins.CapacitorUpdater) {
        return
    }
    host = (config.app.extConfig.plugins.CapacitorUpdater.localHost as string | undefined) ?? host
    hostWeb = (config.app.extConfig.plugins.CapacitorUpdater.localWebHost as string | undefined) ?? hostWeb
    hostSupa = (config.app.extConfig.plugins.CapacitorUpdater.localSupa as string | undefined) ?? hostSupa
    supaAnon = (config.app.extConfig.plugins.CapacitorUpdater.localSupaAnon as string | undefined) ?? supaAnon
})


export const baseKey = '.capgo_key';
export const baseKeyPub = `${baseKey}.pub`;
// eslint-disable-next-line import/no-mutable-exports
export let host = 'https://capgo.app'
// eslint-disable-next-line import/no-mutable-exports
export let hostWeb = 'https://web.capgo.app'
// eslint-disable-next-line import/no-mutable-exports
export let hostSupa = process.env.SUPA_DB === 'production'
    ? 'https://xvwzpoazmxkqosrdewyv.supabase.co' : process.env.SUPA_DB || 'https://aucsybvnhavogdmzwtcw.supabase.co';
/* eslint-disable */
export let supaAnon = process.env.SUPA_DB === 'production'
    ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2d3pwb2F6bXhrcW9zcmRld3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTI4MjExOTcsImV4cCI6MjAwODM5NzE5N30.wjxOlMfJoM2IuiFOmLGeP6YxdkF7Scgcfwu8TnPw_fY'
    : process.env.SUPA_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Y3N5YnZuaGF2b2dkbXp3dGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTQ1Mzk1MDYsImV4cCI6MTk3MDExNTUwNn0.HyuZmo_EjF5fgZQU3g37bdNardK1CLHgxXmYqtr59bo'
/* eslint-enable */

export const defaulPublicKey = `-----BEGIN RSA PUBLIC KEY-----
    MIIBCgKCAQEA4pW9olT0FBXXivRCzd3xcImlWZrqkwcF2xTkX/FwXmj9eh9HkBLr
    sQmfsC+PJisRXIOGq6a0z3bsGq6jBpp3/Jr9jiaW5VuPGaKeMaZZBRvi/N5fIMG3
    hZXSOcy0IYg+E1Q7RkYO1xq5GLHseqG+PXvJsNe4R8R/Bmd/ngq0xh/cvcrHHpXw
    O0Aj9tfprlb+rHaVV79EkVRWYPidOLnK1n0EFHFJ1d/MyDIp10TEGm2xHpf/Brlb
    1an8wXEuzoC0DgYaczgTjovwR+ewSGhSHJliQdM0Qa3o1iN87DldWtydImMsPjJ3
    DUwpsjAMRe5X8Et4+udFW2ciYnQo9H0CkwIDAQAB
    -----END RSA PUBLIC KEY-----`

const nativeFileRegex = /([A-Za-z0-9]+)\.(java|swift|kt|scala)$/

if (process.env.SUPA_DB !== 'production') {
    console.log('hostSupa', hostSupa);
}

export const createSupabaseClient = (apikey: string) => createClient<Database>(hostSupa, supaAnon, {
    auth: {
        persistSession: false,
    },
    global: {
        headers: {
            capgkey: apikey,
        }
    }
})
// eslint-disable-next-line max-len
export const regexSemver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

export const checkKey = async (supabase: SupabaseClient<Database>, apikey: string,
    keymode: Database['public']['Enums']['key_mode'][]) => {
    const { data: apiAccess, error: apiAccessError } = await supabase
        .rpc('is_allowed_capgkey', { apikey, keymode })
        .single()

    if (!apiAccess || apiAccessError) {
        program.error(`Invalid API key or insufficient permissions ${formatError(apiAccessError)}`);
    }
}

export const isGoodPlan = async (supabase: SupabaseClient<Database>, userId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .rpc('is_good_plan_v3', { userid: userId })
        .single()
    if (error) {
        throw error
    }
    return data || false
}

export const isPaying = async (supabase: SupabaseClient<Database>, userId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .rpc('is_paying', { userid: userId })
        .single()
    if (error) {
        throw error
    }
    return data || false
}

export const isTrial = async (supabase: SupabaseClient<Database>, userId: string): Promise<number> => {
    const { data, error } = await supabase
        .rpc('is_trial', { userid: userId })
        .single()
    if (error) {
        throw error
    }
    return data || 0
}

export const isAllowedAction = async (supabase: SupabaseClient<Database>, userId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .rpc('is_allowed_action_user', { userid: userId })
        .single()
    if (error) {
        throw error
    }
    return data
}

export const checkPlanValid = async (supabase: SupabaseClient<Database>, userId: string, warning = true) => {
    const validPlan = await isAllowedAction(supabase, userId)
    if (!validPlan) {
        p.log.error(`You need to upgrade your plan to continue to use capgo.\n Upgrade here: ${hostWeb}/dashboard/settings/plans\n`);
        setTimeout(() => {
            import('open')
                .then((module) => {
                    module.default(`${hostWeb}/dashboard/settings/plans`);
                });
            program.error('')
        }, 1000)
    }
    const trialDays = await isTrial(supabase, userId)
    const ispaying = await isPaying(supabase, userId)
    if (trialDays > 0 && warning && !ispaying) {
        p.log.warn(`WARNING !!\nTrial expires in ${trialDays} days, upgrade here: ${hostWeb}/dashboard/settings/plans\n`);
    }
}

export const findSavedKey = (quiet = false) => {
    // search for key in home dir
    const userHomeDir = homedir();
    let key
    let keyPath = `${userHomeDir}/.capgo`;
    if (existsSync(keyPath)) {
        if (!quiet)
            p.log.info(`Use global apy key ${keyPath}`)
        key = readFileSync(keyPath, 'utf8').trim();
    }
    keyPath = `.capgo`;
    if (!key && existsSync(keyPath)) {
        if (!quiet)
            p.log.info(`Use local apy key ${keyPath}`)
        key = readFileSync(keyPath, 'utf8').trim();
    }
    if (!key)
        program.error('Key not found, please login first');
    return key
}

async function* getFiles(dir: string): AsyncGenerator<string> {
    const dirents = await readdirSync(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = resolve(dir, dirent.name);
        if (dirent.isDirectory()
            && !dirent.name.startsWith('.')
            && !dirent.name.startsWith('node_modules')
            && !dirent.name.startsWith('dist')) {
            yield* getFiles(res);
        } else {
            yield res;
        }
    }
}
export const findMainFile = async () => {
    const mainRegex = /(main|index)\.(ts|tsx|js|jsx)$/
    // search for main.ts or main.js in local dir and subdirs
    let mainFile = ''
    const pwd = process.cwd()
    const pwdL = pwd.split('/').length
    for await (const f of getFiles(pwd)) {
        // find number of folder in path after pwd
        const folders = f.split('/').length - pwdL
        if (folders <= 2 && mainRegex.test(f)) {
            mainFile = f
            p.log.info(`Found main file here ${f}`)
            break
        }
    }
    return mainFile
}

export const formatError = (error: any) => error ? `\n${prettyjson.render(error)}` : ''

interface Config {
    app: {
        appId: string;
        appName: string;
        webDir: string;
        package: {
            version: string;
        };
        extConfigFilePath: string;
        extConfig: {
            extConfig: object;
            plugins: {
                extConfig: object;
                CapacitorUpdater: {
                    autoUpdate?: boolean;
                    localS3?: boolean;
                    localHost?: string;
                    localWebHost?: string;
                    localSupa?: string;
                    localSupaAnon?: string;
                    statsUrl?: string;
                    channelUrl?: string;
                    updateUrl?: string;
                    privateKey?: string;
                }
            }
            server: {
                cleartext: boolean
                url: string
            }
        }
    };
}

export const updateOrCreateVersion = async (supabase: SupabaseClient<Database>,
    update: Database['public']['Tables']['app_versions']['Insert'], apikey: string) => {
    // console.log('updateOrCreateVersion', update, apikey)
    const { data, error } = await supabase
        .rpc('exist_app_versions', { appid: update.app_id, name_version: update.name, apikey })
        .single()

    if (data && !error) {
        update.deleted = false
        return supabase
            .from('app_versions')
            .update(update)
            .eq('app_id', update.app_id)
            .eq('name', update.name)
    }
    // console.log('create Version', data, error)

    return supabase
        .from('app_versions')
        .insert(update)
}

export async function uploadUrl(supabase: SupabaseClient<Database>, appId: string, bucketId: string): Promise<string> {
    const data = {
        app_id: appId,
        bucket_id: bucketId,
    }
    try {
        const res = await supabase.functions.invoke('upload_link', { body: JSON.stringify(data) })
        return res.data.url
    } catch (error) {
        p.log.error(`Cannot get upload url ${JSON.stringify(error)}`);
    }
    return '';
}

export const updateOrCreateChannel = async (supabase: SupabaseClient<Database>,
    update: Database['public']['Tables']['channels']['Insert']) => {
    // console.log('updateOrCreateChannel', update)
    if (!update.app_id || !update.name || !update.created_by) {
        p.log.error('missing app_id, name, or created_by')
        return Promise.reject(new Error('missing app_id, name, or created_by'))
    }
    const { data, error } = await supabase
        .from('channels')
        .select('enable_progressive_deploy, secondaryVersionPercentage, secondVersion')
        .eq('app_id', update.app_id)
        .eq('name', update.name)
        .eq('created_by', update.created_by)
        .single()

    if (data && !error) {
        if (data.enable_progressive_deploy) {
            p.log.info('Progressive deploy is enabled')

            if (data.secondaryVersionPercentage !== 1) 
                p.log.warn('Latest progressive deploy has not finished')

            update.secondVersion = update.version
            if (!data.secondVersion) {
                p.log.error('missing secondVersion')
                return Promise.reject(new Error('missing secondVersion'))
            }
            update.version = data.secondVersion
            update.secondaryVersionPercentage = 0.1
            p.log.info('Started new progressive upload!')
            
            // update.version = undefined
        }
        return supabase
            .from('channels')
            .update(update)
            .eq('app_id', update.app_id)
            .eq('name', update.name)
            .eq('created_by', update.created_by)
            .select()
            .single()
    }

    return supabase
        .from('channels')
        .insert(update)
        .select()
        .single()
}

export const useLogSnag = (): LogSnag => {
    const logsnag = new LogSnag({
        token: 'c124f5e9d0ce5bdd14bbb48f815d5583',
        project: 'capgo',
    })
    return logsnag
}

export const convertAppName = (appName: string) => appName.replace(/\./g, '--')
export const verifyUser = async (supabase: SupabaseClient<Database>, apikey: string,
    keymod: Database['public']['Enums']['key_mode'][] = ['all']) => {
    await checkKey(supabase, apikey, keymod);

    const { data: dataUser, error: userIdError } = await supabase
        .rpc('get_user_id', { apikey })
        .single();

    const userId = (dataUser || '').toString();

    if (!userId || userIdError) {
        program.error(`Cannot verify user ${formatError(userIdError)}`);
    }
    return userId;
}

export const requireUpdateMetadata = async (supabase: SupabaseClient<Database>, channel: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('channels')
        .select('disableAutoUpdate')
        .eq('name', channel)
        .limit(1)

    if (error) {
        p.log.error(`Cannot check if disableAutoUpdate is required ${JSON.stringify(error)}`);
        program.error('')
    }

    // Channel does not exist and the default is never 'version_number'
    if (data.length === 0)
        return false

    const { disableAutoUpdate } = (data[0])
    return disableAutoUpdate === 'version_number'
}

export const getHumanDate = (createdA: string | null) => {
    const date = new Date(createdA || '');
    return date.toLocaleString();
}

// https://stackoverflow.com/questions/17699599/node-js-check-if-file-exists
export const fileExists = async (path: string) => !!(await fs.stat(path).catch(e => false));

export async function getLocalDepenencies() {
    if (!await fileExists('./package.json')) {
        p.log.error("Missing package.json, you need to be in a capacitor project");
        program.error('');
    }

    
    let packageJson;
    try {
        packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'));
    } catch (err) {
        p.log.error("Invalid package.json, JSON parsing failed");
        console.error('json parse error: ', err)
        program.error('');
    }
    
    const { dependencies } = packageJson
    if (!dependencies) {
        p.log.error("Missing dependencies section in package.json");
        program.error('');
    }

    for (const [key, value] of Object.entries(dependencies)) {
        if (typeof value !== 'string') {
            p.log.error(`Invalid dependency ${key}: ${value}, expected string, got ${typeof value}`);
            program.error('');
        }
    }

    if (!await fileExists('./node_modules/')) {
        p.log.error('Missing node_modules folder, please run npm install');
        program.error('');
    }

    let anyInvalid = false;

    const dependenciesObject = await Promise.all(Object.entries(dependencies as Record<string, string>)
        // eslint-disable-next-line consistent-return
        .map(async ([key, value]) => {
            const dependencyFolderExists = await fileExists(`./node_modules/${key}`)

            if (!dependencyFolderExists) {
                anyInvalid = true
                p.log.error(`Missing dependency ${key}, please run npm install`);
                return {name: key, version: value}
            }
            
            let hasNativeFiles = false;
            await walkDir(`./node_modules/${key}`, async (path) => {
                if (nativeFileRegex.test(path)) {
                    hasNativeFiles = true;
                }
            })

            return {
                name: key,
                version: value,
                native: hasNativeFiles,
            }
        }))


    if (anyInvalid || dependenciesObject.find((a) => a.native === undefined))
        program.error('');

    return dependenciesObject as { name: string; version: string; native: boolean; }[];
}

export async function getRemoteDepenencies(supabase: SupabaseClient<Database>, channel: string) {
    const { data: remoteNativePackages, error } = await supabase
        .from('channels')
        .select(`version ( 
            native_packages 
        )`)
        .eq('name', channel)
        .single()


    if (error) {
        p.log.error(`Error fetching native packages: ${error.message}`);
        program.error('');
    }

    let castedRemoteNativePackages
    try {
        castedRemoteNativePackages = (remoteNativePackages as any).version.native_packages
    } catch (err) {
        // If we do not do this we will get an unreadable
        p.log.error(`Error parsing native packages`);
        program.error('');
    }

    // Check types
    castedRemoteNativePackages.forEach((data: any) => {
        if (typeof data !== 'object') {
            p.log.error(`Invalid remote native package data: ${data}, expected object, got ${typeof data}`);
            program.error('');
        }

        const { name, version } = data
        if (!name || typeof name !== 'string') {
            p.log.error(`Invalid remote native package name: ${name}, expected string, got ${typeof name}`);
            program.error('');
        }

        if (!version || typeof version !== 'string') {
            p.log.error(`Invalid remote native package version: ${version}, expected string, got ${typeof version}`);
            program.error('');
        }
    })

    const mappedRemoteNativePackages = new Map((castedRemoteNativePackages as { name: string, version: string }[])
        .map(a => [a.name, a]))

    return mappedRemoteNativePackages
}

export async function checkCompatibility(supabase: SupabaseClient<Database>, channel: string) {
    const dependenciesObject = await getLocalDepenencies()
    const mappedRemoteNativePackages = await getRemoteDepenencies(supabase, channel)

    const finalDepenencies = dependenciesObject
        .filter((a) => !!a.native)
        .map((local) => {
            const remotePackage = mappedRemoteNativePackages.get(local.name)
            if (remotePackage)
                return {
                    name: local.name,
                    localVersion: local.version,
                    remoteVersion: remotePackage.version
                }
            
            return {
                name: local.name,
                localVersion: local.version,
                remoteVersion: undefined
            }
        })

    return { 
        finalCompatibility: finalDepenencies,
        localDependencies: dependenciesObject,
     }
}

async function walkDir(dir: string, callback: (path: string) => Promise<void>) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const fullPath = `${dirent.path}/${dirent.name}`

        if (dirent.isDirectory()) {
            await walkDir(fullPath, callback)
        } else {
            await callback(`${dirent.path}/${dirent.name}`)
        }
    }
}