#!/usr/bin/env node

"use strict";

const spawn = require("spawno")
    , oargv = require("oargv")
    , babel = require("babel-core")
    , glob = require("glob")
    , tilda = require("tilda")
    , typpy = require("typpy")
    , queue = require("one-by-one")
    , gitStatus = require("git-status")
    , spawnNpm = require("spawn-npm")
    , logger = require("bug-killer")
    , fs = require("fs")
    , wJson = require("w-json")
    , sameTime = require("same-time")
    , es2015 = require("babel-preset-es2015")
    , bindy = require("bindy")
    ;

new tilda(`${__dirname}/../package.json`, {
    options: [
        {
            name: "path"
          , opts: ["i", "input"]
          , desc: "The input file paths."
          , default: "**/**.js"
          , type: String
        }
      , {
            name: "path"
          , opts: ["I", "ignore"]
          , desc: "The files to ignore."
          , default: "node_modules/**"
        }
      , {
            opts: ["skip-publish"]
          , desc: "If this option is provided, the `npm publish` step will be skipped."
        }
      , {
            opts: ["skip-checkout"]
          , desc: "If this option is provided, the `git checkout` step will be skipped."
        }
    ]
}).main(a => {
    queue([
        gitStatus
      , (next, data) => next(data.length && new Error("Please commit the changes in your git repository first."))
      , next => {
            logger.log("Getting the files to update.");
            glob(a.options.input.value, { ignore: a.options.ignore.value }, next);
        }
      , (next, files) => {
            logger.log("Babelifying the things.");
            sameTime(bindy(files, (cPath, cb) => {
                babel.transformFile(cPath, {
                    presets: [es2015]
                  , babelrc: false
                }, (err, result) => {
                    if (err) { return cb(err); }
                    logger.log(`Babelifying ${cPath}.`);
                    fs.writeFile(cPath, result.code, cb);
                });
            }), next);
        }
      , a.options.skipPublish.is_provided ? null : next => {
            logger.log("Publishing on npm.");
            spawnNpm("publish", {}, { output: true }, next);
        }
      , a.options.skipCheckout.is_provided ? null : next => {
            logger.log("Resetting the changes using git.");
            spawn("git", ["checkout", "."], next);
        }
    ], (err, data) => {
        if (err) {
            return a.exit(err);
        }
        logger.log("Done.");
    });
});
