import inquirer from "inquirer";
import yargs from "yargs";
import {
  createTemplateAPI,
  isTemplate,
  loadTemplateConfig,
  Template,
  TemplateOptions,
} from "./template";
import assert from "assert";
import path from "path";
// Load the config file

function loadTemplate(template: string): Promise<Template> {
  try {
    // Check if the template is a URL
    const urlPattern =
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
    if (urlPattern.test(template)) {
      // Load the template from the URL
      return import(template);
    } else {
      // Load the template from the local file system

      try {
        return require(path.resolve(
          __dirname,
          "../../project-templates",
          template + ".template.js"
        ));
      } catch (error) {
        try {
          return require(path.resolve(
            template // Support for packages            // e.g: @someUser/my-template
          ));
        } catch (error) {
          console.error(`Error loading template: ${error}`);
          process.exit(1);
        }
      }
    }
  } catch (err) {
    console.error(`Error loading template: ${err}`);
    process.exit(1);
  }
}
export async function main() {
  const argv = await yargs(process.argv.slice(2)).argv;

  const templateConfig = await loadTemplateConfig();
  const answers: TemplateOptions = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Project Name:",
      default: (argv.name ? String(argv.name) : null) || "my-project",
      // Skip if user passed --name argument
      when: () => !argv.name,
      // We let the user choose how the name is validated using a regex
      validate: (input) => {
        const namePattern = new RegExp(templateConfig["project-name-regex"]);
        if (input === "" || input === undefined) {
          return "Project name cannot be empty.";
        }

        if (namePattern.test(input)) {
          return true;
        }

        return `Project name must match the pattern: ${templateConfig["project-name-regex"]}`;
      },
    },
    {
      type: "list",
      name: "type",
      message: "Project Type:",
      choices: ["cli", "library", "app"],
      default: String(argv["project-type"]) || "app",
      when: () => !argv["project-type"],
    },
    {
      type: "input",
      name: "description",
      message: "Project Description:",
      default:
        (argv.description === undefined ? null : String(argv.description)) ||
        "A simple project",
      // Skip if user passed --description argument
      when: () => !argv.description,
    },
    {
      type: "input",
      name: "git",
      message: "Git Repository URL:",
      // Not required, but if provided, must be a valid URL
      validate: (input) => {
        const urlPattern =
          /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
        // accept empty string as valid
        // if the user doesn't provide a URL, we assume it's valid
        // and return true
        if (input === "" || input === undefined) {
          return true;
        }
        if (urlPattern.test(input)) {
          return true;
        }
        return "Please enter a valid URL or leave it empty.";
      },
      default: (argv.git === undefined ? null : String(argv.git)) || "",
      // Skip if user passed --git argument
      when: () => !argv.git,
    },
    {
      type: "input",
      name: "template",
      message: "Template name or URL:",
      default:
        (argv.template === undefined ? null : String(argv.template)) ||
        "no-template",
      // Skip if user passed --template argument
      when: () => !argv.template,
    },

    // For Language or environment specific options, use a namespace
    // e.g: typescript-out-directory
  ]);

  // Hopefully require() works on urls

  // Require caches the template
  let template;
  try {
    // Load the template from the template the user provided
    // Can sometimes throw an error so we will catch it
    // an rethrow it
    template = await loadTemplate(answers.template);
  } catch (err) {
    console.error(`${err}`);
    process.exit(1);
  }

  if (!isTemplate(template)) {
    console.error(`Template Module '${answers.template} is not a Template!`);
    process.exit(1);
  }

  // If the project was detected to be a directory,
  // we need to ask the user if they want to overwrite it

  // First, we create the template API
  const api = await createTemplateAPI(answers);

  // Check if the project directory already exists

  const {
    // TemplateAPI.node connsists of all Node.JS builtin modules
    // except for fs, which is a special case
    // since we use fs-extra instead for easier file operations
    fs,
    path,
  } = api.node;

  const resolvedDirectory = path.resolve(process.cwd(), answers.name);

  if (fs.existsSync(resolvedDirectory)) {
    let overwrite;
    if (!api.templateConfig["user-preferences"]["project-priority"]) {
      const confirmation = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: `Directory ${resolvedDirectory} already exists. Do you want to overwrite it?`,
          default: false,
        },
      ]);
      overwrite = confirmation.overwrite;
    }

    // If the user preference states that the project priority is true, set it to true
    // and overwrite the directory
    else {
      overwrite = true;
    }

    if (!overwrite) {
      console.log("Aborting...");
      process.exit(0);
    }

    // If the user chose to overwrite, we need to delete the directory
    // and all its contents
    // We use fs-extra for this

    try {
      await fs.remove(resolvedDirectory);
    } catch (err) {
      console.error(`Error removing directory: ${err}`);
      process.exit(1);
    }
  }
  // Now we can create the directory
  try {
    await fs.mkdir(resolvedDirectory, { recursive: true });
  } catch (err) {
    console.error(`Error creating directory: ${err}`);
    process.exit(1);
  }
  // Now we can create the template
  // We need to pass the template API to the template
  // and the template api will do the rest from here
  try {
    const exitCode = await template.create(api);

    if (exitCode !== undefined) {
      assert(
        typeof exitCode === "number",
        `Template.create() must return a number or nothing!`
      );
      process.exit(exitCode);
    }
    // If the template doesn't return a number, we assume success
    // and exit with 0
    process.exit(0);
  } catch (err) {
    console.error(`Unhandled Template Error: ${err}`);
    process.exit(1);
  }
}

// Welcome to my list of to-do items, pending changes will be added here

// - Add support for global teardown and global startup

// - Question: Why does this tool exists?
// - Answer: Because creating a new project is a pain in the ...
// - but i dont want to use 10 different tools to do it
// - I want 1 tool to be able to create hundreds of different projects
// - using a popular language, javascript (or typescript but you need to bundle it)
// - I want to be able to use the same tool to create a new project
// - Want to create a new python project? Use this tool, using javascript,
// - we are able to create hundreds of different projects using a template

// - Question: Why not use a template engine?
// - Answer: Because this is a template engine, you just dont know it yet
// - This is a template engine that uses javascript as a template language

// - Question: Why use this specific tool?
// - Answer: Well, because it gives you the power of javascript
// - and the flexibility of a template engine
// - and the simplicity of a command line tool
// - it uses inquirer for the command line interface
// - and it uses fs-extra for the file system operations
// - and simplifies the process of creating a new project,
// - user have preferences? this tool will ask you for them,
// - and it will use them to tell the template what to do
// - it also respects the user preferences, such as deleting the directory
// - if the user prefers to delete the existing directory
// - or not, and it will also ask the user if they want to overwrite the directory

// - note: this tool is not a replacement for create-react-app, vite and other tools
// - and this tool is not affiliated with any of them

// - this tool is just a simple command line tool that uses javascript as a template language

// oh, also, this tool just have a few dependencies
// - inquirer for the command line interface
// - fs-extra for the file system operations
// - strip-json-comments for stripping comments from json files (Yes, this is the tool that allows you to input comments in json)
// - yargs for the command line arguments
// - and a few other dependencies
// and the runtime is node.js and windows cmd (for starting the program, provide create in the project command)
// e.g: project create --name my-project --template my-template --description "My project description" --git "https://someUser/my-repo.git" --project-type app"
// if you provide the arguments, the tool will not ask you for them
// - and it will use the arguments to create the project
// - bye!!!

// - also, yes this last bit of comment is a bit of a mess, but this is for
// - the one who will read this code in the future, or possibly extend it
// - and yes, this is a bit of a mess, but this is just a simple command line tool
// - and yes, i allow you to use this code for your own projects
// - as long as you also put the license in your project
