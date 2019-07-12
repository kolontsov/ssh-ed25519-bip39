'use strict'; /* jshint node:true,esversion:8 */
const readline = require('readline');

class Readline {
    async readLn(prompt) {
        return new Promise((resolve, reject) => {
	    process.stdout.write(prompt);
	    this._prompt = prompt;
            this._get(resolve);
        });
    }
    async readPass(prompt) {
        this.hidden = true;
        return this.readLn(prompt);
    }
    init() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this._writeToOutput = this.rl._writeToOutput.bind(this.rl);
        this._refreshLine = this.rl._refreshLine.bind(this.rl);
        this.rl._writeToOutput = str => this.hidden ? undefined : this._writeToOutput(str);
        this.rl._refreshLine = () => this.hidden ? undefined : this._refreshLine();
        this.queue = [];
        this.rl.on('line', str => this.queue.push(str));
        this.rl.on('close', () => this.closed = true);
    }
    close() { this.rl.close(); }
    _get(cb) {
        if (this.queue.length || this.closed) {
            process.stdout.write('\n');
            this.hidden = false;
            return void cb(this.queue.shift() || '');
        }
        this.rl.once('line', () => {
            if (this.hidden)
                process.stdout.write('\n');
            this.hidden = false;
            cb(this.queue.shift());
        });
    }
}

module.exports = new Readline();
