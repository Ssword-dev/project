// node-ts-template/index.js

/**
 * Template module for creating a TypeScript + Node.js project.
 * @param {import('../NodeJS/src/template').TemplateAPI} api - The template API provided by the CLI tool.
 * @returns {Promise<void>}
 */
exports.create = async function (api) {
  const inquirer = api.inquirer;
  const { fs, path, assert, child_process } = api.node;
  const { name, description } = api.options;
  const projectDir = path.join(api.cwd, name);

  // Ensure the project directory does not already exist
  assert(!fs.existsSync(projectDir), `Directory '${name}' already exists.`);

  // Create the project directory
  fs.mkdirSync(projectDir);

  // Initialize package.json
  const packageJson = {
    name,
    version: "1.0.0",
    description,
    main: "dist/index.js",
    scripts: {
      build: "tsc",
      start: "node dist/index.js",
      dev: "ts-node src/index.ts",
    },
    keywords: [],
    author: "",
    license: "MIT",
    dependencies: {},
    devDependencies: {
      typescript: "^5.0.0",
      eslint: "^8.0.0",
      jest: "^29.0.0",
      "ts-node": "^10.0.0",
      "@types/node": "^20.0.0",
    },
  };
  fs.writeFileSync(
    path.join(projectDir, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  // Create tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: "ES2020",
      module: "CommonJS",
      outDir: "dist",
      rootDir: "src",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    include: ["src"],
  };
  fs.writeFileSync(
    path.join(projectDir, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2)
  );

  // Create src directory and index.ts
  const srcDir = path.join(projectDir, "src");
  fs.mkdirSync(srcDir);
  const indexTsContent = `console.log('Hello, ${name}!');\n`;
  fs.writeFileSync(path.join(srcDir, "index.ts"), indexTsContent);

  // Optionally, we can ask the user if they want us to install dependencies
  const { installDeps, setupJest, setupESLint } = await inquirer.prompt([
    {
      type: "confirm",
      name: "setupJest",
      message: "Do you want to set up Jest for testing?",
      default: true,
      // Mark this required
      validate: (input) => {
        if (input === undefined) {
          return "This field is required.";
        }
        return true;
      },
    },
    {
      type: "confirm",
      name: "setupESLint",
      message: "Do you want to set up ESLint for linting?",
      default: true,
      validate: (input) => {
        if (input === undefined) {
          return "This field is required.";
        }
        return true;
      },
    },
    {
      type: "confirm",
      name: "installDeps",
      message: "Do you want to install dependencies?",
      default: true,
      validate: (input) => {
        if (input === undefined) {
          return "This field is required.";
        }
        return true;
      },
    },
  ]);

  // Initialize JEST configuration
  if (setupJest) {
    const jestConfig = {
      preset: "ts-jest",
      testEnvironment: "node",
      transform: {
        "^.+\\.tsx?$": "ts-jest",
      },
      testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
      moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    };
    fs.writeFileSync(
      path.join(projectDir, "jest.config.js"),
      `module.exports = ${JSON.stringify(jestConfig, null, 2)};`
    );
  }

  // Initialize ESLint configuration
  if (setupESLint) {
    const eslintConfig = {
      env: {
        es6: true,
        node: true,
        jest: true,
      },
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      rules: {
        "no-console": "error",
      },
    };
    fs.writeFileSync(
      path.join(projectDir, ".eslintrc.js"),
      `module.exports = ${JSON.stringify(eslintConfig, null, 2)};`
    );
  }

  // Initialize .gitignore
  const gitignoreContent = `
# Node.js
node_modules/
dist/

# TypeScript
*.tsbuildinfo
# Logs

logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
# Environment variables
.env
.env.*

# IDEs
.vscode/
.idea/
.editorconfig

# OS generated files
.DS_Store
Thumbs.db
`;
  fs.writeFileSync(path.join(projectDir, ".gitignore"), gitignoreContent);

  if (installDeps) {
    // Install TypeScript and ts-node
    child_process.execSync("npm i", {
      cwd: projectDir,
      stdio: "inherit",
    });
  }
  // Optionally, initialize a Git repository
  // const { execSync } = require('child_process');
  // execSync('git init', { cwd: projectDir });
};
