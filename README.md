## RandomDNS

![RandomDNS](https://raw.githubusercontent.com/pwnsdx/RandomDNS/master/screenshot.jpg)

RandomDNS simplify and improve the security of DNSCrypt proxy by randomizing the choice of the server at runtime.

0) Update Brew
```brew update && brew upgrade```

1) Install DNSCrypt + Node:
```brew install dnscrypt-proxy node npm```

2) Download and run RandomDNS:
```git clone https://github.com/pwnsdx/RandomDNS.git && cd RandomDNS && npm update```
```sudo DEBUG=* node ./run.js```

3) Set your DNS settings to 127.0.0.1