import domain_name from './domainname';
import ip_address from './localhost';
import { HostsFileManager } from './HostsFileManager';
import { CertManager } from './CertManager';
import {terminateOrProceed} from './util';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { spawn } from 'child_process';


terminateOrProceed();
let ng:any;
// attach handlers for cleanup on exit
function exitHandler(options, exitCode) {
    if (options.cleanup) {
        console.log('clean');
        const certManager = CertManager.getInstance();
        let s = certManager.onExit();
        let hosts = HostsFileManager.getInstance();
        let s2 = hosts.onExit();
        ng.kill('SIGINT');

    }
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
}


/*
process.on('beforeExit', () => {
    
})
*/

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

let init = (domain_name) => {
    const hostsEntry = `${ip_address}    ${domain_name}`;
    console.log(hostsEntry);

    
    let hosts = HostsFileManager.getInstance();
    let subscription = hosts.addEntry(hostsEntry).subscribe((data)=>{
        console.log(data);
        subscription.unsubscribe();
        const certManager = CertManager.getInstance();
        certManager.installCertificateForDomain(domain_name).subscribe((installed) => {
            if(installed){
                console.log('cert installed');
                let keyAndCert = certManager.getCertAndKey();
                console.log("KeyAndCert");
                console.log(keyAndCert);
                ng = spawn('ng', [
                    'serve',
                    `--public-host http://${domain_name}`,
                    '--disable-host-check --ssl --ssl-key',
                    `${keyAndCert.key}`,
                    `--ssl-cert`,
                    `${keyAndCert.cert}`,
                    '--port 443'
                ],
                { detached: false, shell: true, stdio: 'inherit'});
                ng.on('close', (code, signal) => {
                console.log(
                    `child process terminated due to receipt of signal ${signal}`);
                });
            }
        })
        /*let inner_subscription = hosts.revert().subscribe((data)=>{
            console.log('After Reverting.....');
            console.log(data);
            inner_subscription.unsubscribe();
        });*/
    });
    
   


};

/*ng.on('close', (code, signal) => {
  console.log(
    `child process terminated due to receipt of signal ${signal}`);
});*/



domain_name.subscribe(init);


