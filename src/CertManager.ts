import * as fs from 'fs';
import { Observable, BehaviorSubject, combineLatest, pipe } from "rxjs";
import { map } from 'rxjs/operators';
import { spawn } from 'child_process';
import { Exitable } from './Exitable';
import * as rimraf from 'rimraf';

// certutil -delstore "Root" cdet.iso.com
//certutil -f -addstore "Root" cdet.crt

export class CertManager implements Exitable {
    private static instance: CertManager;
    
    private folderName: string = '.certs';
    private certCnfFileName: string = `${this.folderName}\\certificate.cnf`;
    private certFileName: string = `${this.folderName}\\localhost.crt`;
    private keyFileName: string = `${this.folderName}\\localhost.key`;
    private certName: string;

    private certConfig: string[] = [
        'ts = 2048',
        'prompt = no',
        'default_md = sha256',
        'x509_extensions = v3_req',
        'distinguished_name = dn',
        '[dn]',
        'C = GB',
        'ST = London',
        'L = London',
        'O = My Organisation',
        'OU = My Organisational Unit',
        'emailAddress = email@domain.com',
        'CN = %id%',
        '[v3_req]',
        'subjectAltName = @alt_names',
        '[alt_names]',
        `DNS.1 = %DomainName%`
    ]

    private folderCreated: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    private constructor(){
        fs.mkdir(this.folderName, this.handleMakeFolder);
    }

    public static getInstance(): CertManager {
        if(!CertManager.instance){
            CertManager.instance = new CertManager();
        }

        return CertManager.instance;
    }

    private genCertId(): string {
        return `temp_ng_cert_${Date.now()}`;
    }

    private handleMakeFolder = (err) =>{
        if(err){
            console.log(`Error creating cert folder: ${err}`);
            process.exit(1);
        } else {
            this.folderCreated.next(true);
        }
    }
    public getCertAndKey():{[key:string]:string}{
        return {
            key: `${__dirname}\\${this.keyFileName}`,
            cert: `${__dirname}\\${this.certFileName}`
        }
    }
    public installCertificateForDomain(domain:string): Observable<boolean>{
        let certInstalledStatus = new BehaviorSubject<boolean>(false);
        this.certName = this.genCertId();

        const content = this.certConfig.join('\n')
        .replace(/\%DomainName\%/g,domain)
        .replace(/\%id\%/g, this.certName);

        let subscriptionA = this.createFile(this.certCnfFileName,
            content).subscribe((created) => {
                if(created){
                    subscriptionA.unsubscribe();
                    let subscriptiontB = this.createCertAndKey().subscribe((created )=> {
                        if(created){
                            subscriptiontB.unsubscribe();
                            let subscriptionC = this.addToStore().subscribe((added) => {
                                if(added){
                                    subscriptionC.unsubscribe();
                                    certInstalledStatus.next(true);
                                }
                            });
                        }
                    });
                }
            });

        return certInstalledStatus.asObservable();
    }

    private createCertAndKey(): Observable<boolean> {
        let status = new BehaviorSubject<boolean>(false);
        const openssl = spawn('openssl', [
            'req',
            '-new -x509 -newkey rsa:2048 -sha256 -nodes -keyout',
            `${this.keyFileName}`,
            '-days 3560 -out',
            `${this.certFileName}`,
            '-config',
            `${this.certCnfFileName}`
        ],{ 
            shell:true,
            stdio: 'inherit'
        });
        openssl.on('close', (code) => {
            if (code !== 0) {
              console.log(`openssl process exited with code ${code}`);
              process.exit(1);
            } else {
                status.next(true);
            }
        });
        return status.asObservable();
    }

    private addToStore(): Observable<boolean> {
        let status = new BehaviorSubject<boolean>(false);
        const certutil = spawn('certutil', [
            '-f',
            '-addstore',
            `"Root"`,
            `${this.certFileName}`
        ],{ 
            shell: true,
            stdio: 'inherit'
        });
        certutil.on('close', (code) => {
            if (code !== 0) {
              console.log(`certutil process exited with code ${code}`);
              process.exit(1);
            } else {
                status.next(true);
            }
        });
        return status.asObservable();
    }

    private removeFromStore(): Observable<boolean> {
        let status = new BehaviorSubject<boolean>(false);
        const certutil = spawn('certutil', [
            '-delstore',
            `"Root"`,
            `${this.certName}`
        ],{ 
            shell: true,
            stdio: 'inherit'
        });
        certutil.on('close', (code) => {
            if (code !== 0) {
              console.log(`certutil process exited with code ${code}`);
              process.exit(1);
            } else {
                status.next(true);
            }
        });
        return status.asObservable();
    }

    private deleteFolder(): Observable<boolean> {
        let status = new BehaviorSubject<boolean>(true);
        rimraf.sync(this.folderName);
        return status.asObservable();
    }

    private createFile(fileName:string, data: string,
        encoding: string = 'utf8'): Observable<boolean> {
        
        let status = new BehaviorSubject<boolean>(false);
        let subscriptionA = this.folderCreated.asObservable().subscribe((created)=>{
            if(created){
                fs.writeFile(fileName, data, encoding, (err) => {
                    if(err){
                        console.log(`Unable to create file: ${err}`);
                        process.exit(1);
                    } else {
                        status.next(true);
                    }
                });
                subscriptionA.unsubscribe();
            }
        });
        return status.asObservable();
    }

    onExit(): Observable<boolean> {
        // perfrom exit tasks
        // remove certs from store
        // delete cert and key files and folder
        let status = new BehaviorSubject<boolean>(false);

        let removed = this.removeFromStore(),
            deleted = this.deleteFolder();

        let subscription = combineLatest([removed, deleted]).pipe(
            map(([removed, deleted]) => ({removed, deleted}))
        )
        .subscribe(pair => {
            console.log(pair);
            if(pair.removed && pair.deleted ) {
                subscription.unsubscribe();
                status.next(true);
            }
        });

        return status.asObservable();
    }
}