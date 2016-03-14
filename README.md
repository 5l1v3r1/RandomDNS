![RandomDNS](https://raw.githubusercontent.com/pwnsdx/RandomDNS/master/screenshot.jpg)

RandomDNS simplify and improve the security of DNSCrypt proxy by randomizing the choice of the server.

##### What is DNSCrypt?

DNSCrypt is a protocol that authenticates communications between a DNS client and a DNS resolver. It prevents DNS spoofing. It uses cryptographic signatures to verify that responses originate from the chosen DNS resolver and haven't been tampered with.

More information at [https://dnscrypt.org/](https://dnscrypt.org/)

#### Features

- Randomize the provider at runtime
- Use (-E)phemeral keys option
- Securely run DNSCrypt proxy by verifying its hash and by copying it in /tmp dir with restricted permissions
- Watch the proxy process and relaunch it if it dies
- Can filter the server list by protocols, country and much more
- Rotate the server with a defined time (default: 10 minutes)

#### How to use it

0) Update Brew
```brew update && brew upgrade```

1) Install DNSCrypt + Node + NPM:
```brew install dnscrypt-proxy node npm```

2) Download and run RandomDNS:
```npm install -g randomdns```

```sudo DEBUG=* randomdns```

3) Set your DNS settings to 127.0.0.1

#### Help

```
      ___               __           ___  _  ______
     / _ \___ ____  ___/ /__  __ _  / _ \/ |/ / __/
    / , _/ _ `/ _ \/ _  / _ \/  ' \/ // /    /\ \  
   /_/|_|\_,_/_//_/\_,_/\___/_/_/_/____/_/|_/___/  
   
   
     Usage: run [options] [file]
   
     Options:
   
   	-h, --help                            output usage information
   	-V, --version                         output the version number
   	-L, --listenOn [string]               Listen on a specific interface/port [default: 127.0.0.1:53]
   	-R, --rotationTime [int]              Define the time to wait before rotating the server (in seconds) [default: 600 seconds]
   	-F, --filters [object]                Use filters [default: IPv6=false;]
   	--filters-help                        Get full list of available filters.
   	-b, --binaryFile [string]             Use custom DNSCrypt binary, will not work until --binaryFileSignature is changed.
   	--binaryFileSignature [string]        SHA512 hash of the DNSCrypt binary.
   	-r, --resolverListFile [string]       Use custom DNSCrypt resolver list file, will not work until --resolverListFileSignature is changed.
   	--resolverListFileSignature [string]  SHA512 hash of the DNSCrypt resolver list file.
```

##### ToDo

- Add health checks support (if the server does not answer anymore, pick another one) (now detecting dead servers)
- Add filters: by country, by port

##### Roadmap

- Have in-memory cache support
- Do a reverse proxy so it can:
	- Spawn multiples DNSCrypt processes and do DNS requests load balancing
	- Scramble monitoring of DNS traffic by sending fake DNS requests randomly
	- Do Consistent Hashing while the program is running (hash DNS requests, save it in memory and when there is a match send it to the same upstream provider) \*\*
- Add support for DNSSEC (?) \*\*

(\*\*) *Thanks [@jedisct1](https://github.com/jedisct1) for the ideas.*