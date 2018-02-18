const fs = require('fs');

const Debug = require('debug');
// const { Packager } = require('parcel-bundler');
const JSPackagerOfficial = require('parcel-bundler/src/packagers/JSPackager.js');
const lineCounter = require('parcel-bundler/src/utils/lineCounter');
const urlJoin = require('parcel-bundler/src/utils/urlJoin');
const path = require('path');

let ownDebugger = Debug('parcel-plugin-vue:JSPackager');

const prelude = fs.readFileSync(__dirname + '/../builtins/prelude.js', 'utf8').trim();

ownDebugger('JSPackager');
class JSPackager extends JSPackagerOfficial {
    async start() {
        ownDebugger('start');

        this.first = true;
        this.dedupe = new Map;
        this.bundleLoaders = new Set();
        this.externalModules = new Set();

        await this.dest.write(prelude + '({');
        this.lineOffset = lineCounter(prelude);
    }

    async end() {
        ownDebugger('end');

        let entry = [];

        // Add the HMR runtime if needed.
        if (this.options.hmr) {
            let asset = await this.bundler.getAsset(
                require.resolve('../builtins/hmr-runtime.js')
            );
            await this.addAssetToBundle(asset);
            entry.push(asset.id);
        }

        if (await this.writeBundleLoaders()) {
            entry.push(0);
        }

        // Load the entry module
        if (this.bundle.entryAsset && this.externalModules.size === 0) {
            entry.push(this.bundle.entryAsset.id);
        }

        await this.dest.write('},{},' + JSON.stringify(entry) + ')');
        if (this.options.sourceMaps) {
          // Add source map url
          await this.dest.write(
            `\n//# sourceMappingURL=${urlJoin(
              this.options.publicURL,
              path.basename(this.bundle.name, '.js') + '.map'
            )}`
          );
        }
        await this.dest.end();
    }
}

module.exports = JSPackager;
