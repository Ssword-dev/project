class Template {
  // We use the Template API to create python project (venv)
  /**
   *
   * @param {import("../NodeJS/src/template").TemplateAPI} api
   */
  async create(api) {
    const { fs, path, child_process } = api.node;
    const { programs, inquirer } = api;

    const projectDir = api.getAbsoluteProjectPath();
    if (!programs.installed("python")) {
      throw new Error("Please install python, preferably the latest version!");
    }

    await programs.call("python", ["-m", "venv", "."], {
      cwd: projectDir,
    });
    await programs.call("pip", ["-r", "requirements.txt"]);
  }
}

module.exports = new Template();
