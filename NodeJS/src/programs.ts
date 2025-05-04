// The Programs API
// Allows for calling programs via path or
// name (if in PATH)

import { exec, spawn, SpawnOptionsWithoutStdio } from "child_process";
import { INTERNALS } from "./symbols";
class ProgramsApiInternals {
  unquote(unsafe: string): string {
    // Escapes characters to make commands safe
    // e.g: Attacker inputted malicious string
    // >>> git push
    let result = "";
    let escaped = false;

    for (const char of unsafe) {
      if (escaped) {
        result += `\\${char}`;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (/['"`]/.test(char)) {
        continue;
      }

      result += char;
    }

    if (escaped) {
      result += "\\\\";
    }

    return result;
  }

  // Cross-Platform program finder to abstract
  // the way finding programs usually is
  where(program: string) {
    const finder = process.platform === "win32" ? "where" : "which";
    return new Promise<string[]>((res, _) => {
      exec(`${finder} "${this.unquote(program)}"`, (err, stdout, _) => {
        if (err) {
          return res([]);
        }
        res(stdout.split(/\r?\n/).filter(Boolean));
      });
    });
  }
}

type TryCallReturn = Promise<
  { success: true; result: string } | { success: false; error: Error }
>;
/**
 * The Prototype of Programs,
 */
class ProgramsApi {
  /** The internals of the Programs API */
  [INTERNALS] = new ProgramsApiInternals();

  /**
   *
   * @param program The program name/path of what you want to check if installed
   * @returns
   */
  async installed(program: string) {
    try {
      return (await this[INTERNALS].where(program)).length > 0;
    } catch (_) {
      return false;
    }
  }

  // fun fact, this used to be call_experimental
  /**
   * @brief A quick way to call programs
   * @description The call method of the ProgramsApi,
   * under the hood uses `child_process.spawn()` to asyncronously
   * spawn a process, the result is an awaitable string that came
   * from the process's `stdout` (standard output)
   * note that this method will reject (throw)
   * upon the first error in the process
   * @param program The program name, does not need to be sanitizeed
   * @param argv The arguments that the program will receive
   * @param options The options of spawn without stdio field, as it should pipe
   * @returns
   */
  async call(
    program: string,
    argv: string[],
    options: SpawnOptionsWithoutStdio,
    sig?: AbortSignal
  ) {
    // For our initial checking,
    // we use async/await
    // but for the process spawning
    // we shall use Promise instead
    // as it gives us further control and
    // allows us to resolve the promise inside of callbacks

    const safeProgramName = this[INTERNALS].unquote(program);
    const installed = await this.installed(safeProgramName);
    if (!installed) {
      throw new Error(`Program '${safeProgramName}' not installed!`);
    }

    // inside here is the actual logic where we spawn
    // the process, also yes, its important we use promise instead of
    // async so we can dynamically resolve inside a listener callback
    return await new Promise<string>((res, rej) => {
      // This is our subprocess
      const sp = spawn(safeProgramName, argv, {
        stdio: "pipe",
        ...options,
      });

      const exit = (..._: unknown[]) => {
        // This means the program has not exitted or have been killed yety
        if (!sp.killed || sp.exitCode === null) {
          // Program acknowledged the sigterm
          const killed = sp.kill("SIGTERM");
          // Program refused the sigterm
          if (!killed) {
            // force close it by sigkill
            sp.kill("SIGKILL");
          }
        }
      };

      process.on("beforeExit", exit);
      const cleanup = () => {
        sp.removeAllListeners();
        sp.stdout.removeAllListeners();
        sp.stderr.removeAllListeners();
        process.off("beforeExit", exit);
      };
      let output = "";
      let errors = "";
      sp.stderr.on("data", (chunk) => {
        errors += chunk;
      });
      // we use the impure output variable to capture the data
      // the program is writing,
      // we accumulate these until the program has closed
      // then we return either the data or throw an error
      sp.stdout.on("data", (chunk) => {
        output += chunk;
      });

      // if we dont exit with a 0 or a signal was found
      // we want to reject using a new error constructed
      // via string templating to give out nice error message

      sp.on("close", (code, sig) => {
        cleanup();

        // Reject if the program wrote to stderr even once
        if (errors.trim()) {
          return rej(new Error(`Program threw an unhandled error: ${errors}`));
        }

        // Reject if we did not exit with a 0 or a signal was detected
        if (code !== 0 || sig) {
          return rej(
            new Error(
              `Program ${program} exited via ${
                code
                  ? `returning exit code ${code}`
                  : `getting killed with signal ${sig}`
              }`
            )
          );
        }

        res(output);
      });

      // On error we simply reject with the given error
      // We *can* resolve with the given error but
      // we want to clearly state the user's intention
      // also cuz it looks like its actually part of our program
      // but its not, its just a child process
      sp.on("error", (err) => {
        cleanup();
        rej(err);
      });

      // Optionally you can pass an abort signal
      // we will handle this for convinence
      // like the fetch api, this signal will be used to
      // stop the process as it is with fetch's response
      if (sig) {
        sig.addEventListener("abort", exit);
      }
    });
  }

  async tryCall(
    program: string,
    argv: string[],
    options: SpawnOptionsWithoutStdio,
    sig?: AbortSignal
  ): TryCallReturn {
    try {
      return {
        success: true,
        result: await this.call(program, argv, options, sig),
      };
    } catch (err) {
      return {
        success: false,
        error: err as Error,
      };
    }
  }
  async where(program: string) {
    return await this[INTERNALS].where(program);
  }
}
/**
 * The standard Programs API
 */
const Programs = new ProgramsApi();
export { ProgramsApi, Programs };
