import { spawnSync } from 'child_process';

const ALL_GOOD: number = 0;
const NO_OPENSSL: number = 1;
const NO_CERTUTIL: number = 2;
const NO_OPENSSL_CERTUTIL: number = 3;


// This script relies on OpenSSL and CertUtil commands
// if these are not present, then it cannot proceed
const MESSAGES: string[] = [
    '',
    `This script relies on openssl command. It appears this command is missing.
     Please install OpenSSL and add to PATH
    `,
    `This script relies on CertUtil.exe command. It appears this command is missing.
     Please install CertUtil.exe and add to PATH
    `,
    `This script relies on OpenSSL and CertUtil.exe commands. It appears these commands are missing.
     Please install them and add to PATH
    `
];

export function commandExists(cmd: string): boolean {
    return spawnSync(`where`, [cmd], {encoding: 'utf8'}).stdout !== '';
}

/*
* This method checks for required dependencies
* openssl and certutil commands
* if not found then exits 
*/
export function terminateOrProceed(): void {
    const proceed: number = (<any>!commandExists('openssl') && NO_OPENSSL) 
            | (<any>!commandExists('certutil') && NO_CERTUTIL);

    proceed && process.on('exit', (code) => {
        console.log(MESSAGES[proceed]);
        });
    proceed && process.exit(0); 
}