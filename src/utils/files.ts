import { exec } from "child_process";

interface ExecCommandOptions {
  command: string;
}

const execCommand = ({ command }: ExecCommandOptions): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
};

export { execCommand };
