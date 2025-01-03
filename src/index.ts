import * as os from "os";
import * as process from "process";
//# #if HAVE_VSCODE
import * as vscode from "vscode";
//# #elif HAVE_COC_NVIM
//# import * as vscode from "coc.nvim";
//# #endif
module.exports = async function variables(string: string, recursive = false) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const activeFile = vscode.window.activeTextEditor?.document;
  //# #if HAVE_VSCODE
  const absoluteFilePath = activeFile?.uri.fsPath;
  //# #elif HAVE_COC_NVIM
  //# const absoluteFilePath = activeFile?.uri
  //#   ? vscode.Uri.parse(activeFile.uri).fsPath
  //#   : null;
  //# #endif
  const workspace = vscode.workspace.workspaceFolders?.[0];
  //# #if HAVE_VSCODE
  const activeWorkspace = workspaceFolders?.find((workspace) =>
    absoluteFilePath?.startsWith(workspace.uri.fsPath)
  )?.uri.fsPath;
  //# #elif HAVE_COC_NVIM
  //# const uri = workspaceFolders?.find((workspace) =>
  //#   absoluteFilePath?.startsWith(vscode.Uri.parse(workspace.uri).fsPath)
  //# )?.uri;
  //# const activeWorkspace = uri ? vscode.Uri.parse(uri).fsPath : null;
  //# #endif
  const homeDir = os.homedir();

  // ${userHome} - /home/your-username
  string = string.replace(/\${userHome}/g, homeDir);

  // ${workspaceFolder} - /home/your-username/your-project
  string = string.replace(
    /\${workspaceFolder}/g,
    //# #if HAVE_VSCODE
    workspace?.uri.fsPath
    //# #elif HAVE_COC_NVIM
    //# vscode.Uri.parse(workspace?.uri).fsPath ?? ""
    //# #endif
  );

  // ${workspaceFolder:name} - /home/your-username/your-project2
  string = string.replace(/\${workspaceFolder:(.*?)}/g, function (_, name) {
    //# #if HAVE_VSCODE
    return (
      workspaceFolders?.find((workspace) => workspace.name === name)?.uri
        .fsPath ?? ""
    );
    //# #elif HAVE_COC_NVIM
    //# const uri = workspaceFolders?.find(
    //#   (workspace) => workspace.name === name
    //# )?.uri;
    //# return uri ? vscode.Uri.parse(uri).fsPath : "";
    //# #endif
  });

  // ${workspaceFolderBasename} - your-project
  string = string.replace(
    /\${workspaceFolderBasename}/g,
    workspace?.name ?? ""
  );

  // ${workspaceFolderBasename:name} - your-project2
  string = string.replace(
    /\${workspaceFolderBasename:(.*?)}/g,
    function (_, name) {
      return (
        workspaceFolders?.find((workspace) => workspace.name === name)?.name ??
        ""
      );
    }
  );

  // ${file} - /home/your-username/your-project/folder/file.ext
  string = string.replace(/\${file}/g, absoluteFilePath ?? "");

  // ${fileWorkspaceFolder} - /home/your-username/your-project
  string = string.replace(/\${fileWorkspaceFolder}/g, activeWorkspace ?? "");

  // ${relativeFile} - folder/file.ext
  string = string.replace(
    /\${relativeFile}/g,
    absoluteFilePath?.substring(activeWorkspace?.length ?? 0) ?? ""
  );

  // ${relativeFileDirname} - folder
  string = string.replace(
    /\${relativeFileDirname}/g,
    absoluteFilePath?.substring(
      activeWorkspace?.length ?? 0,
      absoluteFilePath?.lastIndexOf(os.platform() === "win32" ? "\\" : "/")
    ) ?? ""
  );

  // ${fileBasename} - file.ext
  string = string.replace(
    /\${fileBasename}/g,
    absoluteFilePath?.split("/")?.pop() ?? ""
  );

  // ${fileBasenameNoExtension} - file
  string = string.replace(
    /\${fileBasenameNoExtension}/g,
    absoluteFilePath?.split("/").pop()?.split(".")?.shift() ?? ""
  );
  // ${fileDirname} - /home/your-username/your-project/folder
  string = string.replace(
    /\${fileDirname}/g,
    absoluteFilePath?.split("/")?.slice(0, -1)?.join("/") ?? ""
  );

  // ${fileExtname} - .ext
  string = string.replace(
    /\${fileExtname}/g,
    absoluteFilePath?.split(".")?.pop() ?? ""
  );

  // ${lineNumber} - line number of the cursor
  string = string.replace(
    /\${lineNumber}/g,
    (vscode.window.activeTextEditor
      //# #if HAVE_VSCODE
      ? vscode.window.activeTextEditor.selection.start.line + 1
      //# #elif HAVE_COC_NVIM
      //# ? vscode.window.activeTextEditor.visibleRanges[0].start.line + 1
      //# #endif
      : 0
    ).toString()
  );

  // ${selectedText} - text selected in your code editor
  string = string.replace(/\${selectedText}/g, function () {
    return (
      vscode.window.activeTextEditor?.document
        //# #if HAVE_VSCODE
        .getText(
          new vscode.Range(
            vscode.window.activeTextEditor.selection.start,
            vscode.window.activeTextEditor.selection.end
          )
        )
        //# #elif HAVE_COC_NVIM
        //# .getLines(
        //#   vscode.window.activeTextEditor.visibleRanges[0].start.line,
        //#   vscode.window.activeTextEditor.visibleRanges[0].end.line
        //# ).join("\n") ?? ""
        //# #endif
    );
  });

  // ${cwd} - current working directory
  string = string.replace(
    /\${cwd}/g,
    absoluteFilePath?.split("/")?.slice(0, -1)?.join("/") ?? ""
  );

  // ${execPath} - location of Code.exe
  string = string.replace(/\${execPath}/g, process.execPath);

  // ${pathSeparator} - / on macOS or linux, \ on Windows
  string = string.replace(
    /\${pathSeparator}/g,
    os.platform() === "win32" ? "\\" : "/"
  );

  // ${/} - short for ${pathSeparator}
  string = string.replace(/\${\/}/g, os.platform() === "win32" ? "\\" : "/");

  // ${env:VARIABLE} - environment variable
  string = string.replace(/\${env:(.*?)}/g, function (variable, _) {
    return process.env[_] || "";
  });

  // ${config:VARIABLE} - configuration variable
  string = string.replace(/\${config:(.*?)}/g, function (variable, _) {
    return vscode.workspace.getConfiguration().get(_, "");
  });

  if (string.match(/\${command:(.*?)}/)) {
    // async
    while (string.match(/\${command:(.*?)}/)) {
      const command = string.match(/\${command:(.*?)}/)![1];
      try {
        const result = await vscode.commands.executeCommand(command);
        string = string.replace(
          /\${command:(.*?)}/,
          result !== undefined ? result + "" : ""
        );
      } catch (error) {
        string = string.replace(/\${command:(.*?)}/, "");
      }
    }
  }

  if (
    recursive &&
    string.match(
      /\${(workspaceFolder|workspaceFolder:(.*?)|workspaceFolderBase:(.*?)|workspaceFolderBasename|fileWorkspaceFolder|relativeFile|fileBasename|fileBasenameNoExtension|fileExtname|fileDirname|cwd|pathSeparator|lineNumber|selectedText|env:(.*?)|config:(.*?)|command:(.*?)|userHome)}/
    )
  ) {
    string = await variables(string, recursive);
  }
  return string;
};
