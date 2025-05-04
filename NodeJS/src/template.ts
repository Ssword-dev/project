import * as fsx from "fs-extra";
import assert from "assert";
import path from "path";
import http from "http";
import https from "https";

import inquirer from "inquirer";
import child_process from "child_process";
import os from "os";
import readline from "readline";
import url from "url";
import util from "util";
import events from "events";
import stream from "stream";
import zlib from "zlib";
import crypto from "crypto";
import dns from "dns";
import net from "net";
import tls from "tls";
import vm from "vm";
import buffer from "buffer";

// For parsing JSON files with comments
// This is a workaround for the fact that JSON does not support comments
// and we want to allow comments in our JSON files
import { parseJSONFileWithComments } from "./json";
import { ProgramsApi } from "./programs";
interface TemplateOptions {
  name: string;
  type: string;
  description: string;
  git: string;
  template: string;
}

interface TemplateAPI {
  cwd: string;
  getAbsoluteProjectPath(): string;
  resolveProjectPath(...parts: string[]): string;
  options: TemplateOptions;
  node: {
    fs: typeof fsx;
    assert: typeof assert;
    path: typeof path;
    http: typeof http;
    https: typeof https;
    process: typeof process;
    child_process: typeof import("child_process");
    os: typeof import("os");
    readline: typeof import("readline");
    url: typeof import("url");
    util: typeof import("util");
    events: typeof import("events");
    stream: typeof import("stream");
    zlib: typeof import("zlib");
    crypto: typeof import("crypto");
    dns: typeof import("dns");
    net: typeof import("net");
    tls: typeof import("tls");
    vm: typeof import("vm");
    buffer: typeof import("buffer");
  };

  programs: ProgramsApi;
  inquirer: typeof inquirer;
  /**
   * A set of global variables that can be used in the template
   * This is a JSON object that can be used to pass variables into the template
   */
  globalVariables: Record<string, unknown>;

  /**
   * An object that contains the template config
   */
  templateConfig: TemplateConfig;
}

interface Template {
  /**
   * @param api A set of API for the template to use
   * A create method of a template that returns a number
   * will exit with the given number as code
   */
  create(api: TemplateAPI): number | Promise<number>;
  /**
   * @param api A set of API for the template to use
   * A create method of a template that returns nothing is expected
   * always interpreted by template as successful
   */
  create(api: TemplateAPI): void | Promise<void>;
}

/**
 * A template config is a configuration object
 * for the project create command,
 */
interface TemplateConfig {
  /** A regex used for verifying if a project name is valid or not */
  "project-name-regex": string;

  /** The template-directory field is used to specify the template directory relative to the config file */
  "template-directory": string;

  /** A boolean attribute that controls whether to remove the directory on unsuccessful exit */
  "remove-on-failure": boolean;

  /** A path that points to a module that runs before any template is loaded, note that any exception thrown will halt the program */
  "global-startup": string;

  /** A path that points to a module that runs after the template has finished creating, note that any exception thrown will halt the program */
  "global-teardown": string;

  /**
   * A JSON file that serves as a way to pass variables into every template
   * available via TemplateAPI.globalVariables,
   *
   * Syntax errors in this file will halt the program
   *
   * Can also be left empty to disable the global variables
   *
   * Can also be a JSON object for internal global variables declaration
   */

  "global-variables"?: string | object;

  "user-preferences": {
    /**
     * A boolean attribute that controls whether projects should overwrite existing folder
     * named the same as the project name
     * */
    "project-priority": boolean;
  };
}

async function loadUserPreferences(
  config: TemplateConfig
): Promise<TemplateConfig["user-preferences"]> {
  if (config["user-preferences"] === undefined) {
    return {
      "project-priority": false,
    };
  }
  if (typeof config["user-preferences"] === "string") {
    const userPreferencesPath = path.resolve(
      __dirname,
      "../../",
      config["user-preferences"]
    );

    // Check if the user preferences file exists
    if (!fsx.existsSync(userPreferencesPath)) {
      console.error(
        `User preferences file not found at ${userPreferencesPath}`
      );
      process.exit(1);
    }

    // Load the user preferences file
    try {
      const userPreferences = await parseJSONFileWithComments<
        TemplateConfig["user-preferences"]
      >(userPreferencesPath);
      return userPreferences;
    } catch (error) {
      console.error(`Error loading user preferences file: ${error}`);
      process.exit(1);
    }
  }

  if (typeof config["user-preferences"] === "object") {
    return config["user-preferences"] as TemplateConfig["user-preferences"];
  } else {
    console.error(
      `User preferences must be a JSON object or a path to a JSON file`
    );
    process.exit(1);
  }
}
async function loadTemplateConfig() {
  const configPath = path.resolve(
    __dirname,
    "../../",
    "project-create.config.jsonc"
  );

  // Check if the config file exists
  if (!fsx.existsSync(configPath)) {
    console.error(`Config file not found at ${configPath}`);
    process.exit(1);
  }

  // Load the config file
  try {
    const config = await parseJSONFileWithComments<TemplateConfig>(configPath);
    return {
      ...config,
      "user-preferences": await loadUserPreferences(config),
    };
  } catch (error) {
    console.error(`Error loading config file: ${error}`);
    process.exit(1);
  }
}

async function loadGlobalVariables(
  config: TemplateConfig
): Promise<Record<string, unknown>> {
  if (config["global-variables"] === undefined) {
    return {};
  }

  if (typeof config["global-variables"] === "string") {
    const globalVariablesPath = path.resolve(
      __dirname,
      "../../",
      config["global-variables"]
    );

    // Check if the global variables file exists
    if (!fsx.existsSync(globalVariablesPath)) {
      console.error(
        `Global variables file not found at ${globalVariablesPath}`
      );
      process.exit(1);
    }

    // Load the global variables file
    try {
      const globalVariables = await parseJSONFileWithComments<
        Record<string, unknown>
      >(globalVariablesPath);
      return globalVariables;
    } catch (error) {
      console.error(`Error loading global variables file: ${error}`);
      process.exit(1);
    }
  } else {
    return config["global-variables"] as Record<string, unknown>;
  }
}

async function createTemplateAPI(
  options: TemplateOptions
): Promise<TemplateAPI> {
  const cwd = process.cwd();
  const templateConfig = await loadTemplateConfig();
  const globalVariables = await loadGlobalVariables(templateConfig);
  return {
    cwd,
    getAbsoluteProjectPath() {
      return path.resolve(cwd, `./${options.name}`);
    },
    resolveProjectPath(...parts: string[]) {
      return path.resolve(cwd, `./${options.name}`, ...parts);
    },
    node: {
      fs: fsx,
      assert,
      path,
      http,
      https,
      process,
      child_process,
      os,
      readline,
      url,
      util,
      events,
      stream,
      zlib,
      crypto,
      dns,
      net,
      tls,
      vm,
      buffer,
    },
    inquirer,
    programs: new ProgramsApi(),
    options,
    templateConfig,
    globalVariables,
  };
}

function isTemplate(o: unknown): o is Template {
  return typeof (o as Template)["create"] === "function";
}
export type { Template, TemplateAPI, TemplateOptions };
export {
  createTemplateAPI,
  isTemplate,
  loadGlobalVariables,
  loadTemplateConfig,
  loadUserPreferences,
};
