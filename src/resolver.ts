import Scanner, { ImportObj } from "./scanner";
import * as vscode from 'vscode';
import { isWin } from './help';
import JsImport from './jsImport';

const path = require('path');
const leven = require('leven');

export default class Resolver {
    resolve(value: string, doc: vscode.TextDocument, range: vscode.Range) {
        const cache = Scanner.cache;
        const nodeModuleCache = Scanner.nodeModuleCache;
        let quickPickItems = this.resolveItems(value, doc, range, false);
        vscode.window.showQuickPick(quickPickItems).then(item => {
            if (item) {
                vscode.commands.executeCommand('extension.fixImport',
                    item.importObj, item.doc, item.range);
            }
        })
    }

    sortItem(value: string) {
        return (a, b) => {
            return leven(value, a.importObj.module.name) - leven(value, b.importObj.module.name);
        }
    }

    /**
     * get items by value
     * TODO: sort by value
     * @param value desc value
     * @param doc
     * @param range
     * @param completion
     */
    resolveItems(value: string, doc: vscode.TextDocument, range: vscode.Range, completion: false) {
        // TODO: need sort ?
        // TODO: filter current file export
        try {
            const cache = Scanner.cache;
            const nodeModuleCache = Scanner.nodeModuleCache;
            let items = [];
            for (const key of Object.keys(Scanner.cache)) {
                // skip current file export
                if (cache[key].path === doc.fileName) {
                    continue;
                }
                if (completion) {
                    if (cache[key].module.name.toLowerCase().startsWith(value.toLowerCase())) {
                        items.push(this.resolveFromFile(cache[key], doc, range));
                    }
                } else {
                    if (cache[key].module.name.toLowerCase().includes(value.toLowerCase())) {
                        items.push(this.resolveFromFile(cache[key], doc, range));
                    }
                }
            }
            for (const key of Object.keys(nodeModuleCache)) {
                if (completion) {
                    if (nodeModuleCache[key].module.name.toLowerCase().startsWith(value.toLowerCase())) {
                        items.push(this.resolveFromModule(nodeModuleCache[key], doc, range));
                    }
                } else {
                    if (nodeModuleCache[key].module.name.toLowerCase().includes(value.toLowerCase())) {
                        items.push(this.resolveFromModule(nodeModuleCache[key], doc, range));
                    }
                }
            }
            return items.sort(this.sortItem(value));
        } catch (error) {
            JsImport.consoleError(error);
        }
    }

    resolveFromFile(importObj: ImportObj, doc: vscode.TextDocument, range: vscode.Range) {
        let rp = path.relative(vscode.workspace.rootPath, importObj.path);
        if (isWin) {
            rp = rp.replace(/\\/g, '/');
        }
        const label = importObj.module.isNotMember ?
            `import ${rp} [js-import]` : `import ${importObj.module.name} from ${rp} [js-import]`
        return {
            label,
            description: '',
            importObj: importObj,
            doc: doc,
            range: range,
        }
    }

    resolveFromModule(importObj: ImportObj, doc: vscode.TextDocument, range: vscode.Range) {
        return {
            label: `import ${importObj.module.name} from node_modules/${importObj.path} [js-import]`,
            description: '',
            importObj: importObj,
            doc: doc,
            range: range,
        }
    }
}
