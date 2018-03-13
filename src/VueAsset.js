const { EventEmitter } = require('events');

const Debug = require('debug');
// const { Asset } = require('parcel-bundler');
const JSAsset = require('parcel-bundler/src/assets/JSAsset');
const { compiler } = require('vueify-bolt');

let ownDebugger = Debug('parcel-plugin-vue:MyAsset');

let event = new EventEmitter();

compiler.loadConfig();

function compilerPromise(fileContent, filePath) {
    return new Promise((resolve, reject) => {
        let style = '';
        let dependencies = [];
        function compilerStyle(e) {
            style = e.style;
        }
        function addDependency(srcPath) {
            if (dependencies.indexOf(srcPath) === -1) {
                dependencies.push(srcPath);
            }
        }
        compiler.on('style', compilerStyle);
        compiler.on('dependency', addDependency)
        compiler.compile(fileContent, filePath, function (err, result) {
            compiler.removeListener('style', compilerStyle);
            // result is a common js module string
            if (err) {
                reject(err);
            } else {
                resolve({
                    js: result,
                    css: style,
                    dependencies
                });
            }
        });
    });
}

ownDebugger('MyAsset');
class MyAsset extends JSAsset {
    constructor(...args) {
        super(...args);
        if (compiler.options.extractCSS) {
            this.type = 'css';
        }
    }

    async parse(code) {
        ownDebugger('parse');

        // parse code to an AST
        this.outputAll = await compilerPromise(this.contents, this.name);
        this.outputCode = this.outputAll.js;
        return await super.parse(this.outputCode);
    }

    collectDependencies() {
        ownDebugger('collectDependencies');

        for (let dep of this.outputAll.dependencies) {
            this.addDependency(dep, {includedInParent: true});
        }

        // analyze dependencies
        super.collectDependencies();
    }

    async generate() {
        ownDebugger('generate');

        let ret = await super.generate() || {};
        ret.css = this.outputAll.css;
        return ret;
    }
}

module.exports = MyAsset;
