# ssh-ed25519-bip39

This command-line tool allows to backup Ed25519 ssh key as 24 english words (using BIP39 specification).

Obvious note: keeping these words in plain sight is insecure, because they are not protected by the password (see TODO).

### Usage

Install the module:

~~~ bash
npm install -g ssh-ed25519-bip39
~~~

Convert key to 24 words:

~~~ bash
$ ssh-ed25519-bip39 key.id_ed25519
~~~

Restore key from 24 words:

~~~ bash
$ ssh-ed25519-bip39 -r key.id_ed25519
~~~

### TODO

Add passphrase protection for BIP39 backup?

### Misc

No guarantees, use at your own risk.

I don't plan to support/improve this code (but will accept PRs).

### License

MIT
