'use strict'; /* jshint node:true, mocha:true, esversion:8 */
const assert = require('assert');
const fs = require('fs');
const sshpk = require('sshpk');
const app = require('../cli.js');
const child_process = require('child_process');
const os = require('os');
const KEY_PATH = `${__dirname}/test.id_ed25519`;
const CLI_PATH = `${__dirname}/../cli.js`;
const LAST_WORD = 'obey';
const PASS = '123';

function readKey(filename, passphrase) {
    let opt = { filename, passphrase };
    return sshpk.parsePrivateKey(fs.readFileSync(filename), 'ssh', opt);
}

describe('basic', function () {
    it('keyToWords', function () {
        const key = readKey(KEY_PATH);
        const words = app.keyToWords(key).split(/ /);
        assert.equal(words.length, 24);
        assert.equal(words[23], LAST_WORD);
    });
    it('wordsToKey', function () {
        const key = readKey(KEY_PATH);
        const key2 = app.wordsToKey(app.keyToWords(key));
        assert.equal(key.fingerprint().toString(), key2.fingerprint().toString());
    });
});

describe('cli', function () {
    function execSync(cmd, input) {
        const execOpt = { timeout: 5 * 1000, input };
        return child_process.execSync(cmd, execOpt).toString();
    }
    function testBackup(filename, passphrase) {
        const input = passphrase ? passphrase + '\n' : '';
        const res = execSync(`${CLI_PATH} ${filename}`, input);
        const words = res.split(os.EOL).find(s => s.startsWith('Words:'))
            .split(' ').slice(1);
        assert.equal(words.length, 24);
        assert.equal(words[23], LAST_WORD);
    }
    function testRestore(filename, passphrase) {
        const key = readKey(filename);
        const words = app.keyToWords(key);
        const input = words + '\n' +
            (passphrase ? `${passphrase}\n${passphrase}\n` : '\n\n') + '\n';
        const filename2 = `${os.tmpdir()}/test-${Math.random()}.id_ed25519`;
        execSync(`${CLI_PATH} -yr ${filename2}`, input);
        const stat = fs.statSync(filename2);
        assert.equal(stat.mode & 0o777, 0o600);
        const key2 = readKey(filename2, passphrase);
        assert.equal(key.fingerprint().toString(), key2.fingerprint().toString());
    }
    function getKey(filename) {
        return sshpk.parsePrivateKey(fs.readFileSync(filename), 'ssh');
    }
    it('backup, without passphrase', ()=>testBackup(KEY_PATH));
    it('backup, with passphrase', ()=>testBackup(`${KEY_PATH}_pass`, PASS));
    it('restore, without passphrase', ()=>testRestore(KEY_PATH));
    it('restore, with passphrase', ()=>testRestore(KEY_PATH, 'testpass'));
});
