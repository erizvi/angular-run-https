import { networkInterfaces } from 'os'

let ifaces = networkInterfaces(),
    ip_address: string;
    
    
for (var dev in ifaces) {
    ifaces[dev].filter((details) => 
        details.family === 'IPv4' && 
        details.internal === true ? ip_address = details.address: undefined
    );
}

export default ip_address;