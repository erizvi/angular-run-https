import * as fs from 'fs';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { Exitable } from './Exitable';

export class HostsFileManager implements Exitable {
    private static instance: HostsFileManager;
    
    private hostsFile: string = `${process.env.SystemRoot}\\System32\\drivers\\etc\\hosts`;
    private encoding = 'utf8';
    private data: string;
    private originalData: string;
    private initializeSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private fileStatus: Subject<string> = new Subject<string>();

    private constructor(){
        this.read();
    }

    public static getInstance(): HostsFileManager{
        if(!HostsFileManager.instance){
            HostsFileManager.instance = new HostsFileManager();
        }
        
        return HostsFileManager.instance;
    }

    private read(){
        fs.readFile(this.hostsFile, this.encoding, this.handleRead);
    }

    private handleRead = (err:any, data:any) => {
        if(err){
            console.log(`Unable to proceed: ${err}`);
            process.exit(1);
        } else {
            this.data = data;
            this.originalData = data;
            this.initializeSubject.next(true);
        }
    }

    private handleUpdate = (err:any) => {
        if(err){
            console.log(`Unable to update hosts file: ${err}`);
            process.exit(1);
        } else {
            this.fileStatus.next(this.data);
        }
    }

    addEntry(entry: string): Observable<string>{
        this.initializeSubject.asObservable().subscribe((initialized)=>{
            if(initialized){
                entry = '\r\n' + entry;
                this.data += entry;
                fs.appendFile(this.hostsFile, entry, this.encoding, this.handleUpdate);
            }
        });
        return this.fileStatus.asObservable();
    }

    revert(): Observable<boolean>{
        // let subscription = this.initializeSubject.asObservable().subscribe((initialized)=>{
        //     if(initialized){
        //         fs.writeFileSync(this.hostsFile, this.originalData, this.encoding);
        //         subscription.unsubscribe();
        //         this.fileStatus.next(this.originalData);
        //     }
        // });
        // return this.fileStatus.asObservable();
        let status = new BehaviorSubject<boolean>(true);
        fs.writeFileSync(this.hostsFile, this.originalData, this.encoding);
        //subscription.unsubscribe();
        //this.fileStatus.next(this.originalData);
        return status.asObservable();
    }

    onExit(): Observable<boolean> {
        return this.revert();
        let status = new BehaviorSubject<boolean>(false);
        let subscription = this.revert().subscribe((data)=>{
            console.log('After Reverting.....');
            console.log(data);
            subscription.unsubscribe();
            status.next(true);
        });
        return status.asObservable();
    }

}
