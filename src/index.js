require('colors');
var args = require('yargs');
var jsdiff = require('diff');
var fs = require('fs');
var stringify = require('json-stable-stringify');

var strategies = [
    {
        splitOn: "to deep equal",
        formatWith: "parse"
    },
    {
        splitOn: "but actual calls were",
        formatWith: "eval"
    }
];

var file = args.argv.file;
var split = args.argv.split || "auto";
var strategy = args.argv.strategy || "auto";

var shouldClean = args.argv.clean || true;
var shouldFormat = args.argv.format || true;
var logging = args.argv.logging || false;

if (!file || !fs.existsSync(file)) {
    throw new Error("cannot find --file " + file);
}

function log(message) {
    if (logging) {
        console.log(message);
    }
}

function clean(input) {
    if (!shouldClean) {
        return input;
    }
    return input
        .replace(/\"\:\"\[/g, "\":[")
        .replace(/\]\"/g, "]")
        .replace(/Object\(\{/g, "{")
        .replace(/\}\)/g, "}");
}

function format(input, createObjectStrategy) {
    if (!shouldFormat) {
        return input;
    }

    log("");
    log("Format input: " + input + " format with " + createObjectStrategy);
    log("");

    const trySequence = [
        createObjectStrategy === "parse" ? tryParse : tryEval,
        createObjectStrategy === "parse" ? tryEval : tryParse
    ];

    // can't figure out how to express this in a clean functional way, this is basically saying find the
    // first matching parsed object
    const obj = trySequence
        .reduce((prev, curr) => prev || curr(input), null);

    if (!obj) {
        throw new Error("cannot parse object! turn on logging to see verbose errors eg. --logging");
    }

    return stringify(obj, { space: 4 });
}

function tryParse(input) {
    log("in tryParse");
    try {
        return JSON.parse(input);
    } catch (error) {
        log(error);
        return null;
    }
}

function tryEval(input) {
    log("in tryEval");
    try {
        return eval(input);
    } catch (error) {
        log(error);
        return null;
    }
}

var content = fs.readFileSync(file, 'utf8');

if (split !== "auto") {
    strategies = [{
        splitOn: split,
        formatWith: strategy
    }, ...strategies];
}

var config = strategies.map(config => ({
    strategy: {
        splitOn: config.splitOn,
        formatWith: strategy === "auto" ?
            config.formatWith :
            strategy
    },
    index: content.indexOf(config.splitOn)
})).find(current => current.index !== -1) || { index: -1, strategy: null };

if (config.index === -1) {
    throw new Error("cannot find split string!");
}

log("using Config: " + stringify(config, { space: 4 }));

var firstRaw = content.substring(0, config.index);
var secondRaw = content.substring(config.index + config.strategy.splitOn.length);

log("first input raw: ");
log(firstRaw);
log("");
log("===========================");
log("");
log("second input raw: ");
log(secondRaw);

var first = format(clean(firstRaw), config.strategy.formatWith);
var second = format(clean(secondRaw), config.strategy.formatWith);

var diff = jsdiff.diffLines(first, second);

diff.forEach(function (part) {
    // green for additions, red for deletions
    // grey for common parts
    var color = part.added ? 'green' :
        part.removed ? 'red' : 'grey';
    process.stderr.write(part.value[color]);
});