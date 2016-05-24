#!/usr/bin/env node

"use strict";

const spawn = require("spawno")
    , oargv = require("oargv")
    , tilda = require("tilda")
    , typpy = require("typpy")
    , queue = require("one-by-one")
    , gitStatus = require("git-status")
    , spawnNpm = require("spawn-npm")
    , logger = require("bug-killer")
    , fs = require("fs")
    , wJson = require("w-json")
    ;

const BABEL_PATH = require.resolve("babel-cli/bin/babel.js");

new tilda(`${__dirname}/../package.json`, {
    options: [
        {
            name: "path"
          , opts: ["i", "input"]
          , desc: "The input file paths."
          , default: "."
        }
      , {
            name: "path"
          , opts: ["o", "output"]
          , desc: "The output directory."
          , default: "."
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
}).main(a =>{
    if (!typpy(a.options.input.value, Array)) {
        a.options.input.value = [a.options.input.value];
    }

    queue([
        gitStatus
      , (next, data) => next(data.length && new Error("Please commit the changes in your git repository first."))
      , next => {
            logger.log("Creating .babelrc.");
            wJson(".babelrc", { presets: ["es2015"] }, next)
        }
      , next => {
            logger.log("Babelifying the things.");
            spawn(BABEL_PATH, oargv({
                _: a.options.input.value
              , d: a.options.output.value
              , ignore: "node_modules"
            }), { _showOutput: true }, next);
        }
      , next => {
            logger.log("Removing .babelrc.");
            fs.unlink(".babelrc", next)
        }
      , a.options["skip-publish"].is_provided ? null : next => {
            logger.log("Publishing on npm.");
            spawnNpm("publish", {}, { _showOutput: true }, next);
        }
      , a.options["skip-checkout"].is_provided ? null : next => {
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

