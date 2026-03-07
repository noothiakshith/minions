import { Template, defaultBuildLogger } from 'e2b'
import { template } from './template'
import * as dotenv from 'dotenv'

dotenv.config()

async function main() {
  await Template.build(template, 'akshith-dev', {
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);