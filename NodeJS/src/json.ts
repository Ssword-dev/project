import fs from "fs";
import stripJSONComments from "strip-json-comments";

async function parseJSONFileWithComments<T>(filePath: string): Promise<T> {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const contentPromise = fs.promises.readFile(filePath, "utf-8");
  const content = await contentPromise;
  const strippedContent = stripJSONComments(content);

  try {
    return JSON.parse(strippedContent) as T;
  } catch (error) {
    console.error(`Error parsing JSON file: ${error}`);
    process.exit(1);
  }
}

export { parseJSONFileWithComments };
