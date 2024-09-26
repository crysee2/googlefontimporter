import { url } from 'inspector';
import { text } from 'stream/consumers';
import * as vscode from 'vscode';
import axios from 'axios';
import { ConsoleReporter } from '@vscode/test-electron';

export async function activate(context: vscode.ExtensionContext) {
  let jsonLocation: string = vscode.workspace.getConfiguration('google-font-importer')['json-url'];
  let fontsLocation: string = vscode.workspace.getConfiguration('google-font-importer')['import-url'];
  let sliceJsonStringStart: number = vscode.workspace.getConfiguration('google-font-importer')['slice-json-string-start'];

  let jsonData: string | object = (await axios.get(jsonLocation)).data;
  //if the data from your url is not in json format, you can use the JSON.parse() function to convert it to json
  let fontJson = typeof jsonData === 'string' ? JSON.parse(jsonData.slice(sliceJsonStringStart || 0)) : jsonData;
  let fontObjects = {};
  //@ts-ignore
  fontJson.forEach((item) => {
    let variants: string[] = [];
    //@ts-ignore
    item.variants.forEach((variant) => {
      if (variant === 'italic') {
        variants.push('400i');
      } else if (variant.endsWith('italic')) {
        variants.push(variant.slice(0, -5));
      } else if (variant === 'regular') {
        variants.push('400');
      } else {
        variants.push(variant);
      }
    });
    //@ts-ignore
    fontObjects[item.id] = [item.family.replace(' ', '+'), variants];
  });

  function buildFontUrl(fontName: string) {
    if (fontName) {
      //@ts-ignore
      let fontObject = fontObjects[fontName.toLowerCase().replace(' ', '-')];
      if (fontObject) {
        return "@import url('" + fontsLocation + fontObject[0] + ':' + fontObject[1].join(',') + "');";
      } else {
        vscode.window.showInformationMessage('The requested font families "' + fontName + '" are not available on Google Fonts.');
      }
    } else {
      vscode.window.showInformationMessage("Font name can't be empty");
    }
  }

  let importFontCommand = vscode.commands.registerCommand('google-font-importer.importFont', () => {
    vscode.window.showInputBox().then((fontName) => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        //@ts-ignore
        let url = buildFontUrl(fontName);
        editor.edit((editBuilder) => {
          //@ts-ignore
          editBuilder.insert(editor.selection.active, url);
        });
      }
    });
  });

  let importFontWithVariantsCommand = vscode.commands.registerCommand('google-font-importer.importFontWithVariants', () => {
    vscode.window.showInputBox().then((fontName) => {
      if (!fontName) {
        vscode.window.showInformationMessage("Font name can't be empty");
      } else {
        //@ts-ignore
        let fontObject = fontObjects[fontName.toLowerCase().replace(' ', '-')];
        if (!fontObject) {
          vscode.window.showInformationMessage('The requested font families "' + fontName + '" are not available on Google Fonts.');
        } else {
          vscode.window.showInputBox().then((fontWeights) => {
            if (!fontWeights) {
              vscode.window.showInformationMessage("Font variants can't be empty");
            } else {
              const editor = vscode.window.activeTextEditor;
              if (editor) {
                //@ts-ignore
                let fontWeightsArray = fontWeights.split(',');
                let fontWeightsArrayFiltered = fontWeightsArray.filter((fontWeight) => {
                  return fontObject[1].includes(fontWeight);
                });
                fontWeightsArrayFiltered = [...new Set(fontWeightsArrayFiltered)];
                if (!fontWeightsArrayFiltered.length) {
                  vscode.window.showInformationMessage(
                    'The requested font variants "' + fontWeightsArray.join(',') + '" are not available for the font "' + fontName + '".'
                  );
                } else {
                  let url = "@import url('" + fontsLocation + fontObject[0] + ':' + fontWeightsArrayFiltered.join(',') + "');";
                  editor.edit((editBuilder) => {
                    //@ts-ignore
                    editBuilder.insert(editor.selection.active, url);
                  });
                  if (fontWeightsArrayFiltered.length !== fontWeightsArray.length) {
                    vscode.window.showInformationMessage(
                      'The requested font variants "' +
                        fontWeightsArray.filter((fontWeight) => !fontWeightsArrayFiltered.includes(fontWeight)).join(',') +
                        '" are not available for the font "' +
                        fontName +
                        '".'
                    );
                  }
                }
              }
            }
          });
        }
      }
    });
  });

  context.subscriptions.push(importFontCommand, importFontWithVariantsCommand);
}

export function deactivate() {}
