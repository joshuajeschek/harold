// Unless explicitly defined, set NODE_ENV as development:
process.env.NODE_ENV ??= 'development';

import 'reflect-metadata';
import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-api/register';
import '@sapphire/plugin-editable-commands/register';
import '@sapphire/plugin-hmr/register';

import * as colorette from 'colorette';
import { config } from 'dotenv-cra';
import { join } from 'path';
import { inspect } from 'util';
import { srcDir } from './constants';
import { ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';

// Read env var
config({ path: join(srcDir, '.env') });

// Set default inspection depth
inspect.defaultOptions.depth = 1;

// Enable colorette
colorette.createColors({ useColor: true });

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.Overwrite);
