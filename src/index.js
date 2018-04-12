require('colors');
var args = require('yargs');
var jsdiff = require('diff');
var fs = require('fs');
var stringify = require('json-stable-stringify');

var file = args.argv.file;
var split = args.argv.split || "to deep equal";
var strategy = args.argv.strategy || "parse";  // or eval

var shouldClean = args.argv.clean || false;
var shouldFormat = args.argv.format || false;
var logging = args.argv.logging || false;

if (!file || !fs.existsSync(file)) {
    throw new Error("cannot find left file " + file);
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

function format(input) {
    if (!shouldFormat) {
        return input;
    }

    log("Format input: " + input);
    log("");

    var obj = strategy === "parse" ? JSON.parse(input) : eval(input);
    return stringify(obj, { space: 4 });
}

var content = fs.readFileSync(file, 'utf8');

var i = content.indexOf(split);

var firstRaw = content.substring(0, i);
var secondRaw = content.substring(i + split.length);

log("first input raw: ");
log(firstRaw);
log("");
log("===========================");
log("");
log("second input raw: ");
log(secondRaw);

var first = format(clean(firstRaw));
var second = format(clean(secondRaw));

var diff = jsdiff.diffLines(first, second);

diff.forEach(function (part) {
    // green for additions, red for deletions
    // grey for common parts
    var color = part.added ? 'green' :
        part.removed ? 'red' : 'grey';
    process.stderr.write(part.value[color]);
});