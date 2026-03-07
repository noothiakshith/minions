import {tool} from '@langchain/core/tools'
import { Sandbox } from '@e2b/code-interpreter'
import * as z from 'zod'
export const read_file = tool(
    async({filepath},config)=>{
        const sandboxid = config?.configurable?.sandboxId
        if(sandboxid){
            const sbx = await Sandbox.connect(sandboxid);
            const content = await sbx.files.read(filepath);
            return content
        }else{
            return new Error("Sandbox not found")   
        }
    },{
    name:"Read_File",
    description:"Read the file from the given path",
    schema:z.object({
        filepath:z.string()
    })
})


export const write_file = tool(
    async({filepath,content},config)=>{
        const sandboxid = await config?.configurable?.sandboxId;
        if(sandboxid){
            const sbx = await Sandbox.connect(sandboxid);
            await sbx.files.write(filepath,content);
            return `file ${filepath} written successfully`
        }else{
            return new Error("Sandbox not found")   
        }
    }
    ,{
    name:"Write_file",
    description:"This is used to write a file",
    schema:z.object({
        filepath:z.string(),
        content:z.string()
    })
})

export const list_files = tool(
    async({directory},config)=>{
        const sandboxid = config?.configurable?.sandboxId;
        if(sandboxid){
            const sbx = await Sandbox.connect(sandboxid);
            const files = await sbx.files.list(directory);
            return JSON.stringify(files);
        }else{
            return new Error("Sandbox not found")   
        }
    }
    ,{
    name:"List_Files",
    description:"This is used to list all the files in the directory",
    schema:z.object({
        directory:z.string()
    })
})

export const make_dir = tool(
    async({directory},config)=>{
        const sandboxid = config?.configurable?.sandboxId;
        if(sandboxid){
            const sbx = await Sandbox.connect(sandboxid);
            await sbx.files.makeDir(directory);
            return `directory ${directory} created successfully`
        }else{
            return new Error("Sandbox not found")   
        }
    }
    ,{
    name:"Make_dir",
    description:"This is used to make a directory",
    schema:z.object({
        directory:z.string()
    })
})

export const run_command = tool(
    async({command},config)=>{
        const sandboxid = config?.configurable?.sandboxId;
        if(sandboxid){
            const sbx = await Sandbox.connect(sandboxid);
            const output = await sbx.commands.run(command);
            return `Exit Code: ${output.exitCode}\nSTDOUT: ${output.stdout}\nSTDERR: ${output.stderr}`;
        }else{
            return new Error("Sandbox not found")   
        }
    }
    ,{
    name:"Run_command",
    description:"This is used to run a command",
    schema:z.object({
        command:z.string()
    })
})


export const get_url = tool(
    async({port}, config) => {
        const sandboxid = config?.configurable?.sandboxId;
        if(sandboxid) {
            const sbx = await Sandbox.connect(sandboxid);
            const host = sbx.getHost(port);
            return `https://${host}`;
        } else {
            return new Error("Sandbox not found");
        }
    },
    {
        name: "Get_URL",
        description: "Get public URL for a port running in the sandbox",
        schema: z.object({
            port: z.number()
        })
    }
)


export const run_command_background = tool(
    async({command}, config) => {
        const sandboxid = config?.configurable?.sandboxId;
        if(sandboxid) {
            const sbx = await Sandbox.connect(sandboxid);
            const cmd = await sbx.commands.run(command, { background: true });
            return `Command started in background with PID: ${cmd.pid}`;
        } else {
            return new Error("Sandbox not found");
        }
    },
    {
        name: "Run_command_background",
        description: "Run a command in background (e.g., dev servers)",
        schema: z.object({
            command: z.string()
        })
    }
)