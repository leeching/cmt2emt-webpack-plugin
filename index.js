'use strict'

const fs = require('fs');
const path = require('path');
const IDENTITY = 'cmt2emt-webpack-plugin';

function Plugin(options) {
  if (!options.source)
    throw new Error('Cmt2emtWebpackPlugin: options.source should be specified');
  if (!options.output)
    throw new Error('Cmt2emtWebpackPlugin: options.output should be specified');
  this.options = options;
}

Plugin.prototype.apply = function(compiler) {
  const sourceFile = this.options.source;
  const outputFile = this.options.output;
  const transform = this.options.transform;

  compiler.plugin('emit', function(compilation, callback) {
    const webpackStatsJson = compilation.getStats().toJson();

    fs.readFile(sourceFile, 'utf8', (err, data) => {
      if (err) {
        callback();
        throw new Error('error occurs when reading source file');
      }
      data = data.replace(/<!--(.*)-->/g, (commentNodeString, commentContent) => {
        return composeScriptTag(commentContent, webpackStatsJson, transform);
      });
      // check whether output file is outdated
      const outputPath = compilation.compiler.outputPath;
      checkIfOutdated(path.join(outputPath, outputFile), data)
        .then(function () {
          compilation.assets[outputFile] = {
            source: () => data,
            size: () => data.length
          };
          callback();
        })
        .catch(function () {
          callback();
        });
    });

  });

};

/**
 * check if a output file has been outdated
 * @return {Promise}
 */
function checkIfOutdated(outputFile, updatedFileContent) {
  return new Promise(function (resolve, reject) {
    fs.readFile(outputFile, 'utf8', (err, data) => {
      if (err)
        return resolve();
      if (data === updatedFileContent)
        return reject();
      else
        return resolve();
    });
  });
}

function composeScriptTag(commentContent, stats, transform) {
  let _pieces = commentContent.split(' ');
  let pieces = [];
  _pieces.map(piece => {
    if (piece.length) pieces.push(piece);
  });

  const identity = pieces[0];
  let filename = pieces[1];
  const assetsByChunkName = stats.assetsByChunkName;

  if (identity !== IDENTITY || !assetsByChunkName.hasOwnProperty(filename))
    return `<!--${commentContent}-->`;

  filename = assetsByChunkName[filename];
  filename = Array.isArray(filename) ? filename[0] : filename;

  return `<script src="${transform ? transform(filename) : filename}"></script>`;

}

module.exports = Plugin;
