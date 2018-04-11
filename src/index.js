require('colors');
var args = require('yargs');
var jsdiff = require('diff');
var fs = require('fs');

var file = args.argv.file;
var split = args.argv.split || "to deep equal";
var shouldClean = args.argv.clean || false;
var shouldFormat = args.argv.format || false;

if (!file || !fs.existsSync(file)) {
    throw new Error("cannot find left file " + file);
}

function clean(input) {
    if (!shouldClean) {
        return input;
    }
    return input.replace(/\"\:\"\[/g, "\":[").replace(/\]\"/g, "]");
}

function format(input) {
    if (!shouldFormat) {
        return input;
    }
    return JSON.stringify(JSON.parse(input), null, 4);
}

var content = fs.readFileSync(file, 'utf8');

var i = content.indexOf(split);
var first = format(clean(content.substring(0, i)));
var second = format(clean(content.substring(i + split.length)));

var diff = jsdiff.diffChars(first, second);

diff.forEach(function (part) {
    // green for additions, red for deletions
    // grey for common parts
    var color = part.added ? 'green' :
        part.removed ? 'red' : 'grey';
    process.stderr.write(part.value[color]);
});