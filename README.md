![RandomDNS](https://raw.githubusercontent.com/pwnsdx/RandomDNS/master/screenshot.png)

RandomDNS makes DNS secure. It's based on DNSCrypt but we've added a bunch of new cool features.

##### What is DNSCrypt?

DNSCrypt is a protocol that authenticates communications between a DNS client and a DNS resolver. It prevents DNS spoofing. It uses cryptographic signatures to verify that responses originate from the chosen DNS resolver and haven't been tampered with.

More informations at [https://dnscrypt.org/](https://dnscrypt.org/)

#### Features of RandomDNS

- Randomize the provider at runtime
- Use (-E)phemeral keys option
- Watch the proxy process and relaunch it if it dies
- Rotate the server with a defined time (default is 10 minutes) to prevent DNS servers from monitoring your activity
- Can send fake DNS queries to prevent DNS servers from monitoring your activity
- Can run multiple instances of DNSCrypt and load balance the traffic (EdgeDNS)
- Have in-memory caching of DNS requests along with Consistent Hashing (EdgeDNS)
- Can filter the server list by protocols, logging policy and much more
- Securely run DNSCrypt proxy by verifying its hash, copying it in /tmp dir with restricted permissions and launching it as "nobody" user (if reverse proxy is enabled)
- Support DNSSEC (EdgeDNS)

#### How to use it (OS X)

1. Update Brew: ```brew update && brew upgrade```
2. Install EdgeDNS + DNSCrypt + Node + NPM: ```brew install edgedns dnscrypt-proxy node npm```
3. Download and run RandomDNS: ```npm install -g randomdns && sudo DEBUG=* randomdns```
4. Set your DNS settings to 127.0.0.1

#### How to use it (Linux)

1. Update apt: ```sudo apt-get update && apt-get upgrade```
2. Install EdgeDNS + DNSCrypt + Node + NPM: ```sudo apt-get install edgedns dnscrypt-proxy node npm```
3. Download and run RandomDNS (change the signature): ```npm install -g randomdns && sudo DEBUG=* randomdns --binaryDNSCryptFile="[absolute path to the DNSCrypt binary]" --binaryDNSCryptFileSignature="[SHA512 signature of the DNSCrypt binary]"```
4. Set your DNS settings to 127.0.0.1

#### Help

```

   ___               __           ___  _  ______
  / _ \___ ____  ___/ /__  __ _  / _ \/ |/ / __/
 / , _/ _ `/ _ \/ _  / _ \/  ' \/ // /    /\ \  
/_/|_|\_,_/_//_/\_,_/\___/_/_/_/____/_/|_/___/  


Usage: run randomdns [options]

Options:

  -h, --help                              output usage information
  -V, --version                           output the version number
  -L, --listenOn <string>                 Listen on a specific interface/port [default: 127.0.0.1:53]
  -R, --rotationTime <int>                Define the time to wait before rotating the server (in seconds) [default: 600, 0: disabled]
  -P, --reverseProxy <bool>               Enable EdgeDNS reverse proxy [default: false]
  --reverseProxyChildStartPort <int>      Where childrens (dnscrypt-proxy processes) should start incrementing the port? (will work only if reverseProxy is enabled) [default: 51000]
  -T, --threads <int>                     Number of childs to spawn, set to 1 to disable load balacing (will work only if reverseProxy is enabled) [default: 4]
  -S, --scramble <bool>                   Scramble your DNS traffic by resolving fake queries [default: false]
  --scrambleSourceFile <string>           Absolute path to the domain names database (RandomDNS-compatible) [default: download and use latest Alexa Top 1 Million Websites]
  --scrambleTimeBetweenRequestsMin <int>  Minimum time to wait between fake DNS requests (in seconds). [default: 1]
  --scrambleTimeBetweenRequestsMax <int>  Maximum time to wait between fake DNS requests (in seconds). [default: 60]
  -F, --filters <string>                  Use filters [default: IPv6=false;]
  --filters-help                          Get full list of available filters.
  -d, --binaryDNSCryptFile <string>       Use custom DNSCrypt binary, will not work until --binaryDNSCryptFileSignature is changed.
  --binaryDNSCryptFileSignature <string>  SHA512 hash of the DNSCrypt binary.
  -e, --binaryEdgeDNSFile <string>        Use custom EdgeDNS binary, will not work until --binaryEdgeDNSFileSignature is changed.
  --binaryEdgeDNSFileSignature <string>   SHA512 hash of the EdgeDNS binary.
  -r, --resolverListFile <string>         Use custom DNSCrypt resolver list file, will not work until --resolverListFileSignature is changed.
  --resolverListFileSignature <string>    SHA512 hash of the DNSCrypt resolver list file.

```

##### ToDo

- Add filters: by country, by port
