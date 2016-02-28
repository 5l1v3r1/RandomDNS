![RandomDNS](https://raw.githubusercontent.com/pwnsdx/RandomDNS/master/screenshot.jpg)

RandomDNS simplify and improve the security of DNSCrypt proxy by randomizing the choice of the server.

#### Features

- Randomize the provider at runtime
- Use (-E)phemeral keys option
- Securely run DNSCrypt proxy by verifying its hash and by copying it in /tmp dir with restricted permissions
- Watch the proxy process and relaunch it if it dies
- Rotate the server with a defined time (default: 10 minutes)

#### How to use it

0) Update Brew
```brew update && brew upgrade```

1) Install DNSCrypt + Node:
```brew install dnscrypt-proxy node npm```

2) Download and run RandomDNS:
```git clone https://github.com/pwnsdx/RandomDNS.git && cd RandomDNS && npm update```

```sudo DEBUG=* node ./run.js```

3) Set your DNS settings to 127.0.0.1

##### ToDo

- Add option to pass arguments (e.g. --filters, --listenOn, --rotateTime, --dnscryptFile, --dnscryptFileSignature)
- Add the possibility to filter servers selection (e.g. only IPv6, only Switzerland, only no-log servers...)

##### Roadmap

- Add health checks (if the server does not answer anymore, pick another one)
- Do a reverse proxy so it can:
	- Spawn multiples DNSCrypt processes and do DNS requests load balancing
	- Have in-memory cache support
	- Do Consistent Hashing while the program is running (hash DNS requests, save it in memory and when there is a match send it to the same upstream provider) (*)
- Add support for DNSSEC (?) (*)

(*) *Thanks @jedisct1 for the ideas.*