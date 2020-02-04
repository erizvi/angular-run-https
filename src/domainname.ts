import * as readline from 'readline';
import { Subject } from 'rxjs';

let domainNameSubject: Subject<string> = new Subject<string>();
let domain_name = domainNameSubject.asObservable();


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Enter the domain name that you would like to mimmic\nFor Example: mysite-test.companydomain.com:\n", function(name) {
    rl.close();
    domainNameSubject.next(name);
});



export default domain_name;