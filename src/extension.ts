// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const registerCNCommand = () => {
    console.log(`Registering command`);
    const command = vscode.commands.registerCommand(
      'cn-wrapper.wrap',
      commandFn
    );

    context.subscriptions.push(command);
  };

  const registerCodeFixAction = () => {
    const provider = vscode.languages.registerCodeActionsProvider(
      ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'],
      {
        provideCodeActions(
          document: vscode.TextDocument,
          range: vscode.Range,
          context: vscode.CodeActionContext,
          token: vscode.CancellationToken
        ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
          const actions: vscode.CodeAction[] = [];

          const fixAction = new vscode.CodeAction(
            'cn-wrapper: Wrap/insert cn',
            vscode.CodeActionKind.QuickFix
          );

          fixAction.command = {
            title: 'cn-wrapper: Wrap/insert cn',
            command: 'cn-wrapper.wrap',
          };

          actions.push(fixAction);
          return actions;
        },
      }
    );

    context.subscriptions.push(provider);
  };

  registerCNCommand();
  registerCodeFixAction();
}

export function deactivate() {}

function commandFn() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const config = vscode.workspace.getConfiguration('cnWrapper');

  const prefix = config.get('prefix');
  const insert = config.get('insertOnNoClassNameAttribute');

  const document = editor.document;
  const selection = editor.selection;
  const line = selection.active.line;
  const lineText = document.lineAt(line).text;
  const cursorPosition = editor.selection.active;

  const initial = 'className=';
  let found = '';
  const lineChars = lineText.split('');
  let classNameStart = -1;
  let classNameEnd = -1;
  let curly = false;

  for (let i = 0; i < lineChars.length; i++) {
    const char = lineChars[i];
    const nextChar = lineChars[i + 1];

    if (classNameStart >= 0) {
      if (
        (char === `"` && nextChar === '}') ||
        (char === `'` && nextChar === '}') ||
        char === `"` ||
        char === `'`
      ) {
        classNameEnd = i;
        break;
      }
    }

    if (found === initial) {
      if (char === '{') {
        curly = true;
        continue;
      }
      if (char === `"` || char === `'`) {
        classNameStart = i;
        continue;
      }

      found = '';
    }
    if (char === initial.at(found.length)) {
      found += char;
      continue;
    }
    found = '';
  }

  if (insert && classNameStart < 0 && classNameEnd < 0) {
    editor.edit((editBuilder) => {
      editBuilder.insert(cursorPosition, `className={${prefix}('')}`);
    });
    return;
  }

  editor.edit((editBuilder) => {
    const posStart = new vscode.Position(line, classNameStart);
    const posEnd = new vscode.Position(line, classNameEnd + 1);
    if (curly) {
      editBuilder.insert(posStart, `${prefix}(`);
      editBuilder.insert(posEnd, ')');
    } else {
      editBuilder.insert(posStart, `{${prefix}(`);
      editBuilder.insert(posEnd, ')}');
    }
  });
}
